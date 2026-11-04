import cors from "cors";
import express from "express";

import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requireAdmin } from "./middleware/require-admin.js";
import type { ApplicantStore } from "./lib/applicants.js";
import type { VerifyToken } from "./lib/supabase.js";
import { router as budget } from "./routes/budget.js";
import { createEventsRouter } from "./routes/events.js";
import { router as reimbursements } from "./routes/reimbursements.js";
import { router as users } from "./routes/users.js";

type AppOptions = {
  corsOrigins: string[];
  adminEmailDomains: string[];
  verifyToken: VerifyToken;
  applicants: ApplicantStore;
};

export function createApp({
  corsOrigins,
  adminEmailDomains,
  verifyToken,
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
  admin.use("/users", users);
  admin.use("/events", createEventsRouter(applicants));
  admin.use("/reimbursements", reimbursements);
  admin.use("/budget", budget);
  app.use("/api/v2/admin", admin);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
