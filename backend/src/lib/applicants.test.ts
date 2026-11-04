import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApplicantStore } from "./applicants.js";

const EVENT = {
  event_id: "e1",
  name: "Product Jackpot",
  registration_opens: "2026-11-02T08:00:00+00:00",
  registration_closes: "2026-11-16T08:00:00+00:00",
  event_form_questions: {
    questions: [
      { id: "why_pm", type: "long-answer", label: "Why PM?" },
      { id: "resume", type: "file", label: "Resume (PDF)" },
    ],
  },
};

function attendee(status: string) {
  return {
    attendee_id: "a1",
    status,
    created_at: "2026-11-02T10:00:00+00:00",
    reviewed_by: null,
    reviewed_at: null,
    payment_due_at: null as string | null,
    event_form_answers: {
      name: "Form Name",
      email: "form@example.ca",
      why_pm: "I like products",
      resume: "folder/resume.pdf",
      extra: "Not in the question list",
    },
    User: { first_name: "Acct", last_name: "Name", email: "acct@example.ca" },
  };
}

/** Each Attendee read pops the next row, so tests can script before and after. */
function fakeDb(
  attendeeReads: unknown[],
  rpcError: unknown = null,
  updatedRows: unknown[] = [],
) {
  const rpc = vi.fn(async () => ({ error: rpcError }));
  const createSignedUrls = vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}` })),
    error: null,
  }));
  const updates: unknown[] = [];
  const from = (table: string) => {
    let isUpdate = false;
    const query = {
      update: (values: unknown) => {
        isUpdate = true;
        updates.push(values);
        return query;
      },
      select: () => query,
      eq: () => query,
      in: () => query,
      order: () => query,
      maybeSingle: async () => ({
        data: table === "Event" ? EVENT : (attendeeReads.shift() ?? null),
        error: null,
      }),
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: isUpdate ? updatedRows : attendeeReads, error: null }),
    };
    return query;
  };
  const db = {
    from,
    rpc,
    storage: { from: () => ({ createSignedUrls }) },
  } as unknown as SupabaseClient;
  return { db, rpc, createSignedUrls, updates };
}

describe("createApplicantStore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists applicants with their answers and signed resume links", async () => {
    const { db, createSignedUrls } = fakeDb([attendee("APPLIED")]);

    const list = await createApplicantStore(db, "bucket").listApplicants("e1");

    expect(createSignedUrls).toHaveBeenCalledWith(["folder/resume.pdf"], 3600);
    expect(list.name).toBe("Product Jackpot");
    expect(list.applicants[0]).toMatchObject({
      name: "Form Name",
      email: "form@example.ca",
      answers: [
        { id: "why_pm", label: "Why PM?", value: "I like products" },
        { id: "resume", value: "https://signed/folder/resume.pdf" },
        { id: "extra", value: "Not in the question list" },
      ],
    });
  });

  it("falls back to the account name and email", async () => {
    const row = attendee("APPLIED");
    row.event_form_answers = {} as typeof row.event_form_answers;
    const { db } = fakeDb([row]);

    const list = await createApplicantStore(db, "bucket").listApplicants("e1");

    expect(list.applicants[0]).toMatchObject({
      name: "Acct Name",
      email: "acct@example.ca",
    });
  });

  it.each([
    ["ACCEPTED", "accept_applicants"],
    ["REJECTED", "reject_applicants"],
  ] as const)("applies %s through %s", async (decision, fn) => {
    const { db, rpc } = fakeDb([attendee("APPLIED"), attendee(decision)]);

    const result = await createApplicantStore(db, "bucket").decide(
      "e1",
      "a1",
      decision,
      "exec@ubcpmc.com",
    );

    expect(rpc).toHaveBeenCalledWith(fn, {
      p_event_id: "e1",
      p_attendee_ids: ["a1"],
      p_reviewer: "exec@ubcpmc.com",
    });
    expect(result.status).toBe(decision);
  });

  it("won't change an applicant who was already reviewed", async () => {
    const { db, rpc } = fakeDb([attendee("REJECTED")]);

    await expect(
      createApplicantStore(db, "bucket").decide("e1", "a1", "ACCEPTED", "me"),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_DECIDED" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 404 for an applicant outside this event", async () => {
    const { db, rpc } = fakeDb([]);

    await expect(
      createApplicantStore(db, "bucket").decide("e1", "a1", "ACCEPTED", "me"),
    ).rejects.toMatchObject({ status: 404 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports failure when the status didn't actually change", async () => {
    const { db } = fakeDb([attendee("APPLIED"), attendee("APPLIED")]);

    await expect(
      createApplicantStore(db, "bucket").decide("e1", "a1", "ACCEPTED", "me"),
    ).rejects.toMatchObject({ status: 409, code: "DECISION_NOT_APPLIED" });
  });

  it("passes on a refusal raised by the database function", async () => {
    const { db } = fakeDb([attendee("APPLIED")], {
      code: "P0001",
      message: "Event is full",
    });

    await expect(
      createApplicantStore(db, "bucket").decide("e1", "a1", "ACCEPTED", "me"),
    ).rejects.toMatchObject({ status: 409, message: "Event is full" });
  });

  describe("setPaymentDue", () => {
    const FUTURE = "2099-01-01T08:00:00.000Z";

    it("saves the new deadline and returns the updated applicant", async () => {
      const updatedRow = { ...attendee("ACCEPTED"), payment_due_at: FUTURE };
      const { db, updates } = fakeDb([attendee("ACCEPTED"), updatedRow], null, [
        { attendee_id: "a1" },
      ]);

      const result = await createApplicantStore(db, "bucket").setPaymentDue(
        "e1",
        "a1",
        FUTURE,
      );

      expect(updates).toEqual([{ payment_due_at: FUTURE }]);
      expect(result.payment_due_at).toBe(FUTURE);
    });

    it("refuses a deadline in the past without saving", async () => {
      const { db, updates } = fakeDb([attendee("ACCEPTED")]);

      await expect(
        createApplicantStore(db, "bucket").setPaymentDue(
          "e1",
          "a1",
          "2020-01-01T00:00:00.000Z",
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(updates).toEqual([]);
    });

    it("refuses anyone who isn't accepted and waiting to pay", async () => {
      const { db } = fakeDb([attendee("REGISTERED")], null, []);

      await expect(
        createApplicantStore(db, "bucket").setPaymentDue("e1", "a1", FUTURE),
      ).rejects.toMatchObject({ status: 409, code: "NOT_AWAITING_PAYMENT" });
    });

    it("returns 404 for an applicant outside this event", async () => {
      const { db, updates } = fakeDb([]);

      await expect(
        createApplicantStore(db, "bucket").setPaymentDue("e1", "a1", FUTURE),
      ).rejects.toMatchObject({ status: 404 });
      expect(updates).toEqual([]);
    });
  });
});
