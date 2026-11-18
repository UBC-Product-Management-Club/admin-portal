import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSubmissionStore } from "./submissions.js";

const EVENT = { event_id: "e1", name: "Product Jackpot" };

const PHASE = {
  fields: [
    { id: "deck", type: "file", label: "Slide deck", required: true },
    { id: "video", type: "url", label: "Video link", required: true },
    { id: "description", type: "long-answer", label: "Description" },
  ],
};

function member(first: string, last: string) {
  return {
    Attendee: {
      User: { first_name: first, last_name: last, email: `${first}@x.ca` },
    },
  };
}

const TEAMS = [
  {
    team_id: "t1",
    team_name: "Alpha",
    is_finalist: true,
    Team_Member: [
      member("Ava", "Chen"),
      { Attendee: null },
      member("Noah", "Tran"),
    ],
  },
  { team_id: "t2", team_name: null, is_finalist: null, Team_Member: [] },
];

function fakeDb(tables: Record<string, unknown>) {
  const createSignedUrls = vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({
      path,
      signedUrl: path.includes("missing") ? null : `https://signed/${path}`,
    })),
    error: null,
  }));
  const db = {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: tables[table] ?? [], error: null }),
      };
      return query;
    },
    storage: { from: () => ({ createSignedUrls }) },
  } as unknown as SupabaseClient;
  return { db, createSignedUrls };
}

describe("createSubmissionStore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows each team's latest submission with signed deck links", async () => {
    const { db, createSignedUrls } = fakeDb({
      Event: EVENT,
      Deliverable_Flags: [PHASE],
      Team: TEAMS,
      Deliverable: [
        {
          team_id: "t1",
          version: 1,
          submitted_at: "2026-11-22T18:00:00+00:00",
          submission: {
            deck: "events/e1/alpha-v2.pdf",
            video: "https://youtu.be/abc",
            description: "Final pitch",
          },
        },
        {
          team_id: "t1",
          version: 0,
          submitted_at: "2026-11-22T10:00:00+00:00",
          submission: { deck: "events/e1/alpha-v1.pdf", description: "Draft" },
        },
      ],
    });

    const list = await createSubmissionStore(
      db,
      "deliverables",
    ).listSubmissions("e1");

    expect(list.fields.map((f) => f.id)).toEqual([
      "deck",
      "video",
      "description",
    ]);
    expect(list.teams).toEqual([
      {
        team_id: "t1",
        team_name: "Alpha",
        is_finalist: true,
        members: [
          { name: "Ava Chen", email: "Ava@x.ca" },
          { name: "Noah Tran", email: "Noah@x.ca" },
        ],
        submitted_at: "2026-11-22T18:00:00+00:00",
        answers: {
          deck: ["https://signed/events/e1/alpha-v2.pdf"],
          video: ["https://youtu.be/abc"],
          description: ["Final pitch"],
        },
      },
      {
        team_id: "t2",
        team_name: "Unnamed team",
        is_finalist: false,
        members: [],
        submitted_at: null,
        answers: {},
      },
    ]);
    expect(createSignedUrls).toHaveBeenCalledWith(
      ["events/e1/alpha-v2.pdf"],
      7 * 24 * 60 * 60,
    );
  });

  it("signs old public bucket URLs and keeps fields the form doesn't list", async () => {
    const { db } = fakeDb({
      Event: EVENT,
      Deliverable_Flags: [{ fields: [] }],
      Team: [TEAMS[0]],
      Deliverable: [
        {
          team_id: "t1",
          version: 0,
          submitted_at: "2026-03-01T02:00:00+00:00",
          submission: {
            file_links: [
              "https://x.supabase.co/storage/v1/object/public/deliverables/events/e1/deck%20one.pdf",
              "https://x.supabase.co/storage/v1/object/public/deliverables/events/e1/missing.pdf",
            ],
            figmaLink: "https://figma.com/file/1",
          },
        },
      ],
    });

    const list = await createSubmissionStore(
      db,
      "deliverables",
    ).listSubmissions("e1");

    expect(list.fields).toEqual([
      { id: "file_links", label: "file_links", type: "short-answer" },
      { id: "figmaLink", label: "figmaLink", type: "short-answer" },
    ]);
    expect(list.teams[0].answers).toEqual({
      file_links: ["https://signed/events/e1/deck one.pdf"],
      figmaLink: ["https://figma.com/file/1"],
    });
  });

  it("returns 404 for an unknown event", async () => {
    const { db } = fakeDb({});
    await expect(
      createSubmissionStore(db, "deliverables").listSubmissions("nope"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
