import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Fragment, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

import { DateTimeField } from "~/components/date-time-field";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { SearchField } from "~/components/search-field";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ApiError } from "~/lib/api/rest-client";
import {
  fromDateTimeParts,
  toDateTimeParts,
  type DateTimeParts,
} from "~/lib/date-parts";
import { formatDate, formatMonthYear, formatVancouverTime } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import type {
  Applicant,
  ApplicantDecision,
  ApplicantStatus,
} from "~/lib/types/applicant";

import type { Route } from "./+types/applicants";

const ALL_STATUSES = "all";

const STATUS_CHIPS: Record<ApplicantStatus, { label: string; tone: ChipTone }> =
  {
    APPLIED: { label: "Applied", tone: "warning" },
    ACCEPTED: { label: "Accepted", tone: "success" },
    REGISTERED: { label: "Registered", tone: "accent" },
    REJECTED: { label: "Rejected", tone: "neutral" },
  };

const COLUMN_COUNT = 5;

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const events = await eventService.listReviewEvents();
  const requestedId = new URL(request.url).searchParams.get("event");
  // The API lists the most recently opened event first.
  const selected = events.find((e) => e.eventId === requestedId) ?? events[0];
  return {
    events,
    list: selected ? await eventService.listApplicants(selected.eventId) : null,
  };
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function Applicants({ loaderData }: Route.ComponentProps) {
  const { events, list } = loaderData;
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="Applicants"
        description="Read each application, then accept or reject it."
        actions={
          list && (
            <Select
              value={list.eventId}
              onValueChange={(event) => setSearchParams({ event })}
            >
              <SelectTrigger aria-label="Event">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.eventId} value={event.eventId}>
                    {event.registrationOpens
                      ? `${event.name} · ${formatMonthYear(event.registrationOpens)}`
                      : event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />
      {list ? (
        // Re-key per event so rows and filters never carry between events.
        <ApplicantTable
          key={list.eventId}
          eventId={list.eventId}
          initialApplicants={list.applicants}
        />
      ) : (
        <p className="text-muted-foreground">
          No events are taking applications.
        </p>
      )}
    </div>
  );
}

function ApplicantTable({
  eventId,
  initialApplicants,
}: {
  eventId: string;
  initialApplicants: Applicant[];
}) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL_STATUSES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needle = search.trim().toLowerCase();
  const visible = applicants
    .filter((a) => status === ALL_STATUSES || a.status === status)
    .filter((a) =>
      [a.name, a.email].some((value) => value.toLowerCase().includes(needle)),
    );
  const waitingCount = applicants.filter((a) => a.status === "APPLIED").length;

  function replaceApplicant(updated: Applicant) {
    setApplicants((current) =>
      current.map((a) => (a.attendeeId === updated.attendeeId ? updated : a)),
    );
  }

  async function decide(applicant: Applicant, decision: ApplicantDecision) {
    const verb = decision === "ACCEPTED" ? "Accept" : "Reject";
    if (
      !window.confirm(`${verb} ${applicant.name}? This can't be undone here.`)
    )
      return;

    setSavingId(applicant.attendeeId);
    setError(null);
    try {
      const updated = await eventService.decideApplicant(
        eventId,
        applicant.attendeeId,
        decision,
      );
      replaceApplicant(updated);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : `Couldn't save the decision for ${applicant.name}.`,
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchField
          label="Search applicants"
          placeholder="Search by name or email"
          value={search}
          onChange={setSearch}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {Object.entries(STATUS_CHIPS).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[13px] text-muted-foreground">
          {waitingCount} of {applicants.length} waiting for review
        </span>
      </div>

      <div className="card-surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {["Name", "Email", "Applied", "Status", "Decision"].map(
                (heading) => (
                  <TableHead
                    key={heading}
                    className="px-4 text-xs font-semibold text-muted-foreground"
                  >
                    {heading}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {applicants.length === 0
                    ? "No applications yet."
                    : "No applicants match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((applicant) => {
                const isExpanded = expandedId === applicant.attendeeId;
                const chip = STATUS_CHIPS[applicant.status];
                const Chevron = isExpanded ? ChevronDown : ChevronRight;
                return (
                  <Fragment key={applicant.attendeeId}>
                    <TableRow>
                      <TableCell className="px-4 py-3">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`Show application: ${applicant.name}`}
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : applicant.attendeeId,
                            )
                          }
                          className="flex items-center gap-1.5 font-medium hover:text-primary"
                        >
                          <Chevron aria-hidden="true" className="size-4" />
                          {applicant.name}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {applicant.email}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {formatDate(applicant.appliedAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {applicant.status === "APPLIED" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={savingId !== null}
                              onClick={() => decide(applicant, "ACCEPTED")}
                              aria-label={`Accept ${applicant.name}`}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingId !== null}
                              onClick={() => decide(applicant, "REJECTED")}
                              aria-label={`Reject ${applicant.name}`}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[13px] text-muted-foreground">
                              {applicant.reviewedBy
                                ? `By ${applicant.reviewedBy}`
                                : "Reviewed"}
                            </span>
                            {applicant.status === "ACCEPTED" && (
                              <PaymentDue
                                applicant={applicant}
                                onChange={() =>
                                  setEditingDueId(applicant.attendeeId)
                                }
                              />
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {editingDueId === applicant.attendeeId && (
                      <TableRow>
                        <TableCell
                          colSpan={COLUMN_COUNT}
                          className="bg-sidebar px-4 py-4 whitespace-normal"
                        >
                          <PaymentDueForm
                            eventId={eventId}
                            applicant={applicant}
                            onCancel={() => setEditingDueId(null)}
                            onSaved={(updated) => {
                              replaceApplicant(updated);
                              setEditingDueId(null);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    {isExpanded && (
                      <TableRow>
                        <TableCell
                          colSpan={COLUMN_COUNT}
                          className="bg-sidebar px-4 py-4 whitespace-normal"
                        >
                          <ApplicationAnswers applicant={applicant} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function PaymentDue({
  applicant,
  onChange,
}: {
  applicant: Applicant;
  onChange: () => void;
}) {
  const { paymentDueAt } = applicant;
  const isOverdue =
    paymentDueAt !== null && new Date(paymentDueAt) < new Date();
  return (
    <>
      {paymentDueAt && (
        <span className="text-[13px]">
          Pay by {formatVancouverTime(paymentDueAt)}
          {isOverdue && (
            <span className="ml-1.5">
              <StatusChip tone="warning">Overdue</StatusChip>
            </span>
          )}
        </span>
      )}
      <button
        type="button"
        onClick={onChange}
        aria-label={`Change payment deadline: ${applicant.name}`}
        className="text-[13px] font-medium text-primary hover:underline"
      >
        Change deadline
      </button>
    </>
  );
}

function PaymentDueForm({
  eventId,
  applicant,
  onCancel,
  onSaved,
}: {
  eventId: string;
  applicant: Applicant;
  onCancel: () => void;
  onSaved: (updated: Applicant) => void;
}) {
  const [parts, setParts] = useState<DateTimeParts>(
    toDateTimeParts(applicant.paymentDueAt),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dueAt = fromDateTimeParts(parts);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dueAt) {
      setError("Enter a real date and time.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      onSaved(
        await eventService.setPaymentDue(eventId, applicant.attendeeId, dueAt),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save the deadline.",
      );
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-[420px] flex-col gap-3"
      aria-label={`Payment deadline for ${applicant.name}`}
    >
      <DateTimeField
        legend="New payment deadline"
        required
        value={parts}
        onChange={setParts}
      />
      {dueAt && (
        <p className="text-[13px] text-muted-foreground">
          In Vancouver: {formatVancouverTime(dueAt)}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save deadline"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ApplicationAnswers({ applicant }: { applicant: Applicant }) {
  return (
    <dl className="flex max-w-[760px] flex-col gap-4">
      {applicant.answers.map((answer) => (
        <div key={answer.id} className="flex flex-col gap-1">
          <dt className="text-[13px] font-semibold">{answer.label}</dt>
          <dd className="text-sm whitespace-pre-wrap text-muted-foreground">
            {!answer.value ? (
              "No answer"
            ) : answer.type === "file" ? (
              <a
                href={answer.value}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open file
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : (
              answer.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
