import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type Member = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  pronouns: string | null;
  university: string | null;
  year: string | null;
  faculty: string | null;
  major: string | null;
  why_pm: string | null;
  student_id: string | null;
  created_at: string | null;
};

export type UserStore = {
  listUsers(): Promise<Member[]>;
};

const USER_COLUMNS =
  "user_id,first_name,last_name,email,pronouns,university,year,faculty,major,why_pm,student_id";

// The sign-up form stores full names; the portal filters on these short ones.
const UNIVERSITY_CODES: Record<string, string> = {
  "University of British Columbia": "UBC",
  "Simon Fraser University": "SFU",
  "British Columbia Institute of Technology": "BCIT",
};
const OTHER_UNIVERSITY = "Other";
const STUDY_YEARS = new Set(["1", "2", "3", "4", "5+"]);

const userRowSchema = z.object({
  user_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  pronouns: z.string().nullable(),
  university: z.string().nullable(),
  year: z.string().nullable(),
  faculty: z.string().nullable(),
  major: z.string().nullable(),
  why_pm: z.string().nullable(),
  student_id: z.string().nullable(),
});

export function createUserStore(db: SupabaseClient): UserStore {
  return {
    async listUsers() {
      const { data, error } = await db
        .from("User")
        .select(USER_COLUMNS)
        .order("first_name");
      if (error) throw error;

      return z
        .array(userRowSchema)
        .parse(data)
        .map((user) => ({
          ...user,
          university:
            user.university &&
            (UNIVERSITY_CODES[user.university] ?? OTHER_UNIVERSITY),
          year: user.year && STUDY_YEARS.has(user.year) ? user.year : null,
          // User.created_at comes from migration 001.
          created_at: null,
        }));
    },
  };
}
