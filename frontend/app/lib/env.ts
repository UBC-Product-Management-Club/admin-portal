import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url(),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLIC_KEY: z.string().min(1),
  // Serve dev data from MockClient instead of the backend.
  VITE_USE_MOCKS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // Dev only: skip Supabase login and use a placeholder exec (see lib/session.ts).
  VITE_SKIP_AUTH: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Parsed lazily so the SPA build (which prerenders index.html) doesn't need secrets.
export function getEnv(): Env {
  cached ??= envSchema.parse(import.meta.env);
  return cached;
}
