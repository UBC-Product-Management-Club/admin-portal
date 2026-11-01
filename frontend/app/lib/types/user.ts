import { z } from "zod";

export const UNIVERSITIES = ["UBC", "SFU", "BCIT", "Other"] as const;
export const STUDY_YEARS = ["1", "2", "3", "4", "5+"] as const;

export const userSchema = z
  .object({
    user_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    pronouns: z.string().nullable(),
    university: z.enum(UNIVERSITIES).nullable(),
    year: z.enum(STUDY_YEARS).nullable(),
    faculty: z.string().nullable(),
    major: z.string().nullable(),
    why_pm: z.string().nullable(),
    // Not in the HLD users table yet, but FR-5/FR-6 search and show it.
    student_id: z.string().nullable(),
    created_at: z.iso.datetime({ offset: true }),
  })
  .transform((user) => ({
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    pronouns: user.pronouns,
    university: user.university,
    year: user.year,
    faculty: user.faculty,
    major: user.major,
    whyPm: user.why_pm,
    studentId: user.student_id,
    createdAt: user.created_at,
  }));

export const userListSchema = z.array(userSchema);

export type User = z.output<typeof userSchema>;
export type University = (typeof UNIVERSITIES)[number];
export type StudyYear = (typeof STUDY_YEARS)[number];
