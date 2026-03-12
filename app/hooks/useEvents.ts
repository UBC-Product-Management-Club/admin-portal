import { BasicEventsSchema, EventSchema } from "@/lib/types/Event";
import { UsersSchema } from "@/lib/types/User";
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

    const getEventAttendees = useCallback(async (event_id: string) => {
        const data = await eventService.getEventAttendees(event_id)
        const users = (data as any[]).map(item => item.User).filter(Boolean)
        return UsersSchema.parse(users)
    }, [eventService])

    return { getBasicEventInfo, getEvent, getEventAttendees }
} 