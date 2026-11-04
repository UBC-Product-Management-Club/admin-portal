import { z } from "zod";

export const EVENT_TYPES = [
  "workshop",
  "speaker_panel",
  "case_competition",
  "social",
  "project_showcase",
] as const;

export const EVENT_TRACKS = ["rsvp", "payment", "food", "workshop"] as const;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: "Workshop",
  speaker_panel: "Speaker panel",
  case_competition: "Case competition",
  social: "Social",
  project_showcase: "Project showcase",
};

const timestamp = z.iso.datetime({ offset: true });

/** Card data for the events grid and dashboard (GET /events/basic). */
export const basicEventSchema = z
  .object({
    event_id: z.string(),
    name: z.string(),
    // Null until migration 001 adds types and check-in tracking.
    type: z.enum(EVENT_TYPES).nullable(),
    start_time: timestamp,
    end_time: timestamp,
    location: z.string(),
    thumbnail_url: z.string().nullable(),
    is_disabled: z.boolean(),
    going_count: z.number().int(),
    attended_count: z.number().int().nullable(),
  })
  .transform((event) => ({
    eventId: event.event_id,
    name: event.name,
    type: event.type,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    thumbnailUrl: event.thumbnail_url,
    isOnPortal: !event.is_disabled,
    goingCount: event.going_count,
    attendedCount: event.attended_count,
  }));

export const basicEventListSchema = z.array(basicEventSchema);

/** Full event (GET /events/:event_id). */
export const eventSchema = z
  .object({
    event_id: z.string(),
    name: z.string(),
    type: z.enum(EVENT_TYPES).nullable(),
    start_time: timestamp,
    end_time: timestamp,
    location: z.string(),
    description: z.string(),
    max_attendees: z.number().int(),
    registered_count: z.number().int(),
    is_disabled: z.boolean(),
    tracks: z.array(z.enum(EVENT_TRACKS)),
    submissions_open_at: timestamp.nullable(),
    submissions_close_at: timestamp.nullable(),
    thumbnail_url: z.string().nullable(),
    member_price: z.number().nullable(),
    non_member_price: z.number().nullable(),
  })
  .transform((event) => ({
    eventId: event.event_id,
    name: event.name,
    type: event.type,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    description: event.description,
    maxAttendees: event.max_attendees,
    registeredCount: event.registered_count,
    isOnPortal: !event.is_disabled,
    tracks: event.tracks,
    submissionsOpenAt: event.submissions_open_at,
    submissionsCloseAt: event.submissions_close_at,
    thumbnailUrl: event.thumbnail_url,
    memberPrice: event.member_price,
    nonMemberPrice: event.non_member_price,
  }));

/** Request payloads stay snake_case, matching the backend. */
export type EventUpdatePayload = Partial<{
  name: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  max_attendees: number;
  is_disabled: boolean;
  tracks: EventTrack[];
  submissions_open_at: string | null;
  submissions_close_at: string | null;
  member_price: number | null;
  non_member_price: number | null;
}>;

export type BasicEvent = z.output<typeof basicEventSchema>;
export type Event = z.output<typeof eventSchema>;
export type EventType = (typeof EVENT_TYPES)[number];
export type EventTrack = (typeof EVENT_TRACKS)[number];
