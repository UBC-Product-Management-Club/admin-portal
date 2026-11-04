import { CalendarPlus, ChevronRight, Receipt } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DateBadge } from "~/components/date-badge";
import { RouteError } from "~/components/route-error";
import { StatCard } from "~/components/stat-card";
import { useUserData } from "~/hooks/use-user-data";
import { formatDate, formatRelativeDays, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import { reimbursementService } from "~/lib/services/reimbursement-service";
import { userService } from "~/lib/services/user-service";
import { STUDY_YEARS, UNIVERSITIES } from "~/lib/types/user";
import type { Route } from "./+types/dashboard";

const UNIVERSITY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];
const UPCOMING_LIMIT = 4;

export async function clientLoader() {
  const [members, events, reimbursements] = await Promise.all([
    userService.listUsers(),
    eventService.listEvents(),
    reimbursementService.listMyRequests(),
  ]);

  const now = new Date();
  const thisSchoolYear = schoolYearOf(now.toISOString());
  const upcoming = events
    .filter((event) => new Date(event.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const membersByYear = [...STUDY_YEARS, null].map((year) => ({
    label: year ? `Year ${year}` : "Not set",
    count: members.filter((member) => member.year === year).length,
  }));
  const membersByUniversity = UNIVERSITIES.map((university, i) => ({
    university,
    count: members.filter((member) => member.university === university).length,
    color: UNIVERSITY_COLORS[i],
  }));

  return {
    thisSchoolYear,
    memberCount: members.length,
    waitingCount: reimbursements.filter((r) => r.status === "submitted").length,
    eventsThisYear: events.filter(
      (event) => schoolYearOf(event.startTime) === thisSchoolYear,
    ).length,
    upcoming: upcoming.slice(0, UPCOMING_LIMIT),
    upcomingCount: upcoming.length,
    membersByYear,
    membersByUniversity,
  };
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const user = useUserData();
  const {
    thisSchoolYear,
    memberCount,
    waitingCount,
    eventsThisYear,
    upcoming,
    upcomingCount,
    membersByYear,
    membersByUniversity,
  } = loaderData;
  const [nextEvent] = upcoming;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl leading-[1.1] font-bold tracking-[-0.03em]">
          Hey, <span className="brand-gradient-text">{user.firstName}</span>!
        </h1>
        <p className="text-base text-muted-foreground">
          Here’s what’s happening…
        </p>
      </header>

      <section
        aria-label="Summary"
        className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4"
      >
        <StatCard
          label="Members"
          value={memberCount}
          caption="Registered accounts"
        />
        <StatCard
          label="Reimbursements"
          value={waitingCount}
          caption="Waiting for approval"
        />
        <StatCard
          label="Events this year"
          value={eventsThisYear}
          caption={thisSchoolYear}
        />
        <StatCard
          label="Upcoming"
          value={upcomingCount}
          caption="Events scheduled"
        />
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-stretch gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <section
            aria-labelledby="members-by-year-heading"
            className="card-surface flex flex-1 flex-col gap-3 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="members-by-year-heading"
                  className="text-base font-semibold"
                >
                  Members by year
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Year of study across all registered members
                </p>
              </div>
              <SectionLink to="/members" label="Members" />
            </div>

            <div
              role="img"
              aria-label={`Bar chart of members by year of study: ${membersByYear
                .map((bar) => `${bar.label} ${bar.count}`)
                .join(", ")}`}
              className="min-h-[150px] flex-1"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={membersByYear} margin={{ left: -24, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--selected)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 10,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Members"
                    fill="var(--chart-1)"
                    radius={[8, 8, 4, 4]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-3">
              <div
                role="img"
                aria-label={`Members by university: ${membersByUniversity
                  .map((u) => `${u.university} ${u.count}`)
                  .join(", ")}`}
                className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
              >
                {membersByUniversity.map((u) => (
                  <div
                    key={u.university}
                    style={{
                      width: `${(u.count / Math.max(memberCount, 1)) * 100}%`,
                      background: u.color,
                    }}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-x-5 gap-y-1 text-sm">
                {membersByUniversity.map((u) => (
                  <li key={u.university} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: u.color }}
                    />
                    <span className="flex-1 text-muted-foreground">
                      {u.university}
                    </span>
                    <span className="font-medium">{u.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <QuickAction
              to="/reimbursements"
              icon={<Receipt aria-hidden="true" className="size-5" />}
              title="Request a reimbursement"
              detail="Upload a receipt and get paid back"
            />
            <QuickAction
              to="/events/new"
              icon={<CalendarPlus aria-hidden="true" className="size-5" />}
              title="Create an event"
              detail="Set up a new event for members"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {nextEvent && (
            <Link
              to={`/events/${nextEvent.eventId}`}
              className="brand-gradient relative flex items-center gap-5 overflow-hidden rounded-[18px] px-6 py-5 text-white shadow-[0_12px_32px_-12px_rgba(124,58,237,0.45)]"
            >
              <span
                aria-hidden="true"
                className="absolute -top-16 -right-10 size-48 rounded-full bg-white/15 blur-2xl"
              />
              <span className="relative flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-semibold tracking-[0.05em] uppercase">
                  Next event · {formatRelativeDays(nextEvent.startTime)}
                </span>
                <span className="text-xl font-bold tracking-[-0.02em]">
                  {nextEvent.name}
                </span>
                <span className="text-sm">
                  {formatDate(nextEvent.startTime)}
                </span>
              </span>
              {nextEvent.thumbnailUrl && (
                <img
                  src={nextEvent.thumbnailUrl}
                  alt={`${nextEvent.name} thumbnail`}
                  className="relative size-20 shrink-0 rounded-xl border border-white/35 object-cover"
                />
              )}
            </Link>
          )}

          <section
            aria-labelledby="upcoming-heading"
            className="card-surface flex flex-1 flex-col gap-2 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="upcoming-heading" className="text-base font-semibold">
                  Upcoming events
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  What’s on the calendar
                </p>
              </div>
              <SectionLink to="/events" label="All events" />
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events yet.
              </p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {upcoming.map((event) => (
                  <li key={event.eventId}>
                    <Link
                      to={`/events/${event.eventId}`}
                      className="flex items-center gap-4 rounded-xl px-2 py-1.5 transition-colors hover:bg-hover"
                    >
                      <DateBadge iso={event.startTime} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold">
                          {event.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.startTime)} ·{" "}
                          {formatRelativeDays(event.startTime)}
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-3 text-sm font-medium text-primary hover:bg-accent"
    >
      {label}
      <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

function QuickAction({
  to,
  icon,
  title,
  detail,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="card-surface flex items-center gap-3 p-3.5 transition-colors hover:border-primary/40 hover:bg-hover"
    >
      <span className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[13px] text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 text-muted-foreground"
      />
    </Link>
  );
}
