import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createApplicantStore } from "./lib/applicants.js";
import { createEventStore } from "./lib/events.js";
import { createReimbursementStore } from "./lib/reimbursements.js";
import { createSubmissionStore } from "./lib/submissions.js";
import { createAdminClient, createTokenVerifier } from "./lib/supabase.js";
import { createUserStore } from "./lib/users.js";

const env = loadEnv();

const db = createAdminClient(env);

const app = createApp({
  // Local portal dev server + deployed portal.
  corsOrigins: [env.ORIGIN, ...env.ADMIN_PORTAL_ORIGIN],
  adminEmailDomains: env.ADMIN_EMAIL_DOMAINS,
  financeOperatorEmails: env.FINANCE_OPERATOR_EMAILS,
  financeAdminEmails: env.FINANCE_ADMIN_EMAILS,
  verifyToken: createTokenVerifier(env),
  users: createUserStore(db),
  events: createEventStore(db),
  applicants: createApplicantStore(db, env.SUPABASE_ATTENDEE_BUCKET_NAME),
  reimbursements: createReimbursementStore(
    db,
    env.SUPABASE_REIMBURSEMENT_BUCKET_NAME,
  ),
  submissions: createSubmissionStore(db, env.SUPABASE_DELIVERABLES_BUCKET_NAME),
});

app.listen(env.PORT, () => {
  console.log(`Admin API listening on http://localhost:${env.PORT}`);
});
