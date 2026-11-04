import { z } from "zod";

export const APPLICANT_STATUSES = [
  "APPLIED",
  "ACCEPTED",
  "REJECTED",
  "REGISTERED",
] as const;

/** Events that take applications (GET /events/review). */
export const reviewEventSchema = z
  .object({
    event_id: z.string(),
    name: z.string(),
    registration_opens: z.string().nullable(),
    registration_closes: z.string().nullable(),
  })
  .transform((event) => ({
    eventId: event.event_id,
    name: event.name,
    registrationOpens: event.registration_opens,
    registrationCloses: event.registration_closes,
  }));

export const reviewEventListSchema = z.array(reviewEventSchema);

export const applicantSchema = z
  .object({
    attendee_id: z.string(),
    name: z.string(),
    email: z.string(),
    status: z.enum(APPLICANT_STATUSES),
    created_at: z.string(),
    reviewed_by: z.string().nullable(),
    reviewed_at: z.string().nullable(),
    answers: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        value: z.string().nullable(),
      }),
    ),
  })
  .transform((applicant) => ({
    attendeeId: applicant.attendee_id,
    name: applicant.name,
    email: applicant.email,
    status: applicant.status,
    appliedAt: applicant.created_at,
    reviewedBy: applicant.reviewed_by,
    reviewedAt: applicant.reviewed_at,
    answers: applicant.answers,
  }));

/** One event's applicants (GET /events/:event_id/applicants). */
export const applicantListSchema = z
  .object({
    event_id: z.string(),
    name: z.string(),
    applicants: z.array(applicantSchema),
  })
  .transform((list) => ({
    eventId: list.event_id,
    name: list.name,
    applicants: list.applicants,
  }));

export type ReviewEvent = z.output<typeof reviewEventSchema>;
export type Applicant = z.output<typeof applicantSchema>;
export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];
export type ApplicantDecision = "ACCEPTED" | "REJECTED";
