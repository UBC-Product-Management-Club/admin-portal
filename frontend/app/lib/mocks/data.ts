import type { z } from "zod";

import type { applicantSchema, reviewEventSchema } from "~/lib/types/applicant";
import type { attendeeSchema } from "~/lib/types/attendee";
import type { eventSchema } from "~/lib/types/event";
import type { reimbursementSchema } from "~/lib/types/reimbursement";
import type { StudyYear, University, userSchema } from "~/lib/types/user";

/**
 * Demo seed data shaped like backend responses (snake_case), following HLD 4.4:
 * 30 members, 8 events over two school years, registrations for 3 events and
 * 6 reimbursements covering every status. Dev only — never real member data.
 */

export type RawUser = z.input<typeof userSchema>;
export type RawEvent = Omit<z.input<typeof eventSchema>, "registered_count">;
export type RawRegistration = Omit<
  z.input<typeof attendeeSchema>,
  "first_name" | "last_name" | "email"
> & { event_id: string };
export type RawReimbursement = z.input<typeof reimbursementSchema>;

export const MOCK_CURRENT_USER_ID = "user-01";

const FIRST_NAMES = [
  "Ava",
  "Liam",
  "Maya",
  "Noah",
  "Priya",
  "Ethan",
  "Chloe",
  "Arjun",
  "Sofia",
  "Lucas",
  "Hana",
  "Mateo",
  "Zoe",
  "Daniel",
  "Aisha",
  "Owen",
  "Mei",
  "Jonah",
  "Leila",
  "Ryan",
  "Nina",
  "Kai",
  "Isla",
  "Omar",
  "Grace",
  "Felix",
  "Tara",
  "Evan",
  "Julia",
  "Sam",
];
const LAST_NAMES = [
  "Chen",
  "Patel",
  "Nguyen",
  "Singh",
  "Kim",
  "Wong",
  "Garcia",
  "Lee",
  "Brown",
  "Tran",
  "Ali",
  "Martin",
  "Park",
  "Wilson",
  "Khan",
  "Lam",
  "Ito",
  "Hughes",
  "Rossi",
  "Zhang",
];
const UNIVERSITY_CYCLE: University[] = [
  "UBC",
  "UBC",
  "UBC",
  "SFU",
  "UBC",
  "BCIT",
  "UBC",
  "SFU",
  "Other",
  "UBC",
];
const YEAR_CYCLE: StudyYear[] = [
  "1",
  "2",
  "3",
  "4",
  "2",
  "3",
  "5+",
  "1",
  "2",
  "3",
];
const PROGRAMS: [string, string][] = [
  ["Sauder", "Commerce"],
  ["Science", "Computer Science"],
  ["Arts", "Economics"],
  ["Applied Science", "Engineering"],
  ["Science", "Cognitive Systems"],
  ["Sauder", "BUCS"],
  ["Beedie", "Business"],
  ["Computing", "CST"],
];
const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they"];
const WHY_PM = [
  "I like working at the intersection of design, business and engineering.",
  "I want to learn how great products get built and shipped.",
  "PM sounds like the best way to turn customer problems into real solutions.",
  "I led a hackathon team and loved prioritizing what to build.",
];

export const mockUsers: RawUser[] = FIRST_NAMES.map((firstName, i) => {
  const [faculty, major] = PROGRAMS[i % PROGRAMS.length];
  const joinedThisYear = i % 3 !== 0;
  const month = String((i % 2) + 9).padStart(2, "0");
  return {
    user_id: `user-${String(i + 1).padStart(2, "0")}`,
    first_name: firstName,
    last_name: LAST_NAMES[i % LAST_NAMES.length],
    email: `${firstName.toLowerCase()}.${LAST_NAMES[i % LAST_NAMES.length].toLowerCase()}@student.example.ca`,
    pronouns: PRONOUNS[i % PRONOUNS.length],
    university: UNIVERSITY_CYCLE[i % UNIVERSITY_CYCLE.length],
    year: YEAR_CYCLE[i % YEAR_CYCLE.length],
    faculty,
    major,
    why_pm: WHY_PM[i % WHY_PM.length],
    student_id: String(10_000_000 + i * 7_919),
    created_at: `${joinedThisYear ? 2026 : 2025}-${month}-${String((i % 27) + 1).padStart(2, "0")}T18:00:00Z`,
  };
});

export const mockEvents: RawEvent[] = [
  {
    event_id: "evt-01",
    name: "Industry Speaker Panel",
    type: "speaker_panel",
    start_time: "2025-11-12T01:00:00Z",
    end_time: "2025-11-12T03:00:00Z",
    location: "Henry Angus 098",
    description:
      "PMs from local tech companies share how they got their start.",
    max_attendees: 120,
    is_disabled: false,
    tracks: ["rsvp", "food"],
    submissions_open_at: null,
    submissions_close_at: null,
    thumbnail_url: null,
    member_price: null,
    non_member_price: null,
  },
  {
    event_id: "evt-02",
    name: "Winter Case Competition",
    type: "case_competition",
    start_time: "2026-02-21T17:00:00Z",
    end_time: "2026-02-22T01:00:00Z",
    location: "Sauder Atrium",
    description: "Teams pitch a product strategy to a panel of judges.",
    max_attendees: 80,
    is_disabled: false,
    tracks: ["rsvp", "payment", "food"],
    submissions_open_at: "2026-02-01T08:00:00Z",
    submissions_close_at: "2026-02-20T08:00:00Z",
    thumbnail_url: null,
    member_price: 5,
    non_member_price: 10,
  },
  {
    event_id: "evt-03",
    name: "Fall Kickoff Social",
    type: "social",
    start_time: "2026-09-18T00:00:00Z",
    end_time: "2026-09-18T03:00:00Z",
    location: "AMS Nest, Room 2306",
    description: "Meet the exec team and other members to start the year.",
    max_attendees: 150,
    is_disabled: false,
    tracks: ["rsvp", "food"],
    submissions_open_at: null,
    submissions_close_at: null,
    thumbnail_url: null,
    member_price: null,
    non_member_price: null,
  },
  {
    event_id: "evt-04",
    name: "Product Teardown Workshop",
    type: "workshop",
    start_time: "2026-10-09T00:30:00Z",
    end_time: "2026-10-09T02:30:00Z",
    location: "ICICS X360",
    description: "Pick apart a popular app's onboarding flow in small groups.",
    max_attendees: 60,
    is_disabled: false,
    tracks: ["rsvp", "payment", "food", "workshop"],
    submissions_open_at: null,
    submissions_close_at: null,
    thumbnail_url: null,
    member_price: 0,
    non_member_price: 5,
  },
  {
    event_id: "evt-05",
    name: "PM 101 Workshop",
    type: "workshop",
    start_time: "2026-11-07T01:00:00Z",
    end_time: "2026-11-07T03:00:00Z",
    location: "Hugh Dempster 110",
    description:
      "An intro to the PM role: discovery, roadmaps and working with engineers.",
    max_attendees: 70,
    is_disabled: false,
    tracks: ["rsvp", "food", "workshop"],
    submissions_open_at: null,
    submissions_close_at: null,
    thumbnail_url: null,
    member_price: 0,
    non_member_price: 5,
  },
  {
    event_id: "evt-06",
    name: "Fall Case Competition",
    type: "case_competition",
    start_time: "2026-11-21T17:00:00Z",
    end_time: "2026-11-22T01:00:00Z",
    location: "Sauder Atrium",
    description: "Solve a real product case with your team in one day.",
    max_attendees: 80,
    is_disabled: true,
    tracks: ["rsvp", "payment", "food"],
    submissions_open_at: "2026-11-01T08:00:00Z",
    submissions_close_at: "2026-11-20T08:00:00Z",
    thumbnail_url: null,
    member_price: 5,
    non_member_price: 10,
  },
  {
    event_id: "evt-07",
    name: "Holiday Social",
    type: "social",
    start_time: "2026-12-05T01:00:00Z",
    end_time: "2026-12-05T04:00:00Z",
    location: "AMS Nest, Room 2306",
    description: "End-of-term games, snacks and hot chocolate.",
    max_attendees: 100,
    is_disabled: true,
    tracks: ["rsvp", "food"],
    submissions_open_at: null,
    submissions_close_at: null,
    thumbnail_url: null,
    member_price: null,
    non_member_price: null,
  },
  {
    event_id: "evt-08",
    name: "Project Showcase",
    type: "project_showcase",
    start_time: "2027-01-30T01:00:00Z",
    end_time: "2027-01-30T03:30:00Z",
    location: "Life Sciences Centre",
    description: "Project teams demo what they built this term.",
    max_attendees: 120,
    is_disabled: false,
    tracks: ["rsvp"],
    submissions_open_at: null,
    submissions_close_at: null,
    thumbnail_url: null,
    member_price: null,
    non_member_price: null,
  },
];

const REGISTERED_EVENTS: { eventId: string; count: number; past: boolean }[] = [
  { eventId: "evt-03", count: 18, past: true },
  { eventId: "evt-04", count: 12, past: true },
  { eventId: "evt-05", count: 14, past: false },
];

export const mockRegistrations: RawRegistration[] = REGISTERED_EVENTS.flatMap(
  ({ eventId, count, past }, eventIndex) =>
    mockUsers.slice(eventIndex * 4, eventIndex * 4 + count).map((user, i) => ({
      event_id: eventId,
      user_id: user.user_id,
      rsvp: i % 7 === 6 ? "declined" : i % 5 === 4 ? "maybe" : "going",
      paid: i % 4 !== 3,
      checked_in: past && i % 5 !== 4 && i % 7 !== 6,
      food_claimed: past && i % 3 !== 2,
      workshop_checked_in: past && eventId === "evt-04" && i % 2 === 0,
    })),
);

export const mockReimbursements: RawReimbursement[] = [
  {
    id: "rmb-01",
    user_id: MOCK_CURRENT_USER_ID,
    event_id: "evt-05",
    event_name: "PM 101 Workshop",
    item: "Pizza for workshop",
    amount: 86.4,
    category: "food",
    receipt_url: "#",
    etransfer_email: "ava.chen@student.example.ca",
    purchase_date: "2026-10-28",
    notes: null,
    status: "submitted",
    created_at: "2026-10-28T20:00:00Z",
  },
  {
    id: "rmb-02",
    user_id: MOCK_CURRENT_USER_ID,
    event_id: "evt-06",
    event_name: "Fall Case Competition",
    item: "Poster printing",
    amount: 42.75,
    category: "marketing",
    receipt_url: "#",
    etransfer_email: "ava.chen@student.example.ca",
    purchase_date: "2026-10-22",
    notes: "Printed at the Nest copy centre.",
    status: "submitted",
    created_at: "2026-10-23T17:30:00Z",
  },
  {
    id: "rmb-03",
    user_id: MOCK_CURRENT_USER_ID,
    event_id: "evt-04",
    event_name: "Product Teardown Workshop",
    item: "Sticky notes and markers",
    amount: 31.2,
    category: "other",
    receipt_url: "#",
    etransfer_email: "ava.chen@student.example.ca",
    purchase_date: "2026-10-06",
    notes: null,
    status: "approved",
    created_at: "2026-10-07T16:00:00Z",
  },
  {
    id: "rmb-04",
    user_id: MOCK_CURRENT_USER_ID,
    event_id: "evt-03",
    event_name: "Fall Kickoff Social",
    item: "Snacks and drinks",
    amount: 124.99,
    category: "food",
    receipt_url: "#",
    etransfer_email: "ava.chen@student.example.ca",
    purchase_date: "2026-09-16",
    notes: null,
    status: "paid",
    created_at: "2026-09-16T22:00:00Z",
  },
  {
    id: "rmb-05",
    user_id: MOCK_CURRENT_USER_ID,
    event_id: "evt-02",
    event_name: "Winter Case Competition",
    item: "Case competition prizes",
    amount: 200,
    category: "prizes",
    receipt_url: "#",
    etransfer_email: "ava.chen@student.example.ca",
    purchase_date: "2026-02-15",
    notes: "Gift cards for the top three teams.",
    status: "paid",
    created_at: "2026-02-15T19:00:00Z",
  },
  {
    id: "rmb-06",
    user_id: MOCK_CURRENT_USER_ID,
    event_id: null,
    event_name: null,
    item: "Canva Pro (1 month)",
    amount: 16.99,
    category: "software",
    receipt_url: "#",
    etransfer_email: "ava.chen@student.example.ca",
    purchase_date: "2026-09-02",
    notes: null,
    status: "rejected",
    created_at: "2026-09-02T15:00:00Z",
  },
];

export const MOCK_REVIEW_EVENT: z.input<typeof reviewEventSchema> = {
  event_id: "evt-review",
  name: "Product Jackpot",
  registration_opens: "2026-11-02T08:00:00Z",
  registration_closes: "2026-11-16T08:00:00Z",
};

function mockAnswers(whyEvent: string) {
  return [
    {
      id: "why_event",
      label: "Why are you interested in participating?",
      type: "long-answer",
      value: whyEvent,
    },
    {
      id: "resume",
      label: "Resume (PDF)",
      type: "file",
      value: "https://example.com/resume.pdf",
    },
  ];
}

export const mockApplicants: z.input<typeof applicantSchema>[] = [
  {
    attendee_id: "app-01",
    name: "Maya Singh",
    email: "maya.singh@example.ca",
    status: "APPLIED",
    created_at: "2026-11-03T18:00:00Z",
    reviewed_by: null,
    reviewed_at: null,
    answers: mockAnswers("I want to practise product thinking with a team."),
  },
  {
    attendee_id: "app-02",
    name: "Noah Tran",
    email: "noah.tran@example.ca",
    status: "APPLIED",
    created_at: "2026-11-03T19:30:00Z",
    reviewed_by: null,
    reviewed_at: null,
    answers: mockAnswers("I loved the last case competition."),
  },
  {
    attendee_id: "app-03",
    name: "Ella Wong",
    email: "ella.wong@example.ca",
    status: "REJECTED",
    created_at: "2026-11-03T20:15:00Z",
    reviewed_by: "dev.exec@example.ca",
    reviewed_at: "2026-11-04T01:00:00Z",
    answers: mockAnswers("I'm curious about product management."),
  },
];
