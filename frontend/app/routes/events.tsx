import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { DateBadge } from "~/components/date-badge";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { SearchField } from "~/components/search-field";
import { StatusChip } from "~/components/status-chip";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatDate, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import { EVENT_TYPE_LABELS, type BasicEvent } from "~/lib/types/event";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/events";

const WHEN_TABS = ["Upcoming", "Past", "All"] as const;
type WhenTab = (typeof WHEN_TABS)[number];

export async function clientLoader() {
  const events = await eventService.listEvents();
  const currentSchoolYear = schoolYearOf(new Date().toISOString());
  // School-year filter options are derived from event dates (HLD 5.2).
  const schoolYears = [
    ...new Set([
      currentSchoolYear,
      ...events.map((e) => schoolYearOf(e.startTime)),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  return { events, schoolYears, currentSchoolYear };
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function Events({ loaderData }: Route.ComponentProps) {
  const { events, schoolYears, currentSchoolYear } = loaderData;
  const [when, setWhen] = useState<WhenTab>("Upcoming");
  const [search, setSearch] = useState("");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);

  const now = new Date();
  const needle = search.trim().toLowerCase();
  const visibleEvents = events
    .filter((event) => schoolYearOf(event.startTime) === schoolYear)
    .filter((event) => {
      const isPast = new Date(event.endTime) < now;
      return when === "All" || (when === "Past" ? isPast : !isPast);
    })
    .filter((event) => event.name.toLowerCase().includes(needle))
    .sort((a, b) =>
      when === "Past"
        ? b.startTime.localeCompare(a.startTime)
        : a.startTime.localeCompare(b.startTime),
    );

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="Events"
        description="Pick an event to see attendees and settings."
        actions={
          <Button asChild>
            <Link to="/events/new">
              <Plus aria-hidden="true" />
              Create event
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <Tabs value={when} onValueChange={(value) => setWhen(value as WhenTab)}>
          <TabsList aria-label="When">
            {WHEN_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchField
          label="Search events"
          placeholder="Search events"
          value={search}
          onChange={setSearch}
        />
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span aria-hidden="true">School year</span>
          <Select value={schoolYear} onValueChange={setSchoolYear}>
            <SelectTrigger aria-label="School year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schoolYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section
        aria-label="Event list"
        className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5"
      >
        {visibleEvents.map((event) => (
          <EventCard
            key={event.eventId}
            event={event}
            isPast={new Date(event.endTime) < now}
          />
        ))}
      </section>
      {visibleEvents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No events for this school year.
        </p>
      )}
    </div>
  );
}

function EventCard({ event, isPast }: { event: BasicEvent; isPast: boolean }) {
  return (
    <Link
      to={`/events/${event.eventId}`}
      className="card-surface flex flex-col overflow-hidden transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_18px_36px_-16px_rgba(76,29,149,0.24)]"
    >
      <span
        className={cn(
          "relative flex h-32 items-center justify-center bg-gradient-to-br from-banner-from to-banner-to",
          isPast && "opacity-70",
        )}
      >
        {event.thumbnailUrl && (
          <img
            src={event.thumbnailUrl}
            alt={`${event.name} thumbnail`}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="absolute top-3 left-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
          <DateBadge iso={event.startTime} />
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-2 px-[18px] pt-4 pb-[18px]">
        <span className="flex flex-wrap gap-1.5">
          {event.type && (
            <StatusChip tone="accent">
              {EVENT_TYPE_LABELS[event.type]}
            </StatusChip>
          )}
          <StatusChip tone={event.isOnPortal ? "success" : "neutral"}>
            {event.isOnPortal ? "On portal" : "Hidden"}
          </StatusChip>
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.01em]">
          {event.name}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {formatDate(event.startTime)}
          {isPast && " · Ended"} · {event.location}
        </span>
        <span className="mt-auto flex justify-between border-t border-divider pt-2.5 text-[13px] text-muted-foreground">
          <span>
            {isPast
              ? event.attendedCount === null
                ? `${event.goingCount} registered`
                : `${event.attendedCount} attended`
              : event.isOnPortal
                ? `${event.goingCount} going`
                : "Not published yet"}
          </span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      </span>
    </Link>
  );
}
