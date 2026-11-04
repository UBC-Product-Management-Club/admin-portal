import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createEventStore } from "./events.js";
import { createUserStore } from "./users.js";

function fakeDb(tables: Record<string, unknown[]>) {
  return {
    from: (table: string) => {
      const query = {
        select: () => query,
        not: () => query,
        in: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: async () => ({
          data: tables[table]?.[0] ?? null,
          error: null,
        }),
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: tables[table],
            count: tables[table]?.length,
            error: null,
          }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

function failingDb(message: string) {
  return {
    from: () => {
      const query = {
        select: () => query,
        not: () => query,
        in: () => query,
        order: () => query,
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: new Error(message) }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

const EVENT_ROW = {
  event_id: "e1",
  name: "Product Jackpot",
  start_time: "2026-11-21T17:00:00+00:00",
  end_time: "2026-11-23T00:00:00+00:00",
  location: "Sauder",
  thumbnail: "https://example.com/thumb.png",
  is_disabled: false,
};

const USER_ROW = {
  user_id: "auth0|1",
  first_name: "Ava",
  last_name: "Chen",
  email: "ava@example.ca",
  pronouns: "she/her",
  university: "University of British Columbia",
  year: "3",
  faculty: "Science",
  major: "CS",
  why_pm: "Products",
  student_id: null,
};

describe("createEventStore", () => {
  it("counts everyone holding a seat, per event", async () => {
    const db = fakeDb({
      Event: [EVENT_ROW, { ...EVENT_ROW, event_id: "e2", name: "Empty" }],
      Attendee: [{ event_id: "e1" }, { event_id: "e1" }],
    });

    const events = await createEventStore(db).listBasicEvents();

    expect(events.map((e) => [e.event_id, e.going_count])).toEqual([
      ["e1", 2],
      ["e2", 0],
    ]);
  });

  it("maps database columns to the API's shape", async () => {
    const db = fakeDb({
      Event: [
        {
          ...EVENT_ROW,
          location: null,
          thumbnail: null,
          is_disabled: null,
        },
      ],
      Attendee: [],
    });

    const [event] = await createEventStore(db).listBasicEvents();

    expect(event).toEqual({
      event_id: "e1",
      name: "Product Jackpot",
      type: null,
      start_time: EVENT_ROW.start_time,
      end_time: EVENT_ROW.end_time,
      location: "",
      thumbnail_url: null,
      is_disabled: false,
      going_count: 0,
      attended_count: null,
    });
  });

  it("surfaces database errors", async () => {
    await expect(
      createEventStore(failingDb("db down")).listBasicEvents(),
    ).rejects.toThrow("db down");
  });
});

describe("event details", () => {
  const DETAIL_ROW = {
    ...EVENT_ROW,
    description: "A competition",
    max_attendees: 100,
    member_price: 9,
    non_member_price: 15,
  };

  it("adds the seat count and the window covering every phase", async () => {
    const db = fakeDb({
      Event: [DETAIL_ROW],
      Attendee: [{ event_id: "e1" }, { event_id: "e1" }],
      Deliverable_Flags: [
        {
          starttime: "2026-03-08T08:00:00+00:00",
          deadline: "2026-03-14T19:00:00+00:00",
        },
        {
          starttime: "2026-02-01T08:00:00+00:00",
          deadline: "2026-03-20T19:00:00+00:00",
        },
        { starttime: null, deadline: "2026-03-01T19:00:00+00:00" },
      ],
    });

    const event = await createEventStore(db).getEvent("e1");

    expect(event).toMatchObject({
      registered_count: 2,
      type: null,
      tracks: [],
      submissions_open_at: "2026-02-01T08:00:00+00:00",
      submissions_close_at: "2026-03-20T19:00:00+00:00",
      member_price: 9,
    });
  });

  it("has no submission window when an event has no phases", async () => {
    const db = fakeDb({
      Event: [DETAIL_ROW],
      Attendee: [],
      Deliverable_Flags: [],
    });

    const event = await createEventStore(db).getEvent("e1");

    expect(event.submissions_open_at).toBeNull();
    expect(event.submissions_close_at).toBeNull();
  });

  it("returns 404 for an event that doesn't exist", async () => {
    const db = fakeDb({ Event: [], Attendee: [], Deliverable_Flags: [] });

    await expect(createEventStore(db).getEvent("e1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each([
    ["REGISTERED", false, true],
    ["REGISTERED", true, true],
    ["ACCEPTED", false, false],
  ])(
    "treats %s with verified=%s as paid=%s",
    async (status, verified, paid) => {
      const db = fakeDb({
        Attendee: [
          {
            user_id: "auth0|1",
            status,
            is_payment_verified: verified,
            User: {
              first_name: "Ava",
              last_name: "Chen",
              email: "ava@example.ca",
            },
          },
        ],
      });

      const [attendee] = await createEventStore(db).listAttendees("e1");

      expect(attendee).toEqual({
        user_id: "auth0|1",
        first_name: "Ava",
        last_name: "Chen",
        email: "ava@example.ca",
        rsvp: "going",
        paid,
        checked_in: null,
        food_claimed: null,
        workshop_checked_in: null,
      });
    },
  );
});

describe("createUserStore", () => {
  it.each([
    ["University of British Columbia", "UBC"],
    ["Simon Fraser University", "SFU"],
    ["British Columbia Institute of Technology", "BCIT"],
    ["I'm not a university student", "Other"],
    [null, null],
  ])("maps university %s to %s", async (stored, expected) => {
    const db = fakeDb({ User: [{ ...USER_ROW, university: stored }] });

    const [user] = await createUserStore(db).listUsers();

    expect(user.university).toBe(expected);
  });

  it.each([
    ["5+", "5+"],
    ["Alumni", null],
    [null, null],
  ])("maps year %s to %s", async (stored, expected) => {
    const db = fakeDb({ User: [{ ...USER_ROW, year: stored }] });

    const [user] = await createUserStore(db).listUsers();

    expect(user.year).toBe(expected);
  });

  it("surfaces database errors", async () => {
    await expect(
      createUserStore(failingDb("db down")).listUsers(),
    ).rejects.toThrow("db down");
  });
});
