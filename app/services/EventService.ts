import type { EventDeliverables } from '@/lib/types/Deliverable';
import type { BasicEvent, Event } from '@/lib/types/Event';
import { BaseService } from './BaseService';

class EventService extends BaseService {
  private readonly path: string = '/events';

  getBasicEventInfo(): Promise<BasicEvent[]> {
    return this.client.get(`${this.path}/basic`, this.headers);
  }

  getEvent(event_id: string): Promise<Event> {
    return this.client.get(`${this.path}/${event_id}`, this.headers);
  }

  getEventDeliverables(event_id: string): Promise<EventDeliverables> {
    return this.client.get(`${this.path}/${event_id}/deliverables/export`, this.headers);
  }

  downloadDeliverablesCsv(event_id: string): Promise<void> {
    return this.client.downloadBlob(
      `${this.path}/${event_id}/deliverables/export?format=csv`,
      `event_${event_id}_deliverables.csv`
    );
  }
}

export { EventService };
