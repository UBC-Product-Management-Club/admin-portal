import {
  fromDateTimeParts,
  toDateTimeParts,
  type DateTimeParts,
} from "~/lib/date-parts";
import type { Event, EventUpdatePayload } from "~/lib/types/event";

/** Editable event fields on the Configuration tab, as raw input strings. */
export type EventFormValues = {
  name: string;
  start: DateTimeParts;
  end: DateTimeParts;
  location: string;
  description: string;
  maxAttendees: string;
  memberPrice: string;
  nonMemberPrice: string;
};

type ChangesResult =
  { ok: true; changes: EventUpdatePayload } | { ok: false; error: string };

export function toEventFormValues(event: Event): EventFormValues {
  return {
    name: event.name,
    start: toDateTimeParts(event.startTime),
    end: toDateTimeParts(event.endTime),
    location: event.location,
    description: event.description,
    maxAttendees: String(event.maxAttendees),
    memberPrice: event.memberPrice == null ? "" : String(event.memberPrice),
    nonMemberPrice:
      event.nonMemberPrice == null ? "" : String(event.nonMemberPrice),
  };
}

/** Empty input means "no price"; otherwise a non-negative number. */
export function parsePrice(value: string): number | null | undefined {
  if (value.trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

/**
 * Builds a PATCH payload with only the fields that changed (HLD 3.3). Start and
 * end always travel together because the backend validates them as a range.
 * Client-side checks cover only impossible dates and negative numbers; the
 * backend schema is the authority for everything else.
 */
export function buildEventChanges(
  event: Event,
  values: EventFormValues,
): ChangesResult {
  const startTime = fromDateTimeParts(values.start);
  const endTime = fromDateTimeParts(values.end);
  if (!startTime || !endTime) {
    return { ok: false, error: "Enter a real start and end date and time." };
  }

  const maxAttendees = Number(values.maxAttendees);
  if (!Number.isInteger(maxAttendees) || maxAttendees < 0) {
    return { ok: false, error: "Capacity must be zero or more." };
  }

  const memberPrice = parsePrice(values.memberPrice);
  const nonMemberPrice = parsePrice(values.nonMemberPrice);
  if (memberPrice === undefined || nonMemberPrice === undefined) {
    return { ok: false, error: "Prices can't be negative." };
  }

  const changes: EventUpdatePayload = {};
  if (values.name !== event.name) changes.name = values.name;
  if (values.location !== event.location) changes.location = values.location;
  if (values.description !== event.description) {
    changes.description = values.description;
  }
  if (maxAttendees !== event.maxAttendees) changes.max_attendees = maxAttendees;
  if (memberPrice !== event.memberPrice) changes.member_price = memberPrice;
  if (nonMemberPrice !== event.nonMemberPrice) {
    changes.non_member_price = nonMemberPrice;
  }
  if (
    startTime !== new Date(event.startTime).toISOString() ||
    endTime !== new Date(event.endTime).toISOString()
  ) {
    changes.start_time = startTime;
    changes.end_time = endTime;
  }
  return { ok: true, changes };
}
