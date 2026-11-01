import { Router } from "express";

import { notImplemented } from "../lib/http-error.js";

export const router = Router();

router.get("/", () => {
  throw notImplemented();
});

router.post("/", () => {
  throw notImplemented();
});

router.patch("/:id", () => {
  throw notImplemented();
});
