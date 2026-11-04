import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { createTokenVerifier } from "./supabase.js";

const getUser = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

const verifyToken = createTokenVerifier({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
} as Env);

describe("createTokenVerifier", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("marks users with a confirmation time as confirmed", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "exec@ubcpmc.com",
          email_confirmed_at: "2026-10-01T00:00:00Z",
        },
      },
      error: null,
    });

    await expect(verifyToken("token")).resolves.toEqual({
      id: "u1",
      email: "exec@ubcpmc.com",
      emailConfirmed: true,
    });
  });

  it("marks users without a confirmation time as unconfirmed", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u2", email: "fake@ubcpmc.com" } },
      error: null,
    });

    const user = await verifyToken("token");
    expect(user?.emailConfirmed).toBe(false);
  });

  it("returns null when Supabase rejects the token", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid JWT"),
    });

    await expect(verifyToken("token")).resolves.toBeNull();
  });
});
