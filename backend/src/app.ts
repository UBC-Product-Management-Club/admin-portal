import cors from "cors";
import express from "express";

import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requireAdmin } from "./middleware/require-admin.js";
import { requireFinance } from "./middleware/require-finance.js";
import type { ApplicantStore } from "./lib/applicants.js";
import type { EventStore } from "./lib/events.js";
import type { ReimbursementStore } from "./lib/reimbursements.js";
import type { VerifyToken } from "./lib/supabase.js";
import type { UserStore } from "./lib/users.js";
import { router as budget } from "./routes/budget.js";
import { createEventsRouter } from "./routes/events.js";
import { createFinanceRouter } from "./routes/finance.js";
import { createReimbursementsRouter } from "./routes/reimbursements.js";
import { createUsersRouter } from "./routes/users.js";

type AppOptions = {
  corsOrigins: string[];
  adminEmailDomains: string[];
  financeOperatorEmails?: string[];
  financeAdminEmails?: string[];
  verifyToken: VerifyToken;
  users: UserStore;
  events: EventStore;
  applicants: ApplicantStore;
  reimbursements: ReimbursementStore;
};

export function createApp({
  corsOrigins,
  adminEmailDomains,
  financeOperatorEmails = [],
  financeAdminEmails = [],
  verifyToken,
  users,
  events,
  applicants,
  reimbursements,
}: AppOptions) {
  const app = express();
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const admin = express.Router();
  admin.use(requireAdmin(verifyToken, adminEmailDomains));
  admin.use("/users", createUsersRouter(users));
  admin.use("/events", createEventsRouter(events, applicants));
  admin.use("/reimbursements", createReimbursementsRouter(reimbursements));
  admin.use("/budget", budget);
  admin.use(
    "/finance",
    requireFinance(financeOperatorEmails, financeAdminEmails),
    createFinanceRouter(reimbursements),
  );
  app.use("/api/v2/admin", admin);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
