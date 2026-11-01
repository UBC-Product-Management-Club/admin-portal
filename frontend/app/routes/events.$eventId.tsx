import { useState } from "react";

import { EventAttendees } from "~/components/event-attendees";
import { EventConfiguration } from "~/components/event-configuration";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { StatusChip } from "~/components/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatDate, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import type { Route } from "./+types/events.$eventId";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [event, attendees] = await Promise.all([
    eventService.getEvent(params.eventId),
    eventService.listAttendees(params.eventId),
  ]);
  return { event, attendees };
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function EventDetailRoute({ loaderData }: Route.ComponentProps) {
  // Re-key per event so local edits never leak between events.
  return <EventDetail key={loaderData.event.eventId} {...loaderData} />;
}

function EventDetail({
  event: initialEvent,
  attendees,
}: Route.ComponentProps["loaderData"]) {
  const [event, setEvent] = useState(initialEvent);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        breadcrumb={{ to: "/events", label: "Events", current: event.name }}
        title={event.name}
        description={`${formatDate(event.startTime)} · ${event.location} · ${schoolYearOf(event.startTime)}`}
        actions={
          <StatusChip tone={event.isOnPortal ? "success" : "neutral"}>
            {event.isOnPortal ? "On portal" : "Hidden from portal"}
          </StatusChip>
        }
      />

      <Tabs defaultValue="attendees" className="gap-6">
        <TabsList aria-label="Event sections">
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="attendees">
          <EventAttendees eventName={event.name} attendees={attendees} />
        </TabsContent>
        <TabsContent value="configuration">
          <EventConfiguration event={event} onEventChange={setEvent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
