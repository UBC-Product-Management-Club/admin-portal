import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Env } from "../env.js";

export type AuthUser = { id: string; email: string; emailConfirmed: boolean };

export type VerifyToken = (token: string) => Promise<AuthUser | null>;

/** Validates a Supabase access token by asking Supabase Auth who it belongs to. */
export function createTokenVerifier(env: Env): VerifyToken {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return async (token) => {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.email) return null;
    return {
      id: data.user.id,
      email: data.user.email,
      emailConfirmed: Boolean(data.user.email_confirmed_at),
    };
  };
}

/** Service-role client for database and storage access. Server-side only. */
export function createAdminClient(env: Env): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for database access",
    );
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
