import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import { HttpError } from "./lib/http-error.js";
import type { ApplicantStore } from "./lib/applicants.js";
import type { EventStore } from "./lib/events.js";
import type { ReimbursementStore } from "./lib/reimbursements.js";
import type { AuthUser, VerifyToken } from "./lib/supabase.js";
import type { UserStore } from "./lib/users.js";

const users: Record<string, AuthUser> = {
  "exec-token": { id: "u1", email: "exec@ubcpmc.com", emailConfirmed: true },
  "outsider-token": {
    id: "u2",
    email: "someone@gmail.com",
    emailConfirmed: true,
  },
  "unconfirmed-token": {
    id: "u3",
    email: "fake@ubcpmc.com",
    emailConfirmed: false,
  },
};
const verifyToken: VerifyToken = async (token) => users[token] ?? null;

const memberStore = { listUsers: vi.fn() } satisfies UserStore;
const eventStore = {
  listBasicEvents: vi.fn(),
  getEvent: vi.fn(),
  listAttendees: vi.fn(),
} satisfies EventStore;
const applicants = {
  listReviewEvents: vi.fn(),
  listApplicants: vi.fn(),
  decide: vi.fn(),
  setPaymentDue: vi.fn(),
} satisfies ApplicantStore;
const reimbursements = {
  listForUser: vi.fn(),
  submit: vi.fn(),
  review: vi.fn(),
} satisfies ReimbursementStore;

const EVENT_ID = "28ee870f-b0e1-45a8-a49d-d137a2700166";
const ATTENDEE_ID = "550e8400-e29b-41d4-a716-446655440000";
const APPLICANT_PATH = `/api/v2/admin/events/${EVENT_ID}/applicants/${ATTENDEE_ID}`;

const app = createApp({
  corsOrigins: ["http://localhost:5173"],
  adminEmailDomains: ["ubcpmc.com"],
  verifyToken,
  users: memberStore,
  events: eventStore,
  applicants,
  reimbursements,
});

describe("admin API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("serves a health check without auth", async () => {
    await request(app).get("/health").expect(200, { ok: true });
  });

  it("rejects requests without a bearer token", async () => {
    const res = await request(app).get("/api/v2/admin/users").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid tokens", async () => {
    await request(app)
      .get("/api/v2/admin/users")
      .set("Authorization", "Bearer nope")
      .expect(401);
  });

  it("rejects non-PMC emails", async () => {
    const res = await request(app)
      .get("/api/v2/admin/users")
      .set("Authorization", "Bearer outsider-token")
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects PMC emails that aren't confirmed", async () => {
    const res = await request(app)
      .get("/api/v2/admin/users")
      .set("Authorization", "Bearer unconfirmed-token")
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lets PMC admins through to the route", async () => {
    const res = await request(app)
      .get("/api/v2/admin/budget")
      .set("Authorization", "Bearer exec-token")
      .expect(501);
    expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("returns the standard error shape for unknown routes", async () => {
    await request(app)
      .get("/nope")
      .expect(404, {
        error: { code: "NOT_FOUND", message: "No route for GET /nope" },
      });
  });

  it("lists members", async () => {
    memberStore.listUsers.mockResolvedValue([{ user_id: "auth0|1" }]);
    await request(app)
      .get("/api/v2/admin/users")
      .set("Authorization", "Bearer exec-token")
      .expect(200, [{ user_id: "auth0|1" }]);
  });

  it("lists events for the grid", async () => {
    eventStore.listBasicEvents.mockResolvedValue([{ event_id: "e1" }]);
    await request(app)
      .get("/api/v2/admin/events/basic")
      .set("Authorization", "Bearer exec-token")
      .expect(200, [{ event_id: "e1" }]);
  });

  it("shows one event's details and attendees", async () => {
    eventStore.getEvent.mockResolvedValue({ event_id: EVENT_ID });
    eventStore.listAttendees.mockResolvedValue([{ user_id: "auth0|1" }]);
    await request(app)
      .get(`/api/v2/admin/events/${EVENT_ID}`)
      .set("Authorization", "Bearer exec-token")
      .expect(200, { event_id: EVENT_ID });
    await request(app)
      .get(`/api/v2/admin/events/${EVENT_ID}/attendees`)
      .set("Authorization", "Bearer exec-token")
      .expect(200, [{ user_id: "auth0|1" }]);
    expect(eventStore.getEvent).toHaveBeenCalledWith(EVENT_ID);
    expect(eventStore.listAttendees).toHaveBeenCalledWith(EVENT_ID);
  });

  it("rejects event ids that aren't valid", async () => {
    await request(app)
      .get("/api/v2/admin/events/not-an-id")
      .set("Authorization", "Bearer exec-token")
      .expect(400);
    expect(eventStore.getEvent).not.toHaveBeenCalled();
  });

  it.each([
    "/users",
    "/events/basic",
    `/events/${EVENT_ID}`,
    `/events/${EVENT_ID}/attendees`,
  ])("keeps %s behind admin auth", async (path) => {
    await request(app).get(`/api/v2/admin${path}`).expect(401);
    await request(app)
      .get(`/api/v2/admin${path}`)
      .set("Authorization", "Bearer outsider-token")
      .expect(403);
    expect(memberStore.listUsers).not.toHaveBeenCalled();
    expect(eventStore.listBasicEvents).not.toHaveBeenCalled();
    expect(eventStore.getEvent).not.toHaveBeenCalled();
    expect(eventStore.listAttendees).not.toHaveBeenCalled();
  });

  describe("applicants", () => {
    const asExec = (req: request.Test) =>
      req.set("Authorization", "Bearer exec-token");

    it("requires a PMC admin to read or change applicants", async () => {
      await request(app)
        .get(`/api/v2/admin/events/${EVENT_ID}/applicants`)
        .expect(401);
      await request(app)
        .patch(APPLICANT_PATH)
        .set("Authorization", "Bearer outsider-token")
        .send({ status: "ACCEPTED" })
        .expect(403);
      expect(applicants.listApplicants).not.toHaveBeenCalled();
      expect(applicants.decide).not.toHaveBeenCalled();
    });

    it("lists events that take applications", async () => {
      applicants.listReviewEvents.mockResolvedValue([{ event_id: EVENT_ID }]);
      const res = await asExec(
        request(app).get("/api/v2/admin/events/review"),
      ).expect(200);
      expect(res.body).toEqual([{ event_id: EVENT_ID }]);
    });

    it("lists an event's applicants", async () => {
      applicants.listApplicants.mockResolvedValue({ applicants: [] });
      await asExec(
        request(app).get(`/api/v2/admin/events/${EVENT_ID}/applicants`),
      ).expect(200, { applicants: [] });
      expect(applicants.listApplicants).toHaveBeenCalledWith(EVENT_ID);
    });

    it("records the signed-in exec as the reviewer", async () => {
      applicants.decide.mockResolvedValue({ status: "ACCEPTED" });
      await asExec(request(app).patch(APPLICANT_PATH))
        .send({ status: "ACCEPTED" })
        .expect(200, { status: "ACCEPTED" });
      expect(applicants.decide).toHaveBeenCalledWith(
        EVENT_ID,
        ATTENDEE_ID,
        "ACCEPTED",
        "exec@ubcpmc.com",
      );
    });

    it.each(["APPLIED", "REGISTERED", "accepted", undefined])(
      "rejects %s as a decision",
      async (status) => {
        const res = await asExec(request(app).patch(APPLICANT_PATH))
          .send({ status })
          .expect(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(applicants.decide).not.toHaveBeenCalled();
      },
    );

    it("changes a payment deadline", async () => {
      const dueAt = "2099-01-01T08:00:00.000Z";
      applicants.setPaymentDue.mockResolvedValue({ payment_due_at: dueAt });
      await asExec(request(app).patch(`${APPLICANT_PATH}/payment-due`))
        .send({ payment_due_at: dueAt })
        .expect(200, { payment_due_at: dueAt });
      expect(applicants.setPaymentDue).toHaveBeenCalledWith(
        EVENT_ID,
        ATTENDEE_ID,
        dueAt,
      );
    });

    it("keeps payment deadlines behind admin auth", async () => {
      const path = `${APPLICANT_PATH}/payment-due`;
      const body = { payment_due_at: "2099-01-01T08:00:00.000Z" };
      await request(app).patch(path).send(body).expect(401);
      await request(app)
        .patch(path)
        .set("Authorization", "Bearer outsider-token")
        .send(body)
        .expect(403);
      expect(applicants.setPaymentDue).not.toHaveBeenCalled();
    });

    it.each(["next friday", "2099-01-01", null, undefined])(
      "rejects %s as a payment deadline",
      async (paymentDueAt) => {
        await asExec(request(app).patch(`${APPLICANT_PATH}/payment-due`))
          .send({ payment_due_at: paymentDueAt })
          .expect(400);
        expect(applicants.setPaymentDue).not.toHaveBeenCalled();
      },
    );

    it("rejects ids that aren't valid", async () => {
      await asExec(
        request(app).get("/api/v2/admin/events/not-an-id/applicants"),
      ).expect(400);
    });

    it("returns store errors in the standard format", async () => {
      applicants.decide.mockRejectedValue(
        new HttpError(409, "ALREADY_DECIDED", "Already reviewed"),
      );
      await asExec(request(app).patch(APPLICANT_PATH))
        .send({ status: "REJECTED" })
        .expect(409, {
          error: { code: "ALREADY_DECIDED", message: "Already reviewed" },
        });
    });
  });

  describe("reimbursements", () => {
    const REQUEST_ID = "7d1b2c3e-4f50-4a61-8b72-9c83d4e5f601";
    const asExec = (req: request.Test) =>
      req.set("Authorization", "Bearer exec-token");
    const submit = () =>
      asExec(request(app).post("/api/v2/admin/reimbursements"))
        .field("item", "Pizza")
        .field("amount", "42.50")
        .field("category", "food")
        .field("etransfer_email", "exec@ubcpmc.com")
        .field("purchase_date", "2026-11-10");

    it("lists only the signed-in exec's requests", async () => {
      reimbursements.listForUser.mockResolvedValue([{ id: REQUEST_ID }]);
      await asExec(request(app).get("/api/v2/admin/reimbursements")).expect(
        200,
        [{ id: REQUEST_ID }],
      );
      expect(reimbursements.listForUser).toHaveBeenCalledWith("u1");
    });

    it("submits a request with its receipt", async () => {
      reimbursements.submit.mockResolvedValue({ id: REQUEST_ID });
      await submit()
        .attach("receipt", Buffer.from("%PDF-1.4"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        })
        .expect(201, { id: REQUEST_ID });
      expect(reimbursements.submit).toHaveBeenCalledWith(
        "u1",
        {
          item: "Pizza",
          amount: 42.5,
          category: "food",
          etransfer_email: "exec@ubcpmc.com",
          purchase_date: "2026-11-10",
          event_id: null,
          notes: null,
        },
        expect.objectContaining({
          mimetype: "application/pdf",
          originalname: "receipt.pdf",
        }),
      );
    });

    it("needs a receipt that's an image or PDF", async () => {
      const missing = await submit().expect(400);
      expect(missing.body.error.message).toBe("Attach a receipt");
      await submit()
        .attach("receipt", Buffer.from("hi"), {
          filename: "receipt.txt",
          contentType: "text/plain",
        })
        .expect(400);
      expect(reimbursements.submit).not.toHaveBeenCalled();
    });

    it.each(["0", "-5", "12.345", "abc"])(
      "rejects %s as an amount",
      async (amount) => {
        await asExec(request(app).post("/api/v2/admin/reimbursements"))
          .field("item", "Pizza")
          .field("amount", amount)
          .field("category", "food")
          .field("etransfer_email", "exec@ubcpmc.com")
          .attach("receipt", Buffer.from("%PDF"), {
            filename: "r.pdf",
            contentType: "application/pdf",
          })
          .expect(400);
        expect(reimbursements.submit).not.toHaveBeenCalled();
      },
    );

    it("reviews a request as the signed-in exec", async () => {
      reimbursements.review.mockResolvedValue({ id: REQUEST_ID });
      await asExec(
        request(app).patch(`/api/v2/admin/reimbursements/${REQUEST_ID}`),
      )
        .send({ status: "approved", reviewer_note: " Looks good " })
        .expect(200, { id: REQUEST_ID });
      expect(reimbursements.review).toHaveBeenCalledWith(
        REQUEST_ID,
        "approved",
        "u1",
        "Looks good",
      );
    });

    it("rejects review statuses that aren't decisions", async () => {
      await asExec(
        request(app).patch(`/api/v2/admin/reimbursements/${REQUEST_ID}`),
      )
        .send({ status: "submitted" })
        .expect(400);
      expect(reimbursements.review).not.toHaveBeenCalled();
    });

    it("keeps reimbursements behind admin auth", async () => {
      await request(app).get("/api/v2/admin/reimbursements").expect(401);
      await request(app)
        .get("/api/v2/admin/reimbursements")
        .set("Authorization", "Bearer outsider-token")
        .expect(403);
      expect(reimbursements.listForUser).not.toHaveBeenCalled();
    });
  });
});
