import { Router } from "express";
import { z } from "zod";

import type { ApplicantStore } from "../lib/applicants.js";
import type { EventStore } from "../lib/events.js";
import { HttpError, notImplemented } from "../lib/http-error.js";

const applicantParamsSchema = z.object({
  eventId: z.guid(),
  attendeeId: z.guid(),
});
const eventParamsSchema = z.object({ eventId: z.guid() });
const decisionSchema = z.object({ status: z.enum(["ACCEPTED", "REJECTED"]) });
const paymentDueSchema = z.object({
  payment_due_at: z.iso.datetime({ offset: true }),
});

export function createEventsRouter(
  events: EventStore,
  applicants: ApplicantStore,
) {
  const router = Router();

  router.get("/basic", async (_req, res) => {
    res.json(await events.listBasicEvents());
  });

  router.post("/add", () => {
    throw notImplemented();
  });

  // Listed before /:eventId so "review" isn't read as an event id.
  router.get("/review", async (_req, res) => {
    res.json(await applicants.listReviewEvents());
  });

  router.get("/:eventId", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    res.json(await events.getEvent(eventId));
  });

  router.patch("/:eventId", () => {
    throw notImplemented();
  });

  router.patch("/:eventId/thumbnail", () => {
    throw notImplemented();
  });

  router.get("/:eventId/attendees", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    res.json(await events.listAttendees(eventId));
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

  router.patch(
    "/:eventId/applicants/:attendeeId/payment-due",
    async (req, res) => {
      const { eventId, attendeeId } = applicantParamsSchema.parse(req.params);
      const { payment_due_at } = paymentDueSchema.parse(req.body);
      res.json(
        await applicants.setPaymentDue(eventId, attendeeId, payment_due_at),
      );
    },
  );

  return router;
}
