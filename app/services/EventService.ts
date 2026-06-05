import { BasicEventsSchema, EventSchema } from "@/lib/types/Event";
import type { BasicEvent, Event } from "@/lib/types/Event";
import { EventAttendeesResponseSchema } from "@/lib/types/User";
import type { EventAttendee } from "@/lib/types/User";
import { BaseService } from "./BaseService";

class EventService extends BaseService {
    private readonly path: string = "/events"

    async getBasicEventInfo(): Promise<BasicEvent[]> {
        const data = await this.client.get(`${this.path}/basic`, this.headers)
        return BasicEventsSchema.parse(data)
    }

    async getEvent(event_id: string): Promise<Event> {
        const data = await this.client.get(`${this.path}/${event_id}`, this.headers)
        return EventSchema.parse(data)
    }

    async getEventAttendees(event_id: string): Promise<EventAttendee[]> {
        const data = await this.client.get(`${this.path}/${event_id}/attendees`, this.headers)
        return EventAttendeesResponseSchema.parse(data)
    }

}

export { EventService }