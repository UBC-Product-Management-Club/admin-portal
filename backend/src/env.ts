import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  ORIGIN: z.url(),
  ADMIN_PORTAL_ORIGIN: z.url().optional(),
  SUPABASE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET_NAME: z.string().default("event-media"),
  SUPABASE_DELIVERABLES_BUCKET_NAME: z.string().default("deliverables"),
  SUPABASE_ATTENDEE_BUCKET_NAME: z.string().default("attendee-files"),
  ADMIN_EMAIL_DOMAINS: z
    .string()
    .min(1, "Set ADMIN_EMAIL_DOMAINS so only PMC emails can use the admin API")
    .transform((s) =>
      s
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
