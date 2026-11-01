import { buildEventChanges, toEventFormValues } from "~/lib/event-form";
import { eventSchema } from "~/lib/types/event";

const event = eventSchema.parse({
  event_id: "evt-1",
  name: "PM 101",
  type: "workshop",
  start_time: "2026-11-07T01:00:00Z",
  end_time: "2026-11-07T03:00:00Z",
  location: "Room 110",
  description: "Intro",
  max_attendees: 70,
  registered_count: 10,
  is_disabled: false,
  tracks: ["rsvp"],
  submissions_open_at: null,
  submissions_close_at: null,
  thumbnail_url: null,
  member_price: 0,
  non_member_price: 5,
});

describe("buildEventChanges", () => {
  it("sends nothing when nothing changed", () => {
    expect(buildEventChanges(event, toEventFormValues(event))).toEqual({
      ok: true,
      changes: {},
    });
  });

  it("sends only changed fields", () => {
    const values = { ...toEventFormValues(event), location: "Room 200" };
    expect(buildEventChanges(event, values)).toEqual({
      ok: true,
      changes: { location: "Room 200" },
    });
  });

  it("sends start and end together when either time changes", () => {
    const values = {
      ...toEventFormValues(event),
      end: { date: "2026-11-07", time: "04:00" },
    };
    expect(buildEventChanges(event, values)).toEqual({
      ok: true,
      changes: {
        start_time: "2026-11-07T01:00:00.000Z",
        end_time: "2026-11-07T04:00:00.000Z",
      },
    });
  });

  it("clears a price when its field is emptied", () => {
    const values = { ...toEventFormValues(event), nonMemberPrice: "" };
    expect(buildEventChanges(event, values)).toEqual({
      ok: true,
      changes: { non_member_price: null },
    });
  });

  it("rejects impossible dates and negative prices", () => {
    const badDate = {
      ...toEventFormValues(event),
      start: { date: "2026-02-30", time: "10:00" },
    };
    const badPrice = { ...toEventFormValues(event), memberPrice: "-1" };
    expect(buildEventChanges(event, badDate).ok).toBe(false);
    expect(buildEventChanges(event, badPrice).ok).toBe(false);
  });
});
