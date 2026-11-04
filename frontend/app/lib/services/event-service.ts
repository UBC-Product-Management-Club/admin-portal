import { BaseService } from "~/lib/api/base-service";
import {
  applicantListSchema,
  applicantSchema,
  reviewEventListSchema,
  type ApplicantDecision,
} from "~/lib/types/applicant";
import { attendeeListSchema } from "~/lib/types/attendee";
import {
  basicEventListSchema,
  eventSchema,
  type EventUpdatePayload,
} from "~/lib/types/event";

class EventService extends BaseService {
  async listEvents() {
    return (await this.client()).get("/events/basic", basicEventListSchema);
  }

  async getEvent(eventId: string) {
    return (await this.client()).get(eventPath(eventId), eventSchema);
  }

  async listAttendees(eventId: string) {
    return (await this.client()).get(
      `${eventPath(eventId)}/attendees`,
      attendeeListSchema,
    );
  }

  async listReviewEvents() {
    return (await this.client()).get("/events/review", reviewEventListSchema);
  }

  async listApplicants(eventId: string) {
    return (await this.client()).get(
      `${eventPath(eventId)}/applicants`,
      applicantListSchema,
    );
  }

  async decideApplicant(
    eventId: string,
    attendeeId: string,
    status: ApplicantDecision,
  ) {
    return (await this.client()).patch(
      `${eventPath(eventId)}/applicants/${encodeURIComponent(attendeeId)}`,
      applicantSchema,
      { status },
    );
  }

  async setPaymentDue(
    eventId: string,
    attendeeId: string,
    paymentDueAt: string,
  ) {
    return (await this.client()).patch(
      `${eventPath(eventId)}/applicants/${encodeURIComponent(attendeeId)}/payment-due`,
      applicantSchema,
      { payment_due_at: paymentDueAt },
    );
  }

  /** Multipart so the optional thumbnail travels with the event. */
  async createEvent(form: FormData) {
    return (await this.client()).post("/events/add", eventSchema, form);
  }

  /** Send only changed fields so we don't clobber another admin's edits. */
  async updateEvent(eventId: string, changes: EventUpdatePayload) {
    return (await this.client()).patch(
      eventPath(eventId),
      eventSchema,
      changes,
    );
  }

  async replaceThumbnail(eventId: string, thumbnail: File) {
    const form = new FormData();
    form.append("thumbnail", thumbnail);
    return (await this.client()).patch(
      `${eventPath(eventId)}/thumbnail`,
      eventSchema,
      form,
    );
  }
}

function eventPath(eventId: string) {
  return `/events/${encodeURIComponent(eventId)}`;
}

export const eventService = new EventService();
