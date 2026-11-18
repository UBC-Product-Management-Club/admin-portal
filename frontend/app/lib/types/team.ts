import { z } from "zod";

export const teamPersonSchema = z
  .object({ attendee_id: z.string(), name: z.string(), email: z.string() })
  .transform((person) => ({
    attendeeId: person.attendee_id,
    name: person.name,
    email: person.email,
  }));

export const eventTeamSchema = z
  .object({
    team_id: z.string(),
    team_name: z.string(),
    team_code: z.string(),
    members: z.array(teamPersonSchema),
  })
  .transform((team) => ({
    teamId: team.team_id,
    teamName: team.team_name,
    teamCode: team.team_code,
    members: team.members,
  }));

/** One event's teams and who isn't on one yet (GET /events/:event_id/teams). */
export const teamListSchema = z
  .object({
    event_id: z.string(),
    name: z.string(),
    min_team_size: z.number(),
    max_team_size: z.number(),
    roster_locks_at: z.string().nullable(),
    teams: z.array(eventTeamSchema),
    unassigned: z.array(teamPersonSchema),
  })
  .transform((list) => ({
    eventId: list.event_id,
    name: list.name,
    minTeamSize: list.min_team_size,
    maxTeamSize: list.max_team_size,
    rosterLocksAt: list.roster_locks_at,
    teams: list.teams,
    unassigned: list.unassigned,
  }));

export type TeamPerson = z.output<typeof teamPersonSchema>;
export type EventTeam = z.output<typeof eventTeamSchema>;
export type TeamList = z.output<typeof teamListSchema>;
