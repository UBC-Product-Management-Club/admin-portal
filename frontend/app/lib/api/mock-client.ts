import type { z } from "zod";

import type { ApiClient, RequestBody } from "~/lib/api/api-client";
import { ApiError } from "~/lib/api/rest-client";
import {
  MOCK_CURRENT_USER_ID,
  MOCK_REVIEW_EVENT,
  MOCK_SUBMISSION_EVENT_ID,
  mockApplicants,
  mockEvents,
  mockRegistrations,
  mockReimbursements,
  mockSubmissionFields,
  mockSubmissions,
  mockUsers,
  type RawEvent,
  type RawReimbursement,
} from "~/lib/mocks/data";
import type { EventTrack, EventType } from "~/lib/types/event";

type Method = "GET" | "POST" | "PATCH" | "PUT";
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
    this.route("GET", "/finance/settings", () => mockReimbursementConfig),
    this.route("PUT", "/finance/settings/instructions", (_params, body) => {
      const input = body as { content: string };
      mockReimbursementConfig.instruction = {
        content: input.content,
        version: mockReimbursementConfig.instruction.version + 1,
        updated_at: new Date().toISOString(),
      };
      return mockReimbursementConfig.instruction;
    }),
    this.route("POST", "/finance/settings/categories", (_params, body) => {
      const input = body as { label: string; gl_code: string };
      const category = {
        id: `cat-${crypto.randomUUID()}`,
        slug: input.label
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, ""),
        label: input.label.trim(),
        gl_code: input.gl_code.trim(),
      };
      mockReimbursementConfig.categories.push(category);
      return category;
    }),
    this.route(
      "PATCH",
      "/finance/settings/categories/:categoryId/archive",
      ({ categoryId }) => {
        const index = mockReimbursementConfig.categories.findIndex(
          (category) => category.id === categoryId,
        );
        if (index < 0)
          throw new ApiError(404, "NOT_FOUND", "Expense category not found");
        mockReimbursementConfig.categories.splice(index, 1);
        return { ok: true };
      },
    ),
    this.route(
      "PATCH",
      "/events/:eventId/applicants/:attendeeId/payment-due",
      ({ eventId, attendeeId }, body) => {
        this.findReviewEvent(eventId);
        const applicant = this.applicants.find(
          (a) => a.attendee_id === attendeeId,
        );
        if (!applicant) {
          throw new ApiError(404, "NOT_FOUND", "Applicant not found");
        }
        if (applicant.status !== "ACCEPTED") {
          throw new ApiError(
            409,
            "NOT_AWAITING_PAYMENT",
            "Only accepted applicants who haven't paid have a payment deadline",
          );
        }
        const { payment_due_at } = body as { payment_due_at: string };
        applicant.payment_due_at = payment_due_at;
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
    this.route("GET", "/events/:eventId/submissions", ({ eventId }) => {
      const event = this.findEvent(eventId);
      const hasTeams = event.event_id === MOCK_SUBMISSION_EVENT_ID;
      return {
        event_id: event.event_id,
        name: event.name,
        fields: hasTeams ? mockSubmissionFields : [],
        teams: hasTeams ? mockSubmissions : [],
      };
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
    this.route("GET", "/finance/reimbursements", () => this.reimbursements),
    this.route(
      "GET",
      "/finance/reimbursements/:reimbursementId",
      ({ reimbursementId }) => this.findFinanceReimbursement(reimbursementId),
    ),
    this.route(
      "PATCH",
      "/finance/reimbursements/:reimbursementId/status",
      ({ reimbursementId }, body) => {
        const request = this.findFinanceReimbursement(reimbursementId);
        const input = body as { status: string; reason?: string | null };
        Object.assign(request, {
          status: input.status,
          status_reason: input.reason?.trim() || null,
          updated_at: new Date().toISOString(),
        });
        return request;
      },
    ),
    this.route("GET", "/reimbursements/config", () => mockReimbursementConfig),
    this.route("POST", "/reimbursements", (_params, body) =>
      this.createReimbursement(asFormData(body)),
    ),
    this.route(
      "GET",
      "/reimbursements/:reimbursementId",
      ({ reimbursementId }) => this.findReimbursement(reimbursementId),
    ),
    this.route(
      "PATCH",
      "/reimbursements/:reimbursementId",
      ({ reimbursementId }, body) =>
        this.updateReimbursement(reimbursementId, asFormData(body)),
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

  put<T extends z.ZodType>(path: string, schema: T, body?: RequestBody) {
    return this.handle("PUT", path, schema, body);
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
    const category = findOption(
      mockReimbursementConfig.categories,
      String(form.get("category_id")),
    );
    const department = findOption(
      mockReimbursementConfig.departments,
      String(form.get("department_id")),
    );
    const request: RawReimbursement = {
      id: crypto.randomUUID(),
      user_id: MOCK_CURRENT_USER_ID,
      event_id: event?.event_id ?? null,
      event_name: event?.name ?? null,
      item: String(form.get("item")),
      amount: Number(form.get("amount")),
      category,
      department,
      etransfer_email: String(form.get("etransfer_email")),
      etransfer_full_name: String(form.get("etransfer_full_name")),
      purchase_date: String(form.get("purchase_date")),
      vendor: nullable(form.get("vendor")),
      vendor_reference: nullable(form.get("vendor_reference")),
      notes: form.get("notes") ? String(form.get("notes")) : null,
      status: "pending",
      status_reason: null,
      instruction_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: attachmentsFromForm(form),
    };
    if (request.attachments.length === 0) {
      throw new ApiError(
        400,
        "RECEIPT_REQUIRED",
        "Attach at least one receipt",
      );
    }
    this.reimbursements.unshift(request);
    return request;
  }

  private findReimbursement(reimbursementId: string) {
    const request = this.reimbursements.find(
      (item) =>
        item.id === reimbursementId && item.user_id === MOCK_CURRENT_USER_ID,
    );
    if (!request)
      throw new ApiError(404, "NOT_FOUND", "Reimbursement request not found");
    return request;
  }

  private findFinanceReimbursement(reimbursementId: string) {
    const request = this.reimbursements.find(
      (item) => item.id === reimbursementId,
    );
    if (!request)
      throw new ApiError(404, "NOT_FOUND", "Reimbursement request not found");
    return request;
  }

  private updateReimbursement(reimbursementId: string, form: FormData) {
    const request = this.findReimbursement(reimbursementId);
    if (!["pending", "needs_changes"].includes(request.status)) {
      throw new ApiError(
        409,
        "REIMBURSEMENT_LOCKED",
        "Only Pending or Needs Changes requests can be edited",
      );
    }
    const eventId = form.get("event_id");
    const event = eventId ? this.findEvent(String(eventId)) : null;
    const removed = new Set(form.getAll("remove_attachment_ids").map(String));
    const additions = attachmentsFromForm(form);
    if (
      request.attachments.filter((attachment) => !removed.has(attachment.id))
        .length +
        additions.length <
      1
    ) {
      throw new ApiError(
        400,
        "RECEIPT_REQUIRED",
        "Keep or attach at least one receipt",
      );
    }
    Object.assign(request, {
      event_id: event?.event_id ?? null,
      event_name: event?.name ?? null,
      item: String(form.get("item")),
      amount: Number(form.get("amount")),
      category: findOption(
        mockReimbursementConfig.categories,
        String(form.get("category_id")),
      ),
      department: findOption(
        mockReimbursementConfig.departments,
        String(form.get("department_id")),
      ),
      etransfer_email: String(form.get("etransfer_email")),
      etransfer_full_name: String(form.get("etransfer_full_name")),
      purchase_date: String(form.get("purchase_date")),
      vendor: nullable(form.get("vendor")),
      vendor_reference: nullable(form.get("vendor_reference")),
      notes: nullable(form.get("notes")),
      status: request.status === "needs_changes" ? "pending" : request.status,
      status_reason: null,
      updated_at: new Date().toISOString(),
      attachments: [
        ...request.attachments.filter(
          (attachment) => !removed.has(attachment.id),
        ),
        ...additions,
      ],
    });
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

const mockReimbursementConfig = {
  categories: [
    {
      id: "cat-award",
      slug: "award_and_prize",
      label: "Award and prize",
      gl_code: "70550",
    },
    {
      id: "cat-misc",
      slug: "misc_expense",
      label: "Misc expense",
      gl_code: "70107",
    },
    {
      id: "cat-booking",
      slug: "booking_and_rental",
      label: "Booking and rental",
      gl_code: "70200",
    },
    {
      id: "cat-software",
      slug: "computer_hardware_software_website_maintenance",
      label: "Computer hardware/software & website maintenance",
      gl_code: "70333",
    },
    {
      id: "cat-gifts",
      slug: "souvenir_and_gifts",
      label: "Souvenir and gifts",
      gl_code: "70544",
    },
    {
      id: "cat-food",
      slug: "food_and_beverage",
      label: "Food and beverage",
      gl_code: "70080",
    },
  ],
  departments: [
    { id: "dept-events", slug: "events", label: "Events" },
    { id: "dept-community", slug: "community", label: "Community" },
    { id: "dept-tech", slug: "tech", label: "Tech" },
    { id: "dept-media", slug: "media", label: "Media" },
    { id: "dept-design", slug: "design", label: "Design" },
    { id: "dept-partnerships", slug: "partnerships", label: "Partnerships" },
    { id: "dept-finance", slug: "finance", label: "Finance" },
    { id: "dept-exec-dev", slug: "exec_dev", label: "Exec-dev" },
  ],
  instruction: {
    content:
      "Attach clear receipts that show the vendor, date, purchased items, and total paid. Submit one request per expense category. Finance will verify the receipt total before reimbursement.",
    version: 1,
    updated_at: "2026-01-01T00:00:00Z",
  },
};

function findOption<T extends { id: string }>(options: T[], id: string): T {
  const option = options.find((value) => value.id === id);
  if (!option)
    throw new ApiError(400, "VALIDATION_ERROR", "Choose an active option");
  return option;
}

function nullable(value: FormDataEntryValue | null) {
  return value ? String(value) : null;
}

function attachmentsFromForm(form: FormData) {
  return form
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .map((file, index) => ({
      id: crypto.randomUUID(),
      original_filename: file.name,
      mime_type: file.type || "application/octet-stream",
      byte_size: file.size,
      sort_order: index,
      created_at: new Date().toISOString(),
      url: fileUrl(file),
    }));
}
