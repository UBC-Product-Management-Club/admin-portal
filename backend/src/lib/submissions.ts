import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { HttpError } from "./http-error.js";

export type SubmissionField = { id: string; label: string; type: string };

export type TeamSubmission = {
  team_id: string;
  team_name: string;
  is_finalist: boolean;
  members: { name: string; email: string }[];
  submitted_at: string | null;
  // Keyed by field id; a value can hold several links (e.g. uploaded files).
  answers: Record<string, string[]>;
};

export type SubmissionList = {
  event_id: string;
  name: string;
  fields: SubmissionField[];
  teams: TeamSubmission[];
};

export type SubmissionStore = {
  listSubmissions(eventId: string): Promise<SubmissionList>;
};

// Judges work from the exported CSV, so deck links have to outlast judging.
const FILE_LINK_SECONDS = 7 * 24 * 60 * 60;

const eventSchema = z.object({ event_id: z.string(), name: z.string() });

const phaseSchema = z.object({
  fields: z
    .array(z.object({ id: z.string(), label: z.string(), type: z.string() }))
    .nullable()
    .catch([]),
});

const teamSchema = z.object({
  team_id: z.string(),
  team_name: z.string().nullable(),
  is_finalist: z.boolean().nullable(),
  Team_Member: z.array(
    z.object({
      Attendee: z
        .object({
          User: z
            .object({
              first_name: z.string(),
              last_name: z.string(),
              email: z.string(),
            })
            .nullable(),
        })
        .nullable(),
    }),
  ),
});

const deliverableSchema = z.object({
  team_id: z.string().nullable(),
  submission: z.record(z.string(), z.unknown()).nullable(),
  submitted_at: z.string().nullable(),
  version: z.number().nullable(),
});

type Deliverable = z.infer<typeof deliverableSchema>;

/** Reads each team's latest project submission for an event. */
export function createSubmissionStore(
  db: SupabaseClient,
  deliverablesBucket: string,
): SubmissionStore {
  // Older submissions store "public" URLs into the bucket, which is private.
  const bucketUrl = new RegExp(
    `/storage/v1/object/(?:public|sign|authenticated)/${escapeRegExp(deliverablesBucket)}/([^?]+)`,
  );

  /** Where a stored value lives in the bucket, or null if it's elsewhere. */
  function storagePath(value: string, isFile: boolean) {
    const match = bucketUrl.exec(value);
    if (match) return decodeURIComponent(match[1]);
    return isFile && !/^https?:\/\//.test(value) ? value : null;
  }

  async function signFiles(paths: string[]) {
    if (paths.length === 0) return new Map<string, string>();
    const { data, error } = await db.storage
      .from(deliverablesBucket)
      .createSignedUrls([...new Set(paths)], FILE_LINK_SECONDS);
    if (error) throw error;
    return new Map(
      data.flatMap(({ path, signedUrl }) =>
        path && signedUrl ? [[path, signedUrl]] : [],
      ),
    );
  }

  return {
    async listSubmissions(eventId) {
      const [event, phases, teams, deliverables] = await Promise.all([
        db
          .from("Event")
          .select("event_id,name")
          .eq("event_id", eventId)
          .maybeSingle(),
        db
          .from("Deliverable_Flags")
          .select("fields")
          .eq("event_id", eventId)
          .eq("is_enabled", true),
        db
          .from("Team")
          .select(
            "team_id,team_name,is_finalist,Team_Member(Attendee(User(first_name,last_name,email)))",
          )
          .eq("event_id", eventId)
          .order("team_name"),
        db
          .from("Deliverable")
          .select("team_id,submission,submitted_at,version")
          .eq("event_id", eventId),
      ]);
      if (event.error) throw event.error;
      if (phases.error) throw phases.error;
      if (teams.error) throw teams.error;
      if (deliverables.error) throw deliverables.error;
      if (!event.data) throw new HttpError(404, "NOT_FOUND", "Event not found");

      const latest = latestPerTeam(
        z.array(deliverableSchema).parse(deliverables.data),
      );

      // The event's form first, then anything teams sent that it doesn't list.
      const fields = new Map<string, SubmissionField>();
      for (const phase of z.array(phaseSchema).parse(phases.data)) {
        for (const { id, label, type } of phase.fields ?? []) {
          if (!fields.has(id)) fields.set(id, { id, label, type });
        }
      }
      for (const { submission } of latest.values()) {
        for (const id of Object.keys(submission ?? {})) {
          if (!fields.has(id)) {
            fields.set(id, { id, label: id, type: "short-answer" });
          }
        }
      }

      const rawAnswers = new Map(
        [...latest].map(([teamId, deliverable]) => [
          teamId,
          Object.fromEntries(
            [...fields.values()].map((field) => [
              field.id,
              valuesOf(deliverable.submission?.[field.id]),
            ]),
          ),
        ]),
      );
      const isFile = (id: string) => fields.get(id)?.type === "file";
      const signedUrls = await signFiles(
        [...rawAnswers.values()].flatMap((answers) =>
          Object.entries(answers).flatMap(([id, values]) =>
            values.flatMap((v) => storagePath(v, isFile(id)) ?? []),
          ),
        ),
      );

      return {
        ...eventSchema.parse(event.data),
        fields: [...fields.values()],
        teams: z
          .array(teamSchema)
          .parse(teams.data)
          .map((team) => ({
            team_id: team.team_id,
            team_name: team.team_name ?? "Unnamed team",
            is_finalist: team.is_finalist ?? false,
            members: team.Team_Member.flatMap(({ Attendee }) =>
              Attendee?.User
                ? [
                    {
                      name: `${Attendee.User.first_name} ${Attendee.User.last_name}`,
                      email: Attendee.User.email,
                    },
                  ]
                : [],
            ),
            submitted_at: latest.get(team.team_id)?.submitted_at ?? null,
            answers: Object.fromEntries(
              Object.entries(rawAnswers.get(team.team_id) ?? {}).map(
                ([id, values]) => [
                  id,
                  values.flatMap((value) => {
                    const path = storagePath(value, isFile(id));
                    // A file that can't be signed is missing from storage.
                    if (path === null) return [value];
                    const signed = signedUrls.get(path);
                    return signed ? [signed] : [];
                  }),
                ],
              ),
            ),
          })),
      };
    },
  };
}

/** A team can resubmit; the highest version (then the newest) wins. */
function latestPerTeam(rows: Deliverable[]) {
  const latest = new Map<string, Deliverable>();
  for (const row of rows) {
    if (!row.team_id) continue;
    const current = latest.get(row.team_id);
    if (!current || compare(row, current) > 0) latest.set(row.team_id, row);
  }
  return latest;
}

function compare(a: Deliverable, b: Deliverable) {
  return (
    (a.version ?? 0) - (b.version ?? 0) ||
    (a.submitted_at ?? "").localeCompare(b.submitted_at ?? "")
  );
}

function valuesOf(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(valuesOf);
  return [typeof value === "string" ? value : JSON.stringify(value)];
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
