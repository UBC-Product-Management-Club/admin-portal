import {
  ChevronRight,
  CircleHelp,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";

import { FormField } from "~/components/form-field";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { StatCard } from "~/components/stat-card";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { isValidDate } from "~/lib/date-parts";
import { formatCurrency, formatShortDate, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import { reimbursementService } from "~/lib/services/reimbursement-service";
import type {
  Reimbursement,
  ReimbursementConfig,
  ReimbursementStatus,
} from "~/lib/types/reimbursement";
import type { Route } from "./+types/reimbursements";

const NO_EVENT = "";
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

export async function clientLoader() {
  return { requests: await reimbursementService.listMyRequests() };
}

export async function loadNewRequestForm() {
  const [events, config] = await Promise.all([
    eventService.listEvents(),
    reimbursementService.getFormConfig(),
  ]);
  return {
    config,
    events: events
      .filter(
        (event) =>
          schoolYearOf(event.startTime) ===
          schoolYearOf(new Date().toISOString()),
      )
      .map(({ eventId, name, startTime }) => ({ eventId, name, startTime }))
      .sort((a, b) => b.startTime.localeCompare(a.startTime)),
  };
}
export function ErrorBoundary() {
  return <RouteError />;
}

export default function Reimbursements({ loaderData }: Route.ComponentProps) {
  const { requests } = loaderData;
  const thisSchoolYear = schoolYearOf(new Date().toISOString());
  const totalFor = (matches: (request: Reimbursement) => boolean) => {
    const matching = requests.filter(matches);
    return {
      amount: formatCurrency(
        matching.reduce((sum, request) => sum + request.amount, 0),
      ),
      caption: `${matching.length} ${matching.length === 1 ? "request" : "requests"}`,
    };
  };
  const pending = totalFor(
    (request) =>
      request.status === "pending" || request.status === "needs_changes",
  );
  const inTransit = totalFor((request) => request.status === "in_transit");
  const complete = totalFor(
    (request) =>
      request.status === "complete" &&
      schoolYearOf(request.createdAt) === thisSchoolYear,
  );
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="Reimbursements"
        description="Submit a reimbursable club expense. Finance verifies the combined receipts and total."
        actions={
          <Button asChild>
            <Link to="/reimbursements/new">+ Create new request</Link>
          </Button>
        }
      />
      <section
        aria-label="Summary"
        className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4"
      >
        <StatCard
          label="Pending review"
          value={pending.amount}
          caption={pending.caption}
        />
        <StatCard
          label="In transit"
          value={inTransit.amount}
          caption={inTransit.caption}
        />
        <StatCard
          label="Completed this year"
          value={complete.amount}
          caption={thisSchoolYear}
        />
      </section>
      <section
        aria-labelledby="my-requests-heading"
        className="card-surface flex w-full flex-col gap-3.5 p-6"
      >
        <h2 id="my-requests-heading" className="text-lg font-semibold">
          My requests
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="flex flex-col">
            {requests.map((request) => {
              const chip = STATUS_CHIPS[request.status];
              return (
                <li key={request.id} className="py-1.5">
                  <Link
                    to={`/reimbursements/${request.id}`}
                    aria-label={`View ${request.item} reimbursement request`}
                    className="group flex items-center gap-4 rounded-xl border border-divider bg-muted/30 px-4 py-3.5 outline-offset-4 transition-colors hover:border-accent/30 hover:bg-muted focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold group-hover:text-accent-foreground">
                        {request.item}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {request.eventName ?? request.department.label} ·
                        Submitted {formatShortDate(request.createdAt)}
                      </span>
                      <span className="mt-1 flex items-center gap-0.5 text-xs font-medium text-accent-foreground">
                        View request <ChevronRight className="size-3.5" />
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {formatCurrency(request.amount)}
                      </span>
                      <span title={request.statusReason ?? undefined}>
                        <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent-foreground"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

type EventOption = { eventId: string; name: string };
export function RequestForm({
  config,
  events,
  onSubmitted,
}: {
  config: ReimbursementConfig;
  events: EventOption[];
  onSubmitted: (request: Reimbursement) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "info";
    text: string;
  } | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0)
      return setMessage({
        tone: "error",
        text: "Amount must be more than $0.",
      });
    if (!isValidDate(String(form.get("purchase_date"))))
      return setMessage({ tone: "error", text: "Enter a real purchase date." });
    if (files.length === 0)
      return setMessage({
        tone: "error",
        text: "Attach at least one receipt or receipt photo.",
      });
    for (const file of files) form.append("attachments", file);
    setIsSaving(true);
    setMessage(null);
    try {
      onSubmitted(await reimbursementService.submitRequest(form));
      formRef.current?.reset();
      setFiles([]);
      setMessage({
        tone: "info",
        text: "Request submitted. Finance will review the receipt total.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Couldn't submit your request. Check the fields and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-labelledby="new-request-heading"
      className="card-surface flex w-full flex-col gap-4 p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="new-request-heading" className="text-lg font-semibold">
          New request
        </h2>
        {config.instruction && (
          <details className="relative text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-accent-foreground">
              <CircleHelp className="size-4" /> Instructions for Submitting
              Receipts
            </summary>
            <p className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-divider bg-background p-3 text-xs leading-relaxed text-muted-foreground shadow-lg">
              {config.instruction.content}
            </p>
          </details>
        )}
      </div>
      <FormField label="What did you buy?" htmlFor={`${id}-item`}>
        <Input
          id={`${id}-item`}
          name="item"
          required
          placeholder="e.g. Pizza for Product Teardown Workshop"
        />
      </FormField>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <FormField label="Amount (CAD)" htmlFor={`${id}-amount`}>
          <Input
            id={`${id}-amount`}
            name="amount"
            type="number"
            min={0.01}
            step={0.01}
            required
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Date of purchase" htmlFor={`${id}-purchase-date`}>
          <Input
            id={`${id}-purchase-date`}
            name="purchase_date"
            type="date"
            required
          />
        </FormField>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <FormField label="Department" htmlFor={`${id}-department`}>
          <select
            id={`${id}-department`}
            name="department_id"
            required
            defaultValue=""
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select department
            </option>
            {config.departments.map((department) => (
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
            required
            defaultValue=""
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select category
            </option>
            {config.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label} · {category.gl_code}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <FormField label="Related event (optional)" htmlFor={`${id}-event`}>
          <select
            id={`${id}-event`}
            name="event_id"
            defaultValue={NO_EVENT}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={NO_EVENT}>No related event</option>
            {events.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Vendor (optional)" htmlFor={`${id}-vendor`}>
          <Input
            id={`${id}-vendor`}
            name="vendor"
            placeholder="Store or supplier"
          />
        </FormField>
      </div>
      <FormField
        label="Vendor reference (optional)"
        htmlFor={`${id}-reference`}
      >
        <Input
          id={`${id}-reference`}
          name="vendor_reference"
          placeholder="Order, invoice, or transaction reference"
        />
      </FormField>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${id}-receipt`}
          className="text-[13px] font-medium text-neutral-foreground"
        >
          Receipts and photos
        </label>
        <div className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-dropzone-border bg-dropzone p-5 text-center text-sm font-semibold text-accent-foreground">
          <Upload aria-hidden="true" className="size-5" />
          <span>Upload one or more receipt photos or PDFs</span>
          <input
            ref={fileInputRef}
            id={`${id}-receipt`}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="sr-only"
            onChange={(event) => {
              const selectedFiles = Array.from(event.currentTarget.files ?? []);
              setFiles((current) => [...current, ...selectedFiles]);
              // Let someone remove a file and select that same file again.
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Add files
          </Button>
        </div>
        {files.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Selected uploads">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-divider bg-background px-3 py-2 text-left text-sm"
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <FormField label="E-transfer email" htmlFor={`${id}-etransfer-email`}>
          <Input
            id={`${id}-etransfer-email`}
            name="etransfer_email"
            type="email"
            required
            placeholder="Where Finance sends payment"
          />
        </FormField>
        <FormField
          label="Full name under e-transfer"
          htmlFor={`${id}-etransfer-name`}
        >
          <Input
            id={`${id}-etransfer-name`}
            name="etransfer_full_name"
            required
            placeholder="Name shown to Finance"
          />
        </FormField>
      </div>
      <FormField label="Notes (optional)" htmlFor={`${id}-notes`}>
        <Textarea
          id={`${id}-notes`}
          name="notes"
          className="min-h-20"
          placeholder="Anything Finance should know"
        />
      </FormField>
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="self-end" disabled={isSaving}>
        {isSaving && <Loader2 aria-hidden="true" className="animate-spin" />}
        {isSaving ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
