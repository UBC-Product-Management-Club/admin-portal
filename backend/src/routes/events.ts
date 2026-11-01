import { Router } from "express";

import { notImplemented } from "../lib/http-error.js";

export const router = Router();

router.get("/basic", () => {
  throw notImplemented();
});

router.post("/add", () => {
  throw notImplemented();
});

router.get("/:eventId", () => {
  throw notImplemented();
});

router.patch("/:eventId", () => {
  throw notImplemented();
});

router.patch("/:eventId/thumbnail", () => {
  throw notImplemented();
});

router.get("/:eventId/attendees", () => {
  throw notImplemented();
});

router.get("/:eventId/applicants", () => {
  throw notImplemented();
});
