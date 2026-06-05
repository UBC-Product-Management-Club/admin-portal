import { EventService } from "@/services/EventService";
import { useCallback, useMemo } from "react";

export function useEvents() {
    const eventService = useMemo(() => new EventService, [])

    const getBasicEventInfo = useCallback(
        () => eventService.getBasicEventInfo(),
        [eventService]
    )

    const getEvent = useCallback(
        (event_id: string) => eventService.getEvent(event_id),
        [eventService]
    )

    const getEventAttendees = useCallback(
        (event_id: string) => eventService.getEventAttendees(event_id),
        [eventService]
    )

    return { getBasicEventInfo, getEvent, getEventAttendees }
}