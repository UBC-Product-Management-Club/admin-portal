import type { z } from "zod";

import type { ApiClient, RequestBody } from "~/lib/api/api-client";
import { ApiError } from "~/lib/api/rest-client";
import {
  MOCK_CURRENT_USER_ID,
  MOCK_REVIEW_EVENT,
  mockApplicants,
  mockEvents,
  mockRegistrations,
  mockReimbursements,
  mockUsers,
  type RawEvent,
  type RawReimbursement,
} from "~/lib/mocks/data";
import type { EventTrack, EventType } from "~/lib/types/event";
import type { ReimbursementCategory } from "~/lib/types/reimbursement";

type Method = "GET" | "POST" | "PATCH";
type Handler = (params: Record<string, string>, body?: RequestBody) => unknown;
type Route = { method: Method; pattern: RegExp; handler: Handler };

const MOCK_LATENCY_MS = 150;

/**
 * In-memory stand-in for the PMC backend's /api/v2/admin namespace. Responses
 * are snake_case and still go through the same Zod schemas as real ones.
 */
export class MockClient implements ApiClient {
  private readonly users = structuredClone(mockUsers);
  private readonly events = structuredClone(mockEvents);
  private readonly registrations = structuredClone(mockRegistrations);
  private readonly reimbursements = structuredClone(mockReimbursements);
  private readonly applicants = structuredClone(mockApplicants);

  private readonly routes: Route[] = [
    this.route("GET", "/users", () => this.users),
    this.route("GET", "/users/:userId", ({ userId }) => this.findUser(userId)),
    this.route("GET", "/users/:userId/events", ({ userId }) =>
      this.registrations
        .filter((r) => r.user_id === userId && r.checked_in)
        .map((r) => this.toBasicEvent(this.findEvent(r.event_id))),
    ),
    this.route("GET", "/events/basic", () =>
      this.events.map((event) => this.toBasicEvent(event)),
    ),
    this.route("GET", "/events/review", () => [MOCK_REVIEW_EVENT]),
    this.route("GET", "/events/:eventId/applicants", ({ eventId }) => ({
      ...this.findReviewEvent(eventId),
      applicants: this.applicants,
    })),
    this.route(
      "PATCH",
      "/events/:eventId/applicants/:attendeeId",
      ({ eventId, attendeeId }, body) => {
        this.findReviewEvent(eventId);
        const applicant = this.applicants.find(
          (a) => a.attendee_id === attendeeId,
        );
        if (!applicant) {
          throw new ApiError(404, "NOT_FOUND", "Applicant not found");
        }
        if (applicant.status !== "APPLIED") {
          throw new ApiError(
            409,
            "ALREADY_DECIDED",
            "This applicant has already been reviewed",
          );
        }
        const { status } = body as { status: "ACCEPTED" | "REJECTED" };
        applicant.status = status;
        applicant.reviewed_by = "dev.exec@example.ca";
        applicant.reviewed_at = new Date().toISOString();
        return applicant;
      },
    ),
    this.route("POST", "/events/add", (_params, body) =>
      this.createEvent(asFormData(body)),
    ),
    this.route("GET", "/events/:eventId", ({ eventId }) =>
      this.toEvent(this.findEvent(eventId)),
    ),
    this.route("PATCH", "/events/:eventId", ({ eventId }, body) => {
      const event = this.findEvent(eventId);
      Object.assign(event, body);
      return this.toEvent(event);
    }),
    this.route("PATCH", "/events/:eventId/thumbnail", ({ eventId }, body) => {
      const event = this.findEvent(eventId);
      event.thumbnail_url = fileUrl(asFormData(body).get("thumbnail"));
      return this.toEvent(event);
    }),
    this.route("GET", "/events/:eventId/attendees", ({ eventId }) =>
      this.registrations
        .filter((r) => r.event_id === this.findEvent(eventId).event_id)
        .map((r) => {
          const user = this.findUser(r.user_id);
          return {
            ...r,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
          };
        }),
    ),
    this.route("GET", "/reimbursements", () =>
      this.reimbursements.filter((r) => r.user_id === MOCK_CURRENT_USER_ID),
    ),
    this.route("POST", "/reimbursements", (_params, body) =>
      this.createReimbursement(asFormData(body)),
    ),
  ];

  get<T extends z.ZodType>(path: string, schema: T) {
    return this.handle("GET", path, schema);
  }

  post<T extends z.ZodType>(path: string, schema: T, body?: RequestBody) {
    return this.handle("POST", path, schema, body);
  }

  patch<T extends z.ZodType>(path: string, schema: T, body?: RequestBody) {
    return this.handle("PATCH", path, schema, body);
  }

  private async handle<T extends z.ZodType>(
    method: Method,
    path: string,
    schema: T,
    body?: RequestBody,
  ): Promise<z.output<T>> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    for (const route of this.routes) {
      const match = route.method === method && route.pattern.exec(path);
      if (match) {
        // Round-trip through JSON so callers never share mutable mock state.
        const json: unknown = JSON.parse(
          JSON.stringify(route.handler(match.groups ?? {}, body)),
        );
        return schema.parse(json);
      }
    }
    throw new ApiError(404, "NOT_FOUND", `No mock for ${method} ${path}`);
  }

  private route(method: Method, path: string, handler: Handler): Route {
    const pattern = new RegExp(`^${path.replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`);
    return { method, pattern, handler };
  }

  private findUser(userId: string) {
    const user = this.users.find((u) => u.user_id === userId);
    if (!user) throw new ApiError(404, "NOT_FOUND", "Member not found");
    return user;
  }

  private findReviewEvent(eventId: string) {
    if (eventId !== MOCK_REVIEW_EVENT.event_id) {
      throw new ApiError(404, "NOT_FOUND", "Event not found");
    }
    return MOCK_REVIEW_EVENT;
  }

  private findEvent(eventId: string) {
    const event = this.events.find((e) => e.event_id === eventId);
    if (!event) throw new ApiError(404, "NOT_FOUND", "Event not found");
    return event;
  }

  private toEvent(event: RawEvent) {
    const registeredCount = this.registrations.filter(
      (r) => r.event_id === event.event_id && r.rsvp === "going",
    ).length;
    return { ...event, registered_count: registeredCount };
  }

  private toBasicEvent(event: RawEvent) {
    const registrations = this.registrations.filter(
      (r) => r.event_id === event.event_id,
    );
    return {
      event_id: event.event_id,
      name: event.name,
      type: event.type,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      thumbnail_url: event.thumbnail_url,
      is_disabled: event.is_disabled,
      going_count: registrations.filter((r) => r.rsvp === "going").length,
      attended_count: registrations.filter((r) => r.checked_in).length,
    };
  }

  private createEvent(form: FormData) {
    const event: RawEvent = {
      event_id: crypto.randomUUID(),
      name: String(form.get("name")),
      type: String(form.get("type")) as EventType,
      start_time: String(form.get("start_time")),
      end_time: String(form.get("end_time")),
      location: String(form.get("location")),
      description: String(form.get("description")),
      max_attendees: Number(form.get("max_attendees")),
      is_disabled: form.get("is_disabled") === "true",
      tracks: form.getAll("tracks").map(String) as EventTrack[],
      submissions_open_at: null,
      submissions_close_at: null,
      thumbnail_url: fileUrl(form.get("thumbnail")),
      member_price: null,
      non_member_price: null,
    };
    this.events.push(event);
    return this.toEvent(event);
  }

  private createReimbursement(form: FormData) {
    const eventId = form.get("event_id");
    const event = eventId ? this.findEvent(String(eventId)) : null;
    const request: RawReimbursement = {
      id: crypto.randomUUID(),
      user_id: MOCK_CURRENT_USER_ID,
      event_id: event?.event_id ?? null,
      event_name: event?.name ?? null,
      item: String(form.get("item")),
      amount: Number(form.get("amount")),
      category: String(form.get("category")) as ReimbursementCategory,
      receipt_url: fileUrl(form.get("receipt")) ?? "#",
      etransfer_email: String(form.get("etransfer_email")),
      purchase_date: String(form.get("purchase_date")),
      notes: form.get("notes") ? String(form.get("notes")) : null,
      status: "submitted",
      created_at: new Date().toISOString(),
    };
    this.reimbursements.unshift(request);
    return request;
  }
}

function asFormData(body?: RequestBody): FormData {
  if (!(body instanceof FormData)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Expected multipart form data");
  }
  return body;
}

function fileUrl(value: FormDataEntryValue | null): string | null {
  return value instanceof File && value.size > 0
    ? URL.createObjectURL(value)
    : null;
}
