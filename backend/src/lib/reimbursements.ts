import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { HttpError, notImplemented } from "./http-error.js";

export const REIMBURSEMENT_CATEGORIES = [
  "food",
  "venue",
  "marketing",
  "prizes",
  "software",
  "other",
] as const;

export type ReimbursementStatus =
  "submitted" | "approved" | "paid" | "rejected";
export type ReviewDecision = Exclude<ReimbursementStatus, "submitted">;

export type Reimbursement = {
  id: string;
  user_id: string;
  event_id: string | null;
  event_name: string | null;
  item: string;
  amount: number;
  category: (typeof REIMBURSEMENT_CATEGORIES)[number];
  receipt_url: string;
  etransfer_email: string;
  purchase_date: string | null;
  notes: string | null;
  status: ReimbursementStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type NewReimbursement = {
  event_id: string | null;
  item: string;
  amount: number;
  category: Reimbursement["category"];
  etransfer_email: string;
  purchase_date: string | null;
  notes: string | null;
};

export type Receipt = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

export type ReimbursementStore = {
  listForUser(userId: string): Promise<Reimbursement[]>;
  submit(
    userId: string,
    request: NewReimbursement,
    receipt: Receipt,
  ): Promise<Reimbursement>;
  review(
    id: string,
    decision: ReviewDecision,
    reviewerId: string,
    reviewerNote: string | null,
  ): Promise<Reimbursement>;
};

const RECEIPT_LINK_SECONDS = 60 * 60;
const FOREIGN_KEY_VIOLATION = "23503";
// Postgres and PostgREST codes for a missing table, or a missing relationship
// when the query embeds Event.
const MISSING_TABLE = new Set(["42P01", "PGRST200", "PGRST205"]);

// Which status a request must be in for each decision to apply.
const ALLOWED_FROM: Record<ReviewDecision, ReimbursementStatus> = {
  approved: "submitted",
  rejected: "submitted",
  paid: "approved",
};

const COLUMNS =
  "reimbursement_id,user_id,event_id,item,amount,category,receipt_path,etransfer_email,purchase_date,notes,status,reviewer_note,reviewed_at,created_at,Event(name)";

const rowSchema = z.object({
  reimbursement_id: z.string(),
  user_id: z.string(),
  event_id: z.string().nullable(),
  item: z.string(),
  // Postgres numeric can arrive as a string.
  amount: z.coerce.number(),
  category: z.enum(REIMBURSEMENT_CATEGORIES),
  receipt_path: z.string(),
  etransfer_email: z.string(),
  purchase_date: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["submitted", "approved", "paid", "rejected"]),
  reviewer_note: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
  Event: z.object({ name: z.string() }).nullable(),
});

type Row = z.infer<typeof rowSchema>;

/** Reimbursement requests, with receipts kept in a private bucket. */
export function createReimbursementStore(
  db: SupabaseClient,
  receiptsBucket: string,
): ReimbursementStore {
  async function signReceipts(rows: Row[]) {
    if (rows.length === 0) return new Map<string, string>();
    const { data, error } = await db.storage
      .from(receiptsBucket)
      .createSignedUrls(
        rows.map((row) => row.receipt_path),
        RECEIPT_LINK_SECONDS,
      );
    if (error) throw error;
    return new Map(
      data.flatMap(({ path, signedUrl }) =>
        path && signedUrl ? [[path, signedUrl]] : [],
      ),
    );
  }

  async function toResponses(rows: Row[]) {
    const signedUrls = await signReceipts(rows);
    return rows.map((row) => toReimbursement(row, signedUrls));
  }

  async function getRow(id: string) {
    const { data, error } = await db
      .from("Reimbursement")
      .select(COLUMNS)
      .eq("reimbursement_id", id)
      .maybeSingle();
    if (error) throw unlessMigrated(error);
    if (!data) {
      throw new HttpError(404, "NOT_FOUND", "Reimbursement request not found");
    }
    return rowSchema.parse(data);
  }

  return {
    async listForUser(userId) {
      const { data, error } = await db
        .from("Reimbursement")
        .select(COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw unlessMigrated(error);
      return toResponses(z.array(rowSchema).parse(data));
    },

    async submit(userId, request, receipt) {
      const path = `${userId}/${randomUUID()}${extensionOf(receipt.originalname)}`;
      const upload = await db.storage
        .from(receiptsBucket)
        .upload(path, receipt.buffer, { contentType: receipt.mimetype });
      if (upload.error) throw upload.error;

      const { data, error } = await db
        .from("Reimbursement")
        .insert({ ...request, user_id: userId, receipt_path: path })
        .select(COLUMNS)
        .single();
      if (error) {
        // Don't leave an orphaned receipt behind for a request that never saved.
        await db.storage.from(receiptsBucket).remove([path]);
        if (error.code === FOREIGN_KEY_VIOLATION) {
          throw new HttpError(400, "VALIDATION_ERROR", "Event not found");
        }
        throw error;
      }
      const [saved] = await toResponses([rowSchema.parse(data)]);
      return saved;
    },

    async review(id, decision, reviewerId, reviewerNote) {
      const current = await getRow(id);
      if (current.user_id === reviewerId) {
        throw new HttpError(
          403,
          "SELF_REVIEW",
          "You can't review your own reimbursement request",
        );
      }
      const from = ALLOWED_FROM[decision];
      if (current.status !== from) {
        throw new HttpError(
          409,
          "INVALID_STATUS",
          `Only ${from} requests can be marked ${decision}`,
        );
      }

      // The status filter stops two reviewers deciding the same request at once.
      const { data, error } = await db
        .from("Reimbursement")
        .update({
          status: decision,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          ...(reviewerNote !== null && { reviewer_note: reviewerNote }),
        })
        .eq("reimbursement_id", id)
        .eq("status", from)
        .select(COLUMNS);
      if (error) throw error;
      if (data.length === 0) {
        throw new HttpError(
          409,
          "INVALID_STATUS",
          "This request changed while you were reviewing it. Refresh and try again.",
        );
      }
      const [updated] = await toResponses(z.array(rowSchema).parse(data));
      return updated;
    },
  };
}

function toReimbursement(
  row: Row,
  signedUrls: Map<string, string>,
): Reimbursement {
  return {
    id: row.reimbursement_id,
    user_id: row.user_id,
    event_id: row.event_id,
    event_name: row.Event?.name ?? null,
    item: row.item,
    amount: row.amount,
    category: row.category,
    receipt_url: signedUrls.get(row.receipt_path) ?? "",
    etransfer_email: row.etransfer_email,
    purchase_date: row.purchase_date,
    notes: row.notes,
    status: row.status,
    reviewer_note: row.reviewer_note,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

/**
 * Until migration 001 creates the table, answer 501 like the old stub did,
 * so the dashboard keeps loading instead of showing an error.
 */
function unlessMigrated(error: { code?: string; message?: string }) {
  const isMissing =
    error.code !== undefined &&
    MISSING_TABLE.has(error.code) &&
    Boolean(error.message?.includes("Reimbursement"));
  return isMissing ? notImplemented() : error;
}

function extensionOf(filename: string) {
  const match = /\.[a-z0-9]{1,8}$/i.exec(filename);
  return match ? match[0].toLowerCase() : "";
}
