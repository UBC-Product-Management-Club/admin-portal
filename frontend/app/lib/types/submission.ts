import { z } from "zod";

export const submissionFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
});

export const teamSubmissionSchema = z
  .object({
    team_id: z.string(),
    team_name: z.string(),
    is_finalist: z.boolean(),
    members: z.array(z.object({ name: z.string(), email: z.string() })),
    submitted_at: z.string().nullable(),
    // Keyed by field id; files and multi-link answers hold several values.
    answers: z.record(z.string(), z.array(z.string())),
  })
  .transform((team) => ({
    teamId: team.team_id,
    teamName: team.team_name,
    isFinalist: team.is_finalist,
    members: team.members,
    submittedAt: team.submitted_at,
    answers: team.answers,
  }));

/** One event's teams and their latest project submissions (GET /events/:event_id/submissions). */
export const submissionListSchema = z
  .object({
    event_id: z.string(),
    name: z.string(),
    fields: z.array(submissionFieldSchema),
    teams: z.array(teamSubmissionSchema),
  })
  .transform((list) => ({
    eventId: list.event_id,
    name: list.name,
    fields: list.fields,
    teams: list.teams,
  }));

export type SubmissionField = z.output<typeof submissionFieldSchema>;
export type TeamSubmission = z.output<typeof teamSubmissionSchema>;
export type SubmissionList = z.output<typeof submissionListSchema>;
