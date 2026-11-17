import { z } from "zod";

const financeEmailList = z
  .string()
  .transform(parseEmailList)
  .pipe(
    z.array(z.email()).min(1, "Configure at least one Finance account email"),
  );

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
  SUPABASE_REIMBURSEMENT_BUCKET_NAME: z
    .string()
    .default("reimbursement-receipts"),
  ADMIN_EMAIL_DOMAINS: z
    .string()
    .min(1, "Set ADMIN_EMAIL_DOMAINS so only PMC emails can use the admin API")
    .transform((s) =>
      s
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
    ),
  // Finance accounts are deployment configuration, never source-code roles.
  FINANCE_OPERATOR_EMAILS: financeEmailList,
  FINANCE_ADMIN_EMAILS: financeEmailList,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}

function parseEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
