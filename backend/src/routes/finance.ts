import { Router } from "express";
import { z } from "zod";

import {
  financeStatusInputSchema,
  financeCategoryInputSchema,
  financeInstructionInputSchema,
  type ReimbursementStore,
} from "../lib/reimbursements.js";

/**
 * Phase 0 capability probe. The Finance dashboard and settings routes are
 * added in later phases, but the frontend can already discover the signed-in
 * account's Finance role without exposing any reimbursement data.
 */
const reimbursementParams = z.object({ reimbursementId: z.string().uuid() });
const categoryParams = z.object({ categoryId: z.string().uuid() });
const filtersSchema = z.object({
  status: z.enum(["pending", "in_transit", "complete", "needs_changes", "rejected"]).optional(),
  department_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
});

export function createFinanceRouter(reimbursements: ReimbursementStore) {
  const router = Router();
  router.get("/access", (_req, res) => res.json({ role: res.locals.financeRole }));
  router.get("/settings", async (_req, res) => {
    res.json(await reimbursements.getFormConfig());
  });
  router.put("/settings/instructions", async (req, res) => {
    res.json(
      await reimbursements.updateFinanceInstructions(
        res.locals.user!.id,
        financeInstructionInputSchema.parse(req.body),
      ),
    );
  });
  router.post("/settings/categories", async (req, res) => {
    res.status(201).json(
      await reimbursements.createFinanceCategory(
        financeCategoryInputSchema.parse(req.body),
      ),
    );
  });
  router.patch("/settings/categories/:categoryId/archive", async (req, res) => {
    const { categoryId } = categoryParams.parse(req.params);
    await reimbursements.archiveFinanceCategory(categoryId);
    res.status(204).end();
  });
  router.get("/reimbursements", async (req, res) => {
    const filters = filtersSchema.parse(req.query);
    res.json(
      await reimbursements.listForFinance({
        status: filters.status,
        departmentId: filters.department_id,
        eventId: filters.event_id,
      }),
    );
  });
  router.get("/reimbursements/:reimbursementId", async (req, res) => {
    const { reimbursementId } = reimbursementParams.parse(req.params);
    res.json(await reimbursements.getForFinance(reimbursementId));
  });
  router.patch("/reimbursements/:reimbursementId/status", async (req, res) => {
    const { reimbursementId } = reimbursementParams.parse(req.params);
    res.json(
      await reimbursements.updateFinanceStatus(
        reimbursementId,
        res.locals.user!.id,
        financeStatusInputSchema.parse(req.body),
      ),
    );
  });
  return router;
}
