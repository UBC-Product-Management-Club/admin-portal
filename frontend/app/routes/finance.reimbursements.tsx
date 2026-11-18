import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { useMemo, useState } from "react";

import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { Button } from "~/components/ui/button";
import { formatCurrency, formatShortDate } from "~/lib/format";
import { financeReimbursementService } from "~/lib/services/finance-reimbursement-service";
import type {
  Reimbursement,
  ReimbursementStatus,
} from "~/lib/types/reimbursement";
import type { Route } from "./+types/finance.reimbursements";

const STATUS: Record<ReimbursementStatus, { label: string; tone: ChipTone }> = {
  pending: { label: "Pending", tone: "warning" },
  in_transit: { label: "In transit", tone: "accent" },
  complete: { label: "Complete", tone: "success" },
  needs_changes: { label: "Needs changes", tone: "warning" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export async function clientLoader() {
  return { tickets: await financeReimbursementService.listTickets() };
}
export function ErrorBoundary() {
  return <RouteError />;
}

export default function FinanceReimbursements({
  loaderData,
}: Route.ComponentProps) {
  const [department, setDepartment] = useState("");
  const [event, setEvent] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"submitted" | "department" | "event">(
    "submitted",
  );
  const departments = unique(
    loaderData.tickets.map((ticket) => ticket.department.label),
  );
  const events = unique(
    loaderData.tickets.map((ticket) => ticket.eventName).filter(Boolean),
  );
  const tickets = useMemo(
    () =>
      [...loaderData.tickets]
        .filter(
          (ticket) => !department || ticket.department.label === department,
        )
        .filter((ticket) => !event || ticket.eventName === event)
        .filter((ticket) => !status || ticket.status === status)
        .sort((a, b) => {
          if (sort === "department")
            return a.department.label.localeCompare(b.department.label);
          if (sort === "event")
            return (a.eventName ?? "").localeCompare(b.eventName ?? "");
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [department, event, loaderData.tickets, sort, status],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="Finance Dashboard"
        description="Review receipts, track payment progress, and update reimbursement tickets."
        actions={
          <Button asChild variant="outline">
            <Link to="/finance/settings">Manage settings</Link>
          </Button>
        }
      />
      <section
        className="card-surface flex flex-wrap gap-3 p-4"
        aria-label="Ticket filters"
      >
        <Filter
          label="Department"
          value={department}
          onChange={setDepartment}
          options={departments}
        />
        <Filter
          label="Event"
          value={event}
          onChange={setEvent}
          options={events}
        />
        <Filter
          label="Status"
          value={status}
          onChange={setStatus}
          options={Object.entries(STATUS).map(([value, item]) => ({
            value,
            label: item.label,
          }))}
        />
        <Filter
          label="Sort by"
          value={sort}
          onChange={(value) => setSort(value as typeof sort)}
          options={[
            { value: "submitted", label: "Submitted" },
            { value: "department", label: "Department" },
            { value: "event", label: "Event" },
          ]}
        />
      </section>
      <section
        className="card-surface overflow-x-auto"
        aria-labelledby="finance-tickets-heading"
      >
        <div className="flex items-center justify-between gap-3 border-b border-divider px-6 py-4">
          <h2 id="finance-tickets-heading" className="text-lg font-semibold">
            All tickets
          </h2>
          <span className="text-sm text-muted-foreground">
            {tickets.length} shown
          </span>
        </div>
        {tickets.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No reimbursement tickets match these filters.
          </p>
        ) : (
          <div className="min-w-[780px] space-y-2 px-2 pb-2">
            <div className="grid grid-cols-[minmax(190px,1.5fr)_130px_150px_150px_120px] gap-4 px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <span>Expense</span>
              <span>Amount</span>
              <span>Department</span>
              <span>Event</span>
              <span>Status</span>
            </div>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Reimbursement }) {
  const chip = STATUS[ticket.status];
  return (
    <Link
      to={`/finance/reimbursements/${ticket.id}`}
      aria-label={`View ${ticket.item} finance ticket`}
      className="group grid min-w-[780px] grid-cols-[minmax(190px,1.5fr)_130px_150px_150px_120px] gap-4 rounded-xl border border-divider bg-muted/30 px-4 py-3.5 text-sm transition-colors hover:border-accent/30 hover:bg-muted focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="flex min-w-0 flex-col">
        <strong className="truncate group-hover:text-accent-foreground">
          {ticket.item}
        </strong>
        <small className="flex items-center gap-0.5 text-muted-foreground">
          {formatShortDate(ticket.createdAt)} · {ticket.attachments.length}{" "}
          receipt{ticket.attachments.length === 1 ? "" : "s"}
          <span className="ml-1 font-medium text-accent-foreground">
            View ticket
          </span>
          <ChevronRight className="size-3.5 text-accent-foreground" />
        </small>
      </span>
      <span className="font-medium">{formatCurrency(ticket.amount)}</span>
      <span>{ticket.department.label}</span>
      <span className="truncate">{ticket.eventName ?? "—"}</span>
      <span title={ticket.statusReason ?? undefined}>
        <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
      </span>
    </Link>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        <option value="">All</option>
        {options.map((option) => {
          const entry =
            typeof option === "string"
              ? { value: option, label: option }
              : option;
          return (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
function unique(values: Array<string | null>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort();
}
