import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { HttpError } from "./http-error.js";

export type TeamPerson = {
  attendee_id: string;
  name: string;
  email: string;
  // REGISTERED has confirmed their spot; ACCEPTED was let in but hasn't yet.
  status: string;
};

export type EventTeam = {
  team_id: string;
  team_name: string;
  team_code: string;
  members: TeamPerson[];
};

export type TeamList = {
  event_id: string;
  name: string;
  min_team_size: number;
  max_team_size: number;
  roster_locks_at: string | null;
  teams: EventTeam[];
  // Attendees holding a seat who aren't on any team yet.
  unassigned: TeamPerson[];
};

export type TeamStore = {
  listTeams(eventId: string): Promise<TeamList>;
  setRosterLock(eventId: string, locksAt: string | null): Promise<TeamList>;
  createTeam(
    eventId: string,
    teamName: string,
    attendeeIds: string[],
  ): Promise<TeamList>;
  renameTeam(
    eventId: string,
    teamId: string,
    teamName: string,
  ): Promise<TeamList>;
  addMember(
    eventId: string,
    teamId: string,
    attendeeId: string,
  ): Promise<TeamList>;
  removeMember(
    eventId: string,
    teamId: string,
    attendeeId: string,
  ): Promise<TeamList>;
};

// Matches the attendee list: everyone holding a seat can be put on a team.
const GOING_STATUSES = ["ACCEPTED", "REGISTERED"];

const UNIQUE_VIOLATION = "23505";

const eventSchema = z.object({
  event_id: z.string(),
  name: z.string(),
  min_team_size: z.number(),
  max_team_size: z.number(),
  roster_locks_at: z.string().nullable(),
});

const userSchema = z
  .object({ first_name: z.string(), last_name: z.string(), email: z.string() })
  .nullable();

const teamSchema = z.object({
  team_id: z.string(),
  team_name: z.string().nullable(),
  team_code: z.string().nullable(),
  Team_Member: z.array(
    z.object({
      Attendee: z
        .object({
          attendee_id: z.string(),
          status: z.string(),
          User: userSchema,
        })
        .nullable(),
    }),
  ),
});

const attendeeSchema = z.object({
  attendee_id: z.string(),
  status: z.string(),
  User: userSchema,
});

/** Reads and edits an event's teams. Execs can edit after the roster locks. */
export function createTeamStore(db: SupabaseClient): TeamStore {
  async function listTeams(eventId: string): Promise<TeamList> {
    const [event, teams, attendees] = await Promise.all([
      db
        .from("Event")
        .select("event_id,name,min_team_size,max_team_size,roster_locks_at")
        .eq("event_id", eventId)
        .maybeSingle(),
      db
        .from("Team")
        .select(
          "team_id,team_name,team_code,Team_Member(Attendee(attendee_id,status,User(first_name,last_name,email)))",
        )
        .eq("event_id", eventId)
        .order("team_name"),
      db
        .from("Attendee")
        .select("attendee_id,status,User(first_name,last_name,email)")
        .eq("event_id", eventId)
        .in("status", GOING_STATUSES)
        .order("created_at"),
    ]);
    if (event.error) throw event.error;
    if (teams.error) throw teams.error;
    if (attendees.error) throw attendees.error;
    if (!event.data) throw new HttpError(404, "NOT_FOUND", "Event not found");

    const parsedTeams = z
      .array(teamSchema)
      .parse(teams.data)
      .map((team) => ({
        team_id: team.team_id,
        team_name: team.team_name ?? "Unnamed team",
        team_code: team.team_code ?? "",
        members: team.Team_Member.flatMap(({ Attendee }) =>
          Attendee ? [toPerson(Attendee)] : [],
        ),
      }));
    const onTeam = new Set(
      parsedTeams.flatMap((team) => team.members.map((m) => m.attendee_id)),
    );

    return {
      ...eventSchema.parse(event.data),
      teams: parsedTeams,
      unassigned: z
        .array(attendeeSchema)
        .parse(attendees.data)
        .filter((attendee) => !onTeam.has(attendee.attendee_id))
        .map(toPerson),
    };
  }

  async function requireTeam(eventId: string, teamId: string) {
    const { data, error } = await db
      .from("Team")
      .select("team_id")
      .eq("event_id", eventId)
      .eq("team_id", teamId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "NOT_FOUND", "Team not found");
  }

  async function requireAttendee(eventId: string, attendeeId: string) {
    const { data, error } = await db
      .from("Attendee")
      .select("attendee_id")
      .eq("event_id", eventId)
      .eq("attendee_id", attendeeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "NOT_FOUND", "Attendee not found");
  }

  return {
    listTeams,

    async setRosterLock(eventId, locksAt) {
      const { data, error } = await db
        .from("Event")
        .update({ roster_locks_at: locksAt })
        .eq("event_id", eventId)
        .select("event_id");
      if (error) throw error;
      if (data.length === 0) {
        throw new HttpError(404, "NOT_FOUND", "Event not found");
      }
      return listTeams(eventId);
    },

    async createTeam(eventId, teamName, attendeeIds) {
      await Promise.all(attendeeIds.map((id) => requireAttendee(eventId, id)));
      // The database function also generates the team's join code. New teams
      // are built from unassigned attendees; moving someone is addMember.
      const { error } = await db.rpc("create_team_with_members", {
        p_event_id: eventId,
        p_team_name: teamName,
        p_member_attendee_ids: attendeeIds,
      });
      if (error) throw friendlyTeamError(error);
      return listTeams(eventId);
    },

    async renameTeam(eventId, teamId, teamName) {
      await requireTeam(eventId, teamId);
      const { error } = await db
        .from("Team")
        .update({ team_name: teamName })
        .eq("team_id", teamId);
      if (error) throw friendlyTeamError(error);
      return listTeams(eventId);
    },

    async addMember(eventId, teamId, attendeeId) {
      await Promise.all([
        requireTeam(eventId, teamId),
        requireAttendee(eventId, attendeeId),
      ]);
      // An attendee row belongs to one event, so this only touches its teams.
      const { data: previous, error: removeError } = await db
        .from("Team_Member")
        .delete()
        .eq("attendee_id", attendeeId)
        .select("team_id,attendee_id");
      if (removeError) throw removeError;

      const { error } = await db
        .from("Team_Member")
        .insert({ team_id: teamId, attendee_id: attendeeId });
      if (error) {
        // Put them back where they were rather than leave them teamless.
        if (previous.length > 0) {
          await db.from("Team_Member").insert(previous);
        }
        throw error;
      }
      return listTeams(eventId);
    },

    async removeMember(eventId, teamId, attendeeId) {
      await requireTeam(eventId, teamId);
      const { error } = await db
        .from("Team_Member")
        .delete()
        .eq("team_id", teamId)
        .eq("attendee_id", attendeeId);
      if (error) throw error;
      return listTeams(eventId);
    },
  };
}

function toPerson({
  attendee_id,
  status,
  User,
}: z.infer<typeof attendeeSchema>): TeamPerson {
  return {
    attendee_id,
    name: User ? `${User.first_name} ${User.last_name}` : "Unknown attendee",
    email: User?.email ?? "",
    status,
  };
}

function friendlyTeamError(error: { code?: string; message: string }) {
  if (error.code === UNIQUE_VIOLATION) {
    return new HttpError(
      409,
      "TEAM_NAME_TAKEN",
      "Another team at this event already has that name",
    );
  }
  return error;
}
