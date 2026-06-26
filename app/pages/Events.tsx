import type { BasicEvent, BasicEvents } from '@/lib/types/Event';
import type { Route } from '../+types/root';
import { useEffect, useMemo, useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import EventCard from '@/components/event-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Returns the school year label for a given ISO date string.
 * A school year runs Sept 1 – Aug 31.
 * e.g. "2024-11-29" → "2024-2025", "2025-03-15" → "2024-2025"
 */
function getSchoolYear(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, so Aug = 7
  if (month >= 8) {
    // Sept (8) through Dec (11) → starts this calendar year
    return `${year}-${year + 1}`;
  }
  // Jan (0) through Aug (7) → started previous calendar year
  return `${year - 1}-${year}`;
}

/**
 * Derives sorted unique school years from the events list (newest first).
 */
function getAvailableSchoolYears(events: BasicEvents): string[] {
  const years = new Set(events.map((e) => getSchoolYear(e.date)));
  return Array.from(years).sort().reverse();
}

export default function Events({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const [events, setEvents] = useState<BasicEvents | undefined>();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const { getBasicEventInfo } = useEvents();

  useEffect(() => {
    getBasicEventInfo()
      .then(setEvents)
      .catch((e) => console.error(e));
  }, []);

  const availableYears = useMemo(() => {
    if (!events) return [];
    return getAvailableSchoolYears(events);
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!selectedYear || selectedYear === 'all') return events;
    return events.filter((e) => getSchoolYear(e.date) === selectedYear);
  }, [events, selectedYear]);

  const handleEventClick = (eventId: string) => {
    // TODO: Route to event detail page, e.g. navigate(`/events/${eventId}`)
    console.log('Navigate to event:', eventId);
  };

  const handleCreateEvent = () => {
    // TODO: Route to create event page
    console.log('Navigate to create event');
  };

  if (!events) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Events</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        {availableYears.length > 0 && (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger id="school-year-filter">
              <SelectValue placeholder="School Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No events for this school year.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card
            className="group flex flex-col items-center justify-center cursor-pointer p-0 py-0 gap-0 border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            onClick={handleCreateEvent}
          >
            <div className="flex flex-col items-center justify-center gap-2 aspect-[4/5] w-full">
              <Plus className="size-10 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Create Event</span>
            </div>
          </Card>
          {filteredEvents.map((event) => (
            <EventCard
              key={event.event_id}
              event={event}
              onClick={handleEventClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
