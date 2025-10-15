import type { BasicEvent, Event } from "@/lib/types/Event";
import { BaseService } from "./BaseService";

class EventService extends BaseService {
    private readonly path: string = "/events"
    
    getBasicEventInfo(): Promise<BasicEvent[]> {
        return this.client.get(`${this.path}/basic`, this.headers)
    }

    getEvent(event_id: string): Promise<Event> {
        return this.client.get(`${this.path}/${event_id}`, this.headers)
    }

}

export { EventService }