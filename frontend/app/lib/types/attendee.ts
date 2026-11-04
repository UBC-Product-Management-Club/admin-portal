import { z } from "zod";

export const RSVP_STATUSES = ["going", "maybe", "declined"] as const;

/** A registration joined with its member (GET /events/:event_id/attendees). */
export const attendeeSchema = z
  .object({
    user_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    rsvp: z.enum(RSVP_STATUSES),
    paid: z.boolean(),
    // Null until migration 001 adds check-in tracking; the table hides them.
    checked_in: z.boolean().nullable(),
    food_claimed: z.boolean().nullable(),
    workshop_checked_in: z.boolean().nullable(),
  })
  .transform((attendee) => ({
    userId: attendee.user_id,
    name: `${attendee.first_name} ${attendee.last_name}`,
    email: attendee.email,
    rsvp: attendee.rsvp,
    paid: attendee.paid,
    checkedIn: attendee.checked_in,
    foodClaimed: attendee.food_claimed,
    workshopCheckedIn: attendee.workshop_checked_in,
  }));

export const attendeeListSchema = z.array(attendeeSchema);

export type Attendee = z.output<typeof attendeeSchema>;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];
