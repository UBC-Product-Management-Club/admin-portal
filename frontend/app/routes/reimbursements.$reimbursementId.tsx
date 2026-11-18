import {
  ArrowLeft,
  CircleHelp,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";

import { FormField } from "~/components/form-field";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { formatCurrency, formatShortDate, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import { reimbursementService } from "~/lib/services/reimbursement-service";
import type { ReimbursementStatus } from "~/lib/types/reimbursement";
import type { Route } from "./+types/reimbursements.$reimbursementId";

const STATUS_CHIPS: Record<
  ReimbursementStatus,
  { label: string; tone: ChipTone }
> = {
  pending: { label: "Pending", tone: "warning" },
  in_transit: { label: "In Transit", tone: "accent" },
  complete: { label: "Complete", tone: "success" },
  needs_changes: { label: "Needs Changes", tone: "warning" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const reimbursementId = params.reimbursementId;
  if (!reimbursementId) throw new Response("Not found", { status: 404 });
  const [request, config, events] = await Promise.all([
    reimbursementService.getRequest(reimbursementId),
    reimbursementService.getFormConfig(),
    eventService.listEvents(),
  ]);
  return {
    request,
    config,
    // Keep an older linked event visible so an existing reimbursement is never
    // silently changed when the selectable list advances to a new school year.
    events: events
      .filter(
        (event) =>
          event.eventId === request.eventId ||
          schoolYearOf(event.startTime) ===
          schoolYearOf(new Date().toISOString()),
      )
      .map(({ eventId, name }) => ({ eventId, name })),
  };
}
export function ErrorBoundary() {
  return <RouteError />;
}

export default function ReimbursementDetail({
  loaderData,
}: Route.ComponentProps) {
  const id = useId();
  const [request, setRequest] = useState(loaderData.request);
  const [removed, setRemoved] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable =
    request.status === "pending" || request.status === "needs_changes";
  const chip = STATUS_CHIPS[request.status];
  const activeAttachments = request.attachments.filter(
    (attachment) => !removed.includes(attachment.id),
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (activeAttachments.length + files.length < 1)
      return setMessage("Keep or add at least one receipt.");
    for (const file of files) form.append("attachments", file);
    for (const attachmentId of removed)
      form.append("remove_attachment_ids", attachmentId);
    setSaving(true);
    setMessage(null);
    try {
      const updated = await reimbursementService.updateRequest(
        request.id,
        form,
      );
      setRequest(updated);
      setFiles([]);
      setRemoved([]);
      setMessage(
        updated.status === "pending" && request.status === "needs_changes"
          ? "Changes submitted. The request is Pending review again."
          : "Request updated.",
      );
    } catch {
      setMessage("Couldn't save changes. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
      <Link
        to="/reimbursements"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All requests
      </Link>
      <PageHeader
        title={request.item}
        description={`${formatCurrency(request.amount)} · submitted ${formatShortDate(request.createdAt)}`}
        actions={
          <span title={request.statusReason ?? undefined}>
            <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
          </span>
        }
      />
      {request.statusReason && (
        <Alert
          variant={request.status === "rejected" ? "destructive" : "default"}
        >
          <AlertDescription>
            <strong>{chip.label}:</strong> {request.statusReason}
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={save} className="card-surface flex flex-col gap-5 p-6">
        {loaderData.config.instruction && (
          <details className="rounded-lg border border-divider bg-muted/30 p-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-accent-foreground">
              <CircleHelp className="size-4" /> Instructions for Submitting Receipts
            </summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {loaderData.config.instruction.content}
            </p>
          </details>
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <FormField label="What did you buy?" htmlFor={`${id}-item`}>
            <Input
              id={`${id}-item`}
              name="item"
              defaultValue={request.item}
              required
              disabled={!editable}
            />
          </FormField>
          <FormField label="Amount (CAD)" htmlFor={`${id}-amount`}>
            <Input
              id={`${id}-amount`}
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              defaultValue={request.amount}
              required
              disabled={!editable}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <FormField label="Date of purchase" htmlFor={`${id}-date`}>
            <Input
              id={`${id}-date`}
              name="purchase_date"
              type="date"
              defaultValue={request.purchaseDate ?? ""}
              required
              disabled={!editable}
            />
          </FormField>
          <FormField label="Related event" htmlFor={`${id}-event`}>
            <select
              id={`${id}-event`}
              name="event_id"
              defaultValue={request.eventId ?? ""}
              disabled={!editable}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="">No related event</option>
              {loaderData.events.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <FormField label="Department" htmlFor={`${id}-department`}>
            <select
              id={`${id}-department`}
              name="department_id"
              defaultValue={request.department.id}
              required
              disabled={!editable}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              {loaderData.config.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Expense category" htmlFor={`${id}-category`}>
            <select
              id={`${id}-category`}
              name="category_id"
              defaultValue={request.category.id}
              required
              disabled={!editable}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              {loaderData.config.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label} · {category.gl_code}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <FormField label="Vendor" htmlFor={`${id}-vendor`}>
            <Input
              id={`${id}-vendor`}
              name="vendor"
              defaultValue={request.vendor ?? ""}
              disabled={!editable}
            />
          </FormField>
          <FormField label="Vendor reference" htmlFor={`${id}-reference`}>
            <Input
              id={`${id}-reference`}
              name="vendor_reference"
              defaultValue={request.vendorReference ?? ""}
              disabled={!editable}
            />
          </FormField>
        </div>
        <section
          className="flex flex-col gap-2"
          aria-labelledby="receipts-heading"
        >
          <h2 id="receipts-heading" className="text-sm font-medium">
            Receipts and photos
          </h2>
          {activeAttachments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active receipts. Add one before saving.
            </p>
          )}
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
            {activeAttachments.map((attachment) => (
              <li
                key={attachment.id}
                className="rounded-lg border border-divider p-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    attachment.url && setPreviewUrl(attachment.url)
                  }
                  className="flex w-full items-center gap-2 text-left text-sm font-medium hover:text-accent-foreground"
                  disabled={!attachment.url}
                >
                  <FileText className="size-4" />{" "}
                  <span className="min-w-0 truncate">
                    {attachment.originalFilename}
                  </span>
                </button>
                {editable && (
                  <button
                    type="button"
                    onClick={() =>
                      setRemoved((current) => [...current, attachment.id])
                    }
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <div className="rounded-xl border-[1.5px] border-dashed border-dropzone-border bg-dropzone p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                <Upload className="size-4" /> Add receipt photos or PDFs
              </div>
              <input
                ref={fileInputRef}
                id={`${id}-attachments`}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                onChange={(event) => {
                  const selectedFiles = Array.from(
                    event.currentTarget.files ?? [],
                  );
                  setFiles((current) => [...current, ...selectedFiles]);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                Add files
              </Button>
              {files.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2" aria-label="New uploads">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-divider bg-background px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((current) =>
                            current.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          )
                        }
                        className="flex shrink-0 items-center gap-1 text-xs font-medium text-destructive hover:underline"
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <FormField label="E-transfer email" htmlFor={`${id}-email`}>
            <Input
              id={`${id}-email`}
              name="etransfer_email"
              type="email"
              defaultValue={request.etransferEmail}
              required
              disabled={!editable}
            />
          </FormField>
          <FormField label="Full name under e-transfer" htmlFor={`${id}-name`}>
            <Input
              id={`${id}-name`}
              name="etransfer_full_name"
              defaultValue={request.etransferFullName ?? ""}
              required
              disabled={!editable}
            />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor={`${id}-notes`}>
          <Textarea
            id={`${id}-notes`}
            name="notes"
            defaultValue={request.notes ?? ""}
            disabled={!editable}
          />
        </FormField>
        {message && (
          <Alert
            variant={
              message.startsWith("Couldn't") || message.startsWith("Keep")
                ? "destructive"
                : "default"
            }
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {editable ? (
          <Button type="submit" className="self-end" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {request.status === "needs_changes"
              ? "Submit changes"
              : "Save changes"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            This request can no longer be edited.
          </p>
        )}
      </form>
      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Receipt preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="flex h-full w-full max-w-5xl flex-col rounded-xl bg-background p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewUrl(null)}
              >
                Close
              </Button>
            </div>
            <iframe
              title="Receipt preview"
              src={previewUrl}
              className="min-h-0 flex-1 rounded border border-divider"
            />
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1 text-sm font-medium text-accent-foreground"
            >
              Open separately <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
