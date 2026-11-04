import cors from "cors";
import express from "express";

import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requireAdmin } from "./middleware/require-admin.js";
import type { ApplicantStore } from "./lib/applicants.js";
import type { EventStore } from "./lib/events.js";
import type { VerifyToken } from "./lib/supabase.js";
import type { UserStore } from "./lib/users.js";
import { router as budget } from "./routes/budget.js";
import { createEventsRouter } from "./routes/events.js";
import { router as reimbursements } from "./routes/reimbursements.js";
import { createUsersRouter } from "./routes/users.js";

type AppOptions = {
  corsOrigins: string[];
  adminEmailDomains: string[];
  verifyToken: VerifyToken;
  users: UserStore;
  events: EventStore;
  applicants: ApplicantStore;
};

export function createApp({
  corsOrigins,
  adminEmailDomains,
  verifyToken,
  users,
  events,
  applicants,
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
  admin.use("/reimbursements", reimbursements);
  admin.use("/budget", budget);
  app.use("/api/v2/admin", admin);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
