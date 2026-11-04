import { Router } from "express";

import { notImplemented } from "../lib/http-error.js";
import type { UserStore } from "../lib/users.js";

export function createUsersRouter(users: UserStore) {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await users.listUsers());
  });

  router.get("/:userId", () => {
    throw notImplemented();
  });

  return router;
}
