import { BasicEventsSchema, EventSchema } from "@/lib/types/Event";
import { EventService } from "@/services/EventService";
import { useCallback, useMemo } from "react";

export function useEvents() {
    const eventService = useMemo(() => new EventService, [])

    const getBasicEventInfo = useCallback(async () => {
        const data = await eventService.getBasicEventInfo()
        return BasicEventsSchema.parse(data)
    }, [eventService])

    const getEvent = useCallback(async () => {
        const data = await eventService.getBasicEventInfo()
        return EventSchema.parse(data)
    }, [eventService])

    return { getBasicEventInfo, getEvent } 
}