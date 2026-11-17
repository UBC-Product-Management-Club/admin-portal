import { Router } from "express";

/**
 * Phase 0 capability probe. The Finance dashboard and settings routes are
 * added in later phases, but the frontend can already discover the signed-in
 * account's Finance role without exposing any reimbursement data.
 */
export const router = Router();

router.get("/access", (_req, res) => {
  res.json({ role: res.locals.financeRole });
});
