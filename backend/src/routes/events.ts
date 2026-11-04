import { Router } from "express";
import { z } from "zod";

import type { ApplicantStore } from "../lib/applicants.js";
import { HttpError, notImplemented } from "../lib/http-error.js";

const applicantParamsSchema = z.object({
  eventId: z.guid(),
  attendeeId: z.guid(),
});
const eventParamsSchema = z.object({ eventId: z.guid() });
const decisionSchema = z.object({ status: z.enum(["ACCEPTED", "REJECTED"]) });

export function createEventsRouter(applicants: ApplicantStore) {
  const router = Router();

  router.get("/basic", () => {
    throw notImplemented();
  });

  router.post("/add", () => {
    throw notImplemented();
  });

  // Listed before /:eventId so "review" isn't read as an event id.
  router.get("/review", async (_req, res) => {
    res.json(await applicants.listReviewEvents());
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

  router.get("/:eventId/applicants", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    res.json(await applicants.listApplicants(eventId));
  });

  router.patch("/:eventId/applicants/:attendeeId", async (req, res) => {
    const { eventId, attendeeId } = applicantParamsSchema.parse(req.params);
    const { status } = decisionSchema.parse(req.body);
    const reviewer = res.locals.user?.email;
    if (!reviewer) {
      throw new HttpError(401, "UNAUTHORIZED", "Missing reviewer");
    }
    res.json(await applicants.decide(eventId, attendeeId, status, reviewer));
  });

  return router;
}
