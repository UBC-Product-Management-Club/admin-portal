import type { RequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";
import type { AuthUser, VerifyToken } from "../lib/supabase.js";

declare module "express-serve-static-core" {
  interface Locals {
    user?: AuthUser;
  }
}

/** Every admin endpoint requires a valid Supabase JWT from a PMC email. */
export function requireAdmin(
  verifyToken: VerifyToken,
  adminEmailDomains: string[],
): RequestHandler {
  return async (req, res, next) => {
    const header = req.get("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      throw new HttpError(401, "UNAUTHORIZED", "Missing bearer token");
    }

    const user = await verifyToken(token);
    if (!user) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid or expired token");
    }

    const domain = user.email.split("@").pop()?.toLowerCase();
    if (!domain || !adminEmailDomains.includes(domain)) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Admin access requires a PMC email",
      );
    }

    res.locals.user = user;
    next();
  };
}
