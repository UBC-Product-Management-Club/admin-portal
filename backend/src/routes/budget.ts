import { Router } from "express";

import { notImplemented } from "../lib/http-error.js";

export const router = Router();

router.get("/", () => {
  throw notImplemented();
});
