import { z } from 'zod/v4';

const Universities = [
    'University of British Columbia',
    'Simon Fraser University',
    'British Columbia Institute of Technology',
    'Other',
    "I'm not a university student",
] as const;

const years = ['1', '2', '3', '4', '5+'] as const;

const RawUser = z.object({
    user_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    display_name: z.string(),
    why_pm: z.string(),
    pronouns: z.string(),
    email: z.email(),
    pfp: z.url(),
    is_payment_verified: z.boolean(),
    university: z.enum(Universities).nullable(),
    faculty: z.string().nullable(),
    year: z.enum(years).nullable(),
    major: z.string().nullable(),
    student_id: z.string().nullable(),
});

const UserSchema = RawUser.transform((user) => ({
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    displayName: user.display_name,
    whyPm: user.why_pm,
    pronouns: user.pronouns,
    university: user.university ?? undefined,
    faculty: user.faculty ?? undefined,
    email: user.email,
    year: user.year ?? undefined,
    major: user.major ?? undefined,
    pfp: user.pfp,
    isPaymentVerified: user.is_payment_verified,
    studentId: user.student_id ?? undefined,
}));

const UsersSchema = z.array(UserSchema)

export interface User extends z.infer<typeof UserSchema> {}

export {
    Universities,
    years,
    UserSchema,
    UsersSchema,
};
