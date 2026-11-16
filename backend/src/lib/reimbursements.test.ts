import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createReimbursementStore } from "./reimbursements.js";

const ROW = {
  reimbursement_id: "r1",
  user_id: "requester",
  event_id: "e1",
  item: "Pizza",
  amount: "42.50",
  category: "food",
  receipt_path: "requester/abc.pdf",
  etransfer_email: "requester@ubcpmc.com",
  purchase_date: "2026-11-10",
  notes: null,
  status: "submitted",
  reviewer_note: null,
  reviewed_at: null,
  created_at: "2026-11-11T18:00:00+00:00",
  Event: { name: "Product Jackpot" },
};

const RECEIPT = {
  buffer: Buffer.from("%PDF"),
  mimetype: "application/pdf",
  originalname: "Receipt.PDF",
};

type Result = { data: unknown; error: unknown };

/** Every query resolves to `result`; writes are recorded for assertions. */
function fakeDb(result: Result, insertResult: Result = result) {
  const writes: { op: string; values: unknown; filters: unknown[][] }[] = [];
  const upload = vi.fn(async () => ({ data: {}, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const createSignedUrls = vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}` })),
    error: null,
  }));
  const from = () => {
    let write: (typeof writes)[number] | undefined;
    const query = {
      insert: (values: unknown) => {
        write = { op: "insert", values, filters: [] };
        writes.push(write);
        return query;
      },
      update: (values: unknown) => {
        write = { op: "update", values, filters: [] };
        writes.push(write);
        return query;
      },
      select: () => query,
      order: () => query,
      eq: (...filter: unknown[]) => {
        write?.filters.push(filter);
        return query;
      },
      single: async () => insertResult,
      maybeSingle: async () => ({
        data: Array.isArray(result.data) ? result.data[0] : result.data,
        error: result.error,
      }),
      then: (resolve: (value: unknown) => void) => resolve(result),
    };
    return query;
  };
  const db = {
    from,
    storage: { from: () => ({ upload, remove, createSignedUrls }) },
  } as unknown as SupabaseClient;
  return { db, writes, upload, remove };
}

const NEW_REQUEST = {
  event_id: "e1",
  item: "Pizza",
  amount: 42.5,
  category: "food" as const,
  etransfer_email: "requester@ubcpmc.com",
  purchase_date: "2026-11-10",
  notes: null,
};

describe("createReimbursementStore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists requests with the event name and a signed receipt link", async () => {
    const { db } = fakeDb({ data: [ROW], error: null });
    const [request] = await createReimbursementStore(
      db,
      "receipts",
    ).listForUser("requester");
    expect(request).toMatchObject({
      id: "r1",
      event_name: "Product Jackpot",
      amount: 42.5,
      receipt_url: "https://signed/requester/abc.pdf",
    });
  });

  it("answers 501 until the migration creates the table", async () => {
    for (const error of [
      {
        code: "42P01",
        message: 'relation "public.Reimbursement" does not exist',
      },
      {
        code: "PGRST200",
        message:
          "Could not find a relationship between 'Reimbursement' and 'Event' in the schema cache",
      },
    ]) {
      const { db } = fakeDb({ data: null, error });
      await expect(
        createReimbursementStore(db, "receipts").listForUser("requester"),
      ).rejects.toMatchObject({ status: 501, code: "NOT_IMPLEMENTED" });
    }
  });

  it("still reports other database errors", async () => {
    const error = { code: "PGRST200", message: "Something about 'User'" };
    const { db } = fakeDb({ data: null, error });
    await expect(
      createReimbursementStore(db, "receipts").listForUser("requester"),
    ).rejects.toBe(error);
  });

  it("uploads the receipt into the requester's folder, then saves the request", async () => {
    const { db, writes, upload } = fakeDb({ data: ROW, error: null });
    const saved = await createReimbursementStore(db, "receipts").submit(
      "requester",
      NEW_REQUEST,
      RECEIPT,
    );

    const [[path, , options]] = upload.mock.calls as unknown as [
      string,
      Buffer,
      { contentType: string },
    ][];
    expect(path).toMatch(/^requester\/[0-9a-f-]{36}\.pdf$/);
    expect(options).toEqual({ contentType: "application/pdf" });
    expect(writes[0]).toMatchObject({
      op: "insert",
      values: { ...NEW_REQUEST, user_id: "requester", receipt_path: path },
    });
    expect(saved.id).toBe("r1");
  });

  it("removes the receipt when the request can't be saved", async () => {
    const { db, upload, remove } = fakeDb(
      { data: null, error: null },
      { data: null, error: { code: "23503", message: "fk" } },
    );
    await expect(
      createReimbursementStore(db, "receipts").submit(
        "requester",
        NEW_REQUEST,
        RECEIPT,
      ),
    ).rejects.toMatchObject({ status: 400, message: "Event not found" });
    const [[path]] = upload.mock.calls as unknown as [string][];
    expect(remove).toHaveBeenCalledWith([path]);
  });

  it("records who approved a request", async () => {
    const { db, writes } = fakeDb({ data: [ROW], error: null });
    await createReimbursementStore(db, "receipts").review(
      "r1",
      "approved",
      "treasurer",
      "Thanks",
    );
    expect(writes[0]).toMatchObject({
      op: "update",
      values: {
        status: "approved",
        reviewed_by: "treasurer",
        reviewer_note: "Thanks",
      },
      filters: [
        ["reimbursement_id", "r1"],
        ["status", "submitted"],
      ],
    });
  });

  it("doesn't let execs review their own request", async () => {
    const { db, writes } = fakeDb({ data: [ROW], error: null });
    await expect(
      createReimbursementStore(db, "receipts").review(
        "r1",
        "approved",
        "requester",
        null,
      ),
    ).rejects.toMatchObject({ status: 403, code: "SELF_REVIEW" });
    expect(writes).toEqual([]);
  });

  it("only pays approved requests", async () => {
    const { db } = fakeDb({ data: [ROW], error: null });
    await expect(
      createReimbursementStore(db, "receipts").review(
        "r1",
        "paid",
        "treasurer",
        null,
      ),
    ).rejects.toMatchObject({ status: 409, code: "INVALID_STATUS" });
  });

  it("reports a conflict when someone else decided first", async () => {
    const { db } = fakeDb({ data: [ROW], error: null });
    // The read sees "submitted", but the guarded update matches nothing.
    const store = createReimbursementStore(
      {
        ...db,
        from: (table: string) => {
          const query = db.from(table);
          return Object.assign(query, {
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          });
        },
      } as unknown as SupabaseClient,
      "receipts",
    );
    await expect(
      store.review("r1", "rejected", "treasurer", null),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns 404 for an unknown request", async () => {
    const { db } = fakeDb({ data: [], error: null });
    await expect(
      createReimbursementStore(db, "receipts").review(
        "missing",
        "approved",
        "treasurer",
        null,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
