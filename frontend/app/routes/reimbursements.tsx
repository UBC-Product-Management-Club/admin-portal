import { Loader2, Upload } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { FormField } from "~/components/form-field";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { StatCard } from "~/components/stat-card";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { isValidDate } from "~/lib/date-parts";
import { formatCurrency, formatShortDate, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import { reimbursementService } from "~/lib/services/reimbursement-service";
import {
  REIMBURSEMENT_CATEGORIES,
  REIMBURSEMENT_CATEGORY_LABELS,
  type Reimbursement,
  type ReimbursementCategory,
  type ReimbursementStatus,
} from "~/lib/types/reimbursement";
import type { Route } from "./+types/reimbursements";

const NO_EVENT = "none";

const STATUS_CHIPS: Record<
  ReimbursementStatus,
  { label: string; tone: ChipTone }
> = {
  submitted: { label: "Submitted", tone: "warning" },
  approved: { label: "Approved", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export async function clientLoader() {
  const [requests, events] = await Promise.all([
    reimbursementService.listMyRequests(),
    eventService.listEvents(),
  ]);
  return {
    requests,
    events: events
      .map(({ eventId, name, startTime }) => ({ eventId, name, startTime }))
      .sort((a, b) => b.startTime.localeCompare(a.startTime)),
  };
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function Reimbursements({ loaderData }: Route.ComponentProps) {
  const [requests, setRequests] = useState(loaderData.requests);
  const thisSchoolYear = schoolYearOf(new Date().toISOString());

  const totalFor = (matches: (r: Reimbursement) => boolean) => {
    const matching = requests.filter(matches);
    return {
      amount: formatCurrency(matching.reduce((sum, r) => sum + r.amount, 0)),
      caption: `${matching.length} ${matching.length === 1 ? "request" : "requests"}`,
    };
  };
  const waiting = totalFor((r) => r.status === "submitted");
  const approved = totalFor((r) => r.status === "approved");
  const paid = totalFor(
    (r) => r.status === "paid" && schoolYearOf(r.createdAt) === thisSchoolYear,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="Reimbursements"
        description="Spent your own money on the club? Request it back. The treasurer reviews every request."
      />

      <section
        aria-label="Summary"
        className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4"
      >
        <StatCard
          label="Waiting for approval"
          value={waiting.amount}
          caption={waiting.caption}
        />
        <StatCard
          label="Approved, not paid yet"
          value={approved.amount}
          caption={approved.caption}
        />
        <StatCard
          label="Paid out this year"
          value={paid.amount}
          caption={thisSchoolYear}
        />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <NewRequestForm
          events={loaderData.events}
          onSubmitted={(request) =>
            setRequests((current) => [request, ...current])
          }
        />

        <section
          aria-labelledby="my-requests-heading"
          className="card-surface flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 p-6"
        >
          <h2 id="my-requests-heading" className="text-lg font-semibold">
            My requests
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Submitted → Approved → Paid
          </p>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="flex flex-col">
              {requests.map((request) => {
                const chip = STATUS_CHIPS[request.status];
                return (
                  <li
                    key={request.id}
                    className="flex items-center gap-3 border-t border-divider py-3"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">
                        {request.item}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {request.eventName ?? "No event"} · Submitted{" "}
                        {formatShortDate(request.createdAt)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {formatCurrency(request.amount)}
                      </span>
                      <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

type EventOption = { eventId: string; name: string };

function NewRequestForm({
  events,
  onSubmitted,
}: {
  events: EventOption[];
  onSubmitted: (request: Reimbursement) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [eventId, setEventId] = useState(NO_EVENT);
  const [category, setCategory] = useState<ReimbursementCategory>("food");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "info";
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ tone: "error", text: "Amount must be more than $0." });
      return;
    }
    if (!isValidDate(String(form.get("purchase_date")))) {
      setMessage({ tone: "error", text: "Enter a real purchase date." });
      return;
    }
    form.set("category", category);
    if (eventId !== NO_EVENT) form.set("event_id", eventId);

    setIsSaving(true);
    setMessage(null);
    try {
      onSubmitted(await reimbursementService.submitRequest(form));
      formRef.current?.reset();
      setEventId(NO_EVENT);
      setCategory("food");
      setMessage({
        tone: "info",
        text: "Request submitted. The treasurer will review it.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Couldn't submit your request. Try again.",
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
      className="card-surface flex min-w-0 flex-[1.2_1_420px] flex-col gap-4 p-6"
    >
      <h2 id="new-request-heading" className="text-lg font-semibold">
        New request
      </h2>
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
        <FormField label="Related event" htmlFor={`${id}-event`}>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger id={`${id}-event`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_EVENT}>None</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.eventId} value={event.eventId}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Category" htmlFor={`${id}-category`}>
          <Select
            value={category}
            onValueChange={(value) =>
              setCategory(value as ReimbursementCategory)
            }
          >
            <SelectTrigger id={`${id}-category`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REIMBURSEMENT_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REIMBURSEMENT_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${id}-receipt`}
          className="text-[13px] font-medium text-neutral-foreground"
        >
          Receipt
        </label>
        <div className="flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-dropzone-border bg-dropzone p-5 text-center text-sm font-semibold text-accent-foreground">
          <Upload aria-hidden="true" className="size-5" />
          Upload a photo or PDF of the receipt
          <input
            id={`${id}-receipt`}
            name="receipt"
            type="file"
            accept="image/*,.pdf"
            required
            className="max-w-full text-[13px] font-normal text-neutral-foreground file:mr-3 file:h-9 file:rounded-[10px] file:border file:border-input file:bg-background file:px-3 file:text-[13px] file:font-semibold file:text-foreground"
          />
        </div>
      </div>
      <FormField label="E-transfer email" htmlFor={`${id}-etransfer-email`}>
        <Input
          id={`${id}-etransfer-email`}
          name="etransfer_email"
          type="email"
          required
          placeholder="Where the treasurer should send the money"
        />
      </FormField>
      <FormField label="Notes (optional)" htmlFor={`${id}-notes`}>
        <Textarea
          id={`${id}-notes`}
          name="notes"
          className="min-h-20"
          placeholder="Anything the treasurer should know"
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
