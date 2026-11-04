import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { HttpError } from "./http-error.js";

export type BasicEvent = {
  event_id: string;
  name: string;
  type: string | null;
  start_time: string;
  end_time: string;
  location: string;
  thumbnail_url: string | null;
  is_disabled: boolean;
  going_count: number;
  attended_count: number | null;
};

export type EventDetail = {
  event_id: string;
  name: string;
  type: string | null;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  max_attendees: number;
  registered_count: number;
  is_disabled: boolean;
  tracks: string[];
  submissions_open_at: string | null;
  submissions_close_at: string | null;
  thumbnail_url: string | null;
  member_price: number | null;
  non_member_price: number | null;
};

export type EventAttendee = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  rsvp: "going";
  paid: boolean;
  checked_in: boolean | null;
  food_claimed: boolean | null;
  workshop_checked_in: boolean | null;
};

export type EventStore = {
  listBasicEvents(): Promise<BasicEvent[]>;
  getEvent(eventId: string): Promise<EventDetail>;
  listAttendees(eventId: string): Promise<EventAttendee[]>;
};

// Everyone holding a seat, matching what the database's seats_taken counts.
const GOING_STATUSES = ["ACCEPTED", "REGISTERED"];

const eventRowSchema = z.object({
  event_id: z.string(),
  name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  location: z.string().nullable(),
  thumbnail: z.string().nullable(),
  is_disabled: z.boolean().nullable(),
});

const attendeeRowSchema = z.object({ event_id: z.string() });

const eventDetailRowSchema = eventRowSchema.extend({
  description: z.string().nullable(),
  max_attendees: z.number().nullable(),
  member_price: z.number().nullable(),
  non_member_price: z.number().nullable(),
});

const submissionPhaseSchema = z.object({
  starttime: z.string().nullable(),
  deadline: z.string(),
});

const attendeeDetailSchema = z.object({
  user_id: z.string(),
  status: z.string(),
  is_payment_verified: z.boolean(),
  User: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
  }),
});

export function createEventStore(db: SupabaseClient): EventStore {
  return {
    async listBasicEvents() {
      const [events, attendees] = await Promise.all([
        db
          .from("Event")
          .select(
            "event_id,name,start_time,end_time,location,thumbnail,is_disabled",
          )
          // The portal needs dates to place an event, so undated rows are skipped.
          .not("start_time", "is", null)
          .not("end_time", "is", null)
          .order("start_time", { ascending: false }),
        db.from("Attendee").select("event_id").in("status", GOING_STATUSES),
      ]);
      if (events.error) throw events.error;
      if (attendees.error) throw attendees.error;

      const goingCounts = new Map<string, number>();
      for (const { event_id } of z
        .array(attendeeRowSchema)
        .parse(attendees.data)) {
        goingCounts.set(event_id, (goingCounts.get(event_id) ?? 0) + 1);
      }

      return z
        .array(eventRowSchema)
        .parse(events.data)
        .map((event) => ({
          event_id: event.event_id,
          name: event.name,
          // Both come from migration 001: Event.type and Attendee.checked_in.
          type: null,
          attended_count: null,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location ?? "",
          thumbnail_url: event.thumbnail,
          is_disabled: event.is_disabled ?? false,
          going_count: goingCounts.get(event.event_id) ?? 0,
        }));
    },

    async getEvent(eventId) {
      const [event, seats, phases] = await Promise.all([
        db
          .from("Event")
          .select(
            "event_id,name,start_time,end_time,location,thumbnail,is_disabled,description,max_attendees,member_price,non_member_price",
          )
          .eq("event_id", eventId)
          .maybeSingle(),
        db
          .from("Attendee")
          .select("event_id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .in("status", GOING_STATUSES),
        db
          .from("Deliverable_Flags")
          .select("starttime,deadline")
          .eq("event_id", eventId)
          .eq("is_enabled", true),
      ]);
      if (event.error) throw event.error;
      if (seats.error) throw seats.error;
      if (phases.error) throw phases.error;
      if (!event.data) throw new HttpError(404, "NOT_FOUND", "Event not found");

      const row = eventDetailRowSchema.parse(event.data);
      const windows = z.array(submissionPhaseSchema).parse(phases.data);
      return {
        event_id: row.event_id,
        name: row.name,
        // Event.type and Event.tracks come from migration 001.
        type: null,
        tracks: [],
        start_time: row.start_time,
        end_time: row.end_time,
        location: row.location ?? "",
        description: row.description ?? "",
        max_attendees: row.max_attendees ?? 0,
        registered_count: seats.count ?? 0,
        is_disabled: row.is_disabled ?? false,
        // An event can have several phases; show the window covering them all.
        submissions_open_at: earliest(windows.map((w) => w.starttime)),
        submissions_close_at: latest(windows.map((w) => w.deadline)),
        thumbnail_url: row.thumbnail,
        member_price: row.member_price,
        non_member_price: row.non_member_price,
      };
    },

    async listAttendees(eventId) {
      const { data, error } = await db
        .from("Attendee")
        .select(
          "user_id,status,is_payment_verified,User(first_name,last_name,email)",
        )
        .eq("event_id", eventId)
        .in("status", GOING_STATUSES)
        .order("created_at");
      if (error) throw error;

      return z
        .array(attendeeDetailSchema)
        .parse(data)
        .map((row) => ({
          user_id: row.user_id,
          first_name: row.User.first_name,
          last_name: row.User.last_name,
          email: row.User.email,
          rsvp: "going",
          // Free registrations finish with no payment to verify.
          paid: row.is_payment_verified || row.status === "REGISTERED",
          // These come from migration 001; null tells the portal to hide them.
          checked_in: null,
          food_claimed: null,
          workshop_checked_in: null,
        }));
    },
  };
}

function earliest(times: (string | null)[]) {
  return sortByTime(times)[0] ?? null;
}

function latest(times: (string | null)[]) {
  return sortByTime(times).at(-1) ?? null;
}

function sortByTime(times: (string | null)[]) {
  return times
    .filter((time): time is string => time !== null)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}
