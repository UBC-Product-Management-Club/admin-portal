import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { HttpError } from "./http-error.js";

export type ApplicantDecision = "ACCEPTED" | "REJECTED";

type ApplicantAnswer = {
  id: string;
  label: string;
  type: string;
  value: string | null;
};

export type Applicant = {
  attendee_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  answers: ApplicantAnswer[];
};

export type ReviewEvent = {
  event_id: string;
  name: string;
  registration_opens: string | null;
  registration_closes: string | null;
};

export type ApplicantList = ReviewEvent & { applicants: Applicant[] };

export type ApplicantStore = {
  listReviewEvents(): Promise<ReviewEvent[]>;
  listApplicants(eventId: string): Promise<ApplicantList>;
  decide(
    eventId: string,
    attendeeId: string,
    decision: ApplicantDecision,
    reviewer: string,
  ): Promise<Applicant>;
};

const REVIEWABLE_STATUSES = ["APPLIED", "ACCEPTED", "REJECTED", "REGISTERED"];
const RESUME_LINK_SECONDS = 60 * 60;
// Postgres code for an error raised on purpose inside a database function.
const RAISED_BY_FUNCTION = "P0001";

const REVIEW_EVENT_COLUMNS =
  "event_id,name,registration_opens,registration_closes";
const ATTENDEE_COLUMNS =
  "attendee_id,status,created_at,reviewed_by,reviewed_at,event_form_answers,User(first_name,last_name,email)";

const reviewEventSchema = z.object({
  event_id: z.string(),
  name: z.string(),
  registration_opens: z.string().nullable(),
  registration_closes: z.string().nullable(),
});

const questionsSchema = z.object({
  questions: z.array(
    z.object({ id: z.string(), type: z.string(), label: z.string() }),
  ),
});

const attendeeSchema = z.object({
  attendee_id: z.string(),
  status: z.string(),
  created_at: z.string(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  event_form_answers: z.record(z.string(), z.unknown()).nullable(),
  User: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
  }),
});

type Question = z.infer<typeof questionsSchema>["questions"][number];
type AttendeeRow = z.infer<typeof attendeeSchema>;

/** Reads applicants for review, and applies decisions through the database's own functions. */
export function createApplicantStore(
  db: SupabaseClient,
  attendeeBucket: string,
): ApplicantStore {
  async function getQuestions(eventId: string) {
    const { data, error } = await db
      .from("Event")
      .select(`${REVIEW_EVENT_COLUMNS},event_form_questions`)
      .eq("event_id", eventId)
      .eq("needs_review", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "NOT_FOUND", "Event not found");
    return {
      event: reviewEventSchema.parse(data),
      // Some older events store a different shape; their answers still show.
      questions:
        questionsSchema.safeParse(data.event_form_questions).data?.questions ??
        [],
    };
  }

  async function getAttendee(eventId: string, attendeeId: string) {
    const { data, error } = await db
      .from("Attendee")
      .select(ATTENDEE_COLUMNS)
      .eq("event_id", eventId)
      .eq("attendee_id", attendeeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "NOT_FOUND", "Applicant not found");
    return attendeeSchema.parse(data);
  }

  /** Resumes are in a private bucket, so reviewers get short-lived links. */
  async function signFiles(rows: AttendeeRow[], questions: Question[]) {
    const fileIds = questions.filter((q) => q.type === "file").map((q) => q.id);
    const paths = rows.flatMap((row) =>
      fileIds
        .map((id) => row.event_form_answers?.[id])
        .filter((path): path is string => typeof path === "string"),
    );
    if (paths.length === 0) return new Map<string, string>();

    const { data, error } = await db.storage
      .from(attendeeBucket)
      .createSignedUrls(paths, RESUME_LINK_SECONDS);
    if (error) throw error;
    return new Map(
      data.flatMap(({ path, signedUrl }) =>
        path && signedUrl ? [[path, signedUrl]] : [],
      ),
    );
  }

  return {
    async listReviewEvents() {
      const { data, error } = await db
        .from("Event")
        .select(REVIEW_EVENT_COLUMNS)
        .eq("needs_review", true)
        .order("registration_opens", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return z.array(reviewEventSchema).parse(data);
    },

    async listApplicants(eventId) {
      const { event, questions } = await getQuestions(eventId);
      const { data, error } = await db
        .from("Attendee")
        .select(ATTENDEE_COLUMNS)
        .eq("event_id", eventId)
        .in("status", REVIEWABLE_STATUSES)
        .order("created_at");
      if (error) throw error;

      const rows = z.array(attendeeSchema).parse(data);
      const signedUrls = await signFiles(rows, questions);
      return {
        ...event,
        applicants: rows.map((row) => toApplicant(row, questions, signedUrls)),
      };
    },

    async decide(eventId, attendeeId, decision, reviewer) {
      const { questions } = await getQuestions(eventId);
      const attendee = await getAttendee(eventId, attendeeId);
      if (attendee.status !== "APPLIED") {
        throw new HttpError(
          409,
          "ALREADY_DECIDED",
          "This applicant has already been reviewed",
        );
      }

      const { error } = await db.rpc(
        decision === "ACCEPTED" ? "accept_applicants" : "reject_applicants",
        {
          p_event_id: eventId,
          p_attendee_ids: [attendeeId],
          p_reviewer: reviewer,
        },
      );
      if (error?.code === RAISED_BY_FUNCTION) {
        throw new HttpError(409, "DECISION_REFUSED", error.message);
      }
      if (error) throw error;

      // Report what the database now holds, not what we asked for.
      const updated = await getAttendee(eventId, attendeeId);
      if (updated.status !== decision) {
        throw new HttpError(
          409,
          "DECISION_NOT_APPLIED",
          "The decision wasn't saved. Refresh and try again.",
        );
      }
      const signedUrls = await signFiles([updated], questions);
      return toApplicant(updated, questions, signedUrls);
    },
  };
}

function toApplicant(
  row: AttendeeRow,
  questions: Question[],
  signedUrls: Map<string, string>,
): Applicant {
  const answers = row.event_form_answers ?? {};
  const askedIds = new Set(questions.map((q) => q.id));
  const unlisted = Object.keys(answers)
    .filter((key) => !askedIds.has(key) && key !== "name" && key !== "email")
    .map((key) => ({ id: key, type: "short-answer", label: key }));

  return {
    attendee_id: row.attendee_id,
    name:
      textOf(answers.name) ?? `${row.User.first_name} ${row.User.last_name}`,
    email: textOf(answers.email) ?? row.User.email,
    status: row.status,
    created_at: row.created_at,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    answers: [...questions, ...unlisted].map(({ id, label, type }) => {
      const answer = answers[id];
      return {
        id,
        label,
        type,
        value:
          type === "file"
            ? (signedUrls.get(String(answer)) ?? null)
            : textOf(answer),
      };
    }),
  };
}

function textOf(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}
