import { Router } from "express";
import { z } from "zod";

import type { ApplicantStore } from "../lib/applicants.js";
import type { EventStore } from "../lib/events.js";
import { HttpError, notImplemented } from "../lib/http-error.js";
import type { SubmissionStore } from "../lib/submissions.js";
import type { TeamStore } from "../lib/teams.js";

const applicantParamsSchema = z.object({
  eventId: z.guid(),
  attendeeId: z.guid(),
});
const eventParamsSchema = z.object({ eventId: z.guid() });
const teamParamsSchema = z.object({ eventId: z.guid(), teamId: z.guid() });
const memberParamsSchema = teamParamsSchema.extend({ attendeeId: z.guid() });
const decisionSchema = z.object({ status: z.enum(["ACCEPTED", "REJECTED"]) });
const paymentDueSchema = z.object({
  payment_due_at: z.iso.datetime({ offset: true }),
});
const rosterLockSchema = z.object({
  roster_locks_at: z.iso.datetime({ offset: true }).nullable(),
});
const teamNameSchema = z.string().trim().min(1).max(60);
const newTeamSchema = z.object({
  team_name: teamNameSchema,
  attendee_ids: z.array(z.guid()).default([]),
});
const renameSchema = z.object({ team_name: teamNameSchema });

export function createEventsRouter(
  events: EventStore,
  applicants: ApplicantStore,
  submissions: SubmissionStore,
  teams: TeamStore,
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

  router.get("/:eventId/submissions", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    res.json(await submissions.listSubmissions(eventId));
  });

  router.get("/:eventId/teams", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    res.json(await teams.listTeams(eventId));
  });

  // Listed before /:eventId/teams/:teamId so "settings" isn't read as a team id.
  router.patch("/:eventId/teams/settings", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    const { roster_locks_at } = rosterLockSchema.parse(req.body);
    res.json(await teams.setRosterLock(eventId, roster_locks_at));
  });

  router.post("/:eventId/teams", async (req, res) => {
    const { eventId } = eventParamsSchema.parse(req.params);
    const { team_name, attendee_ids } = newTeamSchema.parse(req.body);
    res
      .status(201)
      .json(await teams.createTeam(eventId, team_name, attendee_ids));
  });

  router.patch("/:eventId/teams/:teamId", async (req, res) => {
    const { eventId, teamId } = teamParamsSchema.parse(req.params);
    const { team_name } = renameSchema.parse(req.body);
    res.json(await teams.renameTeam(eventId, teamId, team_name));
  });

  // Adding someone already on another team moves them.
  router.put(
    "/:eventId/teams/:teamId/members/:attendeeId",
    async (req, res) => {
      const { eventId, teamId, attendeeId } = memberParamsSchema.parse(
        req.params,
      );
      res.json(await teams.addMember(eventId, teamId, attendeeId));
    },
  );

  router.delete(
    "/:eventId/teams/:teamId/members/:attendeeId",
    async (req, res) => {
      const { eventId, teamId, attendeeId } = memberParamsSchema.parse(
        req.params,
      );
      res.json(await teams.removeMember(eventId, teamId, attendeeId));
    },
  );

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
