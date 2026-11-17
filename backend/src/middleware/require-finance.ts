import type { RequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";

export type FinanceRole = "operator" | "admin";

declare module "express-serve-static-core" {
  interface Locals {
    financeRole?: FinanceRole;
  }
}

/**
 * Finance routes are mounted after requireAdmin. A configured Finance admin
 * also has operator access; the current shared Finance account may therefore
 * run the MVP dashboard and configuration screens.
 */
export function requireFinance(
  operatorEmails: string[],
  adminEmails: string[],
  minimumRole: FinanceRole = "operator",
): RequestHandler {
  const operators = new Set(operatorEmails);
  const admins = new Set(adminEmails);

  return (_req, res, next) => {
    const email = res.locals.user?.email.toLowerCase();
    if (!email) {
      throw new HttpError(401, "UNAUTHORIZED", "Missing authenticated user");
    }

    const role: FinanceRole | undefined = admins.has(email)
      ? "admin"
      : operators.has(email)
        ? "operator"
        : undefined;
    if (!role || (minimumRole === "admin" && role !== "admin")) {
      throw new HttpError(
        403,
        "FINANCE_ACCESS_REQUIRED",
        "This action requires Finance access",
      );
    }

    res.locals.financeRole = role;
    next();
  };
}
