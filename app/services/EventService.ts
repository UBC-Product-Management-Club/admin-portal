import type { BasicEvent, Event } from "@/lib/types/Event";
import type { User } from "@/lib/types/User";
import { BaseService } from "./BaseService";

class EventService extends BaseService {
    private readonly path: string = "/events"

    getBasicEventInfo(): Promise<BasicEvent[]> {
        return this.client.get(`${this.path}/basic`, this.headers)
    }

    getEvent(event_id: string): Promise<Event> {
        return this.client.get(`${this.path}/${event_id}`, this.headers)
    }

    getEventAttendees(event_id: string): Promise<User[]> {
        return this.client.get(`${this.path}/${event_id}/attendees`, this.headers)
    }

}

export { EventService }