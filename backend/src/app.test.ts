import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import type { VerifyToken } from "./lib/supabase.js";

const users: Record<string, { id: string; email: string }> = {
  "exec-token": { id: "u1", email: "exec@ubcpmc.com" },
  "outsider-token": { id: "u2", email: "someone@gmail.com" },
};
const verifyToken: VerifyToken = async (token) => users[token] ?? null;

const app = createApp({
  corsOrigins: ["http://localhost:5173"],
  adminEmailDomains: ["ubcpmc.com"],
  verifyToken,
});

describe("admin API", () => {
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
});
