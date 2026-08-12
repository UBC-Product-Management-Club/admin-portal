import { BasicEventsSchema, EventSchema } from "@/lib/types/Event";
import type { EventCreatePayload, EventUpdatePayload } from "@/lib/types/Event";
import { EventService } from "@/services/EventService";
import { useCallback, useMemo } from "react";

export function useEvents() {
    const eventService = useMemo(() => new EventService, [])

    const getBasicEventInfo = useCallback(async () => {
        const data = await eventService.getBasicEventInfo()
        return BasicEventsSchema.parse(data)
    }, [eventService])

    const getEvent = useCallback(async (event_id: string) => {
        const data = await eventService.getEvent(event_id)
        return EventSchema.parse(data)
    }, [eventService])

    const updateEvent = useCallback(async (event_id: string, payload: EventUpdatePayload) => {
        const data = await eventService.updateEvent(event_id, payload)
        return EventSchema.parse(data)
    }, [eventService])

    const updateThumbnail = useCallback(async (event_id: string, file: File) => {
        const data = await eventService.updateThumbnail(event_id, file)
        return EventSchema.parse(data)
    }, [eventService])

    const createEvent = useCallback(async (payload: EventCreatePayload, thumbnail: File | null) => {
        const data = await eventService.createEvent(payload, thumbnail)
        return EventSchema.parse(data)
    }, [eventService])

    return { getBasicEventInfo, getEvent, updateEvent, updateThumbnail, createEvent }
} 