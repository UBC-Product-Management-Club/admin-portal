import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import { HttpError } from "./lib/http-error.js";
import type { ApplicantStore } from "./lib/applicants.js";
import type { AuthUser, VerifyToken } from "./lib/supabase.js";

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

const applicants = {
  listReviewEvents: vi.fn(),
  listApplicants: vi.fn(),
  decide: vi.fn(),
} satisfies ApplicantStore;

const EVENT_ID = "28ee870f-b0e1-45a8-a49d-d137a2700166";
const ATTENDEE_ID = "550e8400-e29b-41d4-a716-446655440000";
const APPLICANT_PATH = `/api/v2/admin/events/${EVENT_ID}/applicants/${ATTENDEE_ID}`;

const app = createApp({
  corsOrigins: ["http://localhost:5173"],
  adminEmailDomains: ["ubcpmc.com"],
  verifyToken,
  applicants,
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
      .get("/api/v2/admin/users")
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
});
