import { EventDeliverablesSchema } from '@/lib/types/Deliverable';
import { BasicEventsSchema, EventSchema } from '@/lib/types/Event';
import { EventService } from '@/services/EventService';
import { useCallback, useMemo } from 'react';

export function useEvents() {
  const eventService = useMemo(() => new EventService(), []);

  const getBasicEventInfo = useCallback(async () => {
    const data = await eventService.getBasicEventInfo();
    return BasicEventsSchema.parse(data);
  }, [eventService]);

  const getEvent = useCallback(
    async (event_id: string) => {
      const data = await eventService.getEvent(event_id);
      return EventSchema.parse(data);
    },
    [eventService]
  );

  const getEventDeliverables = useCallback(
    async (event_id: string) => {
      const data = await eventService.getEventDeliverables(event_id);
      return EventDeliverablesSchema.parse(data);
    },
    [eventService]
  );

  const downloadDeliverablesCsv = useCallback(
    async (event_id: string) => {
      await eventService.downloadDeliverablesCsv(event_id);
    },
    [eventService]
  );

  return { getBasicEventInfo, getEvent, getEventDeliverables, downloadDeliverablesCsv };
}
