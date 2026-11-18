import { describe, expect, it } from "vitest";

import { loadEnv } from "./env.js";

const baseEnv = {
  ORIGIN: "http://localhost:5173",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  ADMIN_EMAIL_DOMAINS: "ubcpmc.com",
};

describe("loadEnv", () => {
  it("requires configured Finance account emails", () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        FINANCE_OPERATOR_EMAILS: "",
        FINANCE_ADMIN_EMAILS: "",
      }),
    ).toThrow("Configure at least one Finance account email");
  });

  it("parses Finance account lists from deployment configuration", () => {
    const env = loadEnv({
      ...baseEnv,
      FINANCE_OPERATOR_EMAILS: "finance-operator@ubcpmc.com",
      FINANCE_ADMIN_EMAILS: "finance-admin@ubcpmc.com, finance-lead@ubcpmc.com",
    });

    expect(env.FINANCE_OPERATOR_EMAILS).toEqual([
      "finance-operator@ubcpmc.com",
    ]);
    expect(env.FINANCE_ADMIN_EMAILS).toEqual([
      "finance-admin@ubcpmc.com",
      "finance-lead@ubcpmc.com",
    ]);
  });
});
