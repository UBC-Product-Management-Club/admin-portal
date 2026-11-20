import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createTeamStore } from "./teams.js";

const EVENT = {
  event_id: "e1",
  name: "Product Jackpot",
  min_team_size: 1,
  max_team_size: 4,
  roster_locks_at: null,
};

function user(first: string) {
  return { first_name: first, last_name: "Lee", email: `${first}@x.ca` };
}

const TEAMS = [
  {
    team_id: "t1",
    team_name: "Alpha",
    team_code: "2N2CG",
    Team_Member: [
      {
        Attendee: {
          attendee_id: "a1",
          status: "REGISTERED",
          User: user("Ava"),
        },
      },
      { Attendee: null },
    ],
  },
  { team_id: "t2", team_name: null, team_code: null, Team_Member: [] },
];

const ATTENDEES = [
  { attendee_id: "a1", status: "REGISTERED", User: user("Ava") },
  { attendee_id: "a2", status: "ACCEPTED", User: user("Noah") },
  { attendee_id: "a3", status: "REGISTERED", User: null },
];

type Result = { data: unknown; error: unknown };
type Call = { table: string; op: string; args: unknown[] };

/**
 * Records every query and answers reads from `tables`. `failInsert` makes the
 * next Team_Member insert fail, to test the rollback.
 */
function fakeDb({
  tables = {} as Record<string, unknown>,
  failInsert = false,
  rpcError = null as unknown,
} = {}) {
  const calls: Call[] = [];
  let insertsFailed = 0;
  const db = {
    from: (table: string) => {
      let op = "select";
      let result: () => Result = () => ({
        data: tables[table] ?? [],
        error: null,
      });
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          calls.push({ table, op: `${op}.eq`, args });
          return query;
        },
        in: () => query,
        order: () => query,
        update: (...args: unknown[]) => {
          op = "update";
          calls.push({ table, op, args });
          result = () => ({ data: [{ event_id: "e1" }], error: null });
          return query;
        },
        delete: () => {
          op = "delete";
          calls.push({ table, op, args: [] });
          result = () => ({
            data: [{ team_id: "t2", attendee_id: "a1" }],
            error: null,
          });
          return query;
        },
        insert: (...args: unknown[]) => {
          op = "insert";
          calls.push({ table, op, args });
          const fails = failInsert && insertsFailed++ === 0;
          result = () => ({
            data: null,
            error: fails ? { message: "insert failed" } : null,
          });
          return query;
        },
        maybeSingle: async () => {
          const rows = tables[table];
          return {
            data: Array.isArray(rows) ? (rows[0] ?? null) : (rows ?? null),
            error: null,
          };
        },
        then: (resolve: (value: Result) => void) => resolve(result()),
      };
      return query;
    },
    rpc: vi.fn(async () => ({ data: null, error: rpcError })),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
  return { db, calls };
}

const FULL = { Event: EVENT, Team: TEAMS, Attendee: ATTENDEES };

describe("createTeamStore", () => {
  it("lists teams and who isn't on one", async () => {
    const { db } = fakeDb({ tables: FULL });
    const list = await createTeamStore(db).listTeams("e1");

    expect(list).toEqual({
      ...EVENT,
      teams: [
        {
          team_id: "t1",
          team_name: "Alpha",
          team_code: "2N2CG",
          members: [
            {
              attendee_id: "a1",
              name: "Ava Lee",
              email: "Ava@x.ca",
              status: "REGISTERED",
            },
          ],
        },
        {
          team_id: "t2",
          team_name: "Unnamed team",
          team_code: "",
          members: [],
        },
      ],
      unassigned: [
        {
          attendee_id: "a2",
          name: "Noah Lee",
          email: "Noah@x.ca",
          status: "ACCEPTED",
        },
        {
          attendee_id: "a3",
          name: "Unknown attendee",
          email: "",
          status: "REGISTERED",
        },
      ],
    });
  });

  it("404s for an unknown event", async () => {
    const { db } = fakeDb({ tables: { Team: [], Attendee: [] } });
    await expect(createTeamStore(db).listTeams("nope")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("saves when teams close", async () => {
    const { db, calls } = fakeDb({ tables: FULL });
    await createTeamStore(db).setRosterLock("e1", "2026-11-28T23:59:00Z");
    expect(calls).toContainEqual({
      table: "Event",
      op: "update",
      args: [{ roster_locks_at: "2026-11-28T23:59:00Z" }],
    });
  });

  it("moves an attendee by clearing their old team first", async () => {
    const { db, calls } = fakeDb({ tables: FULL });
    await createTeamStore(db).addMember("e1", "t1", "a1");

    const writes = calls.filter(
      (c) => c.table === "Team_Member" && c.op !== "delete.eq",
    );
    expect(writes).toEqual([
      { table: "Team_Member", op: "delete", args: [] },
      {
        table: "Team_Member",
        op: "insert",
        args: [{ team_id: "t1", attendee_id: "a1" }],
      },
    ]);
  });

  it("puts an attendee back if the move fails", async () => {
    const { db, calls } = fakeDb({ tables: FULL, failInsert: true });
    await expect(
      createTeamStore(db).addMember("e1", "t1", "a1"),
    ).rejects.toMatchObject({ message: "insert failed" });

    const inserts = calls.filter(
      (c) => c.table === "Team_Member" && c.op === "insert",
    );
    expect(inserts.at(-1)?.args).toEqual([
      [{ team_id: "t2", attendee_id: "a1" }],
    ]);
  });

  it("creates a team through the database function", async () => {
    const { db } = fakeDb({ tables: FULL });
    await createTeamStore(db).createTeam("e1", "Gamma", ["a2"]);
    expect(db.rpc).toHaveBeenCalledWith("create_team_with_members", {
      p_event_id: "e1",
      p_team_name: "Gamma",
      p_member_attendee_ids: ["a2"],
    });
  });

  it("explains a taken team name", async () => {
    const { db } = fakeDb({
      tables: FULL,
      rpcError: { code: "23505", message: "duplicate key" },
    });
    await expect(
      createTeamStore(db).createTeam("e1", "Alpha", []),
    ).rejects.toMatchObject({ status: 409, code: "TEAM_NAME_TAKEN" });
  });
});
