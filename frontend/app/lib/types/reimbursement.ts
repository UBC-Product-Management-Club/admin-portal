import { z } from "zod";

export const REIMBURSEMENT_CATEGORIES = [
  "food",
  "venue",
  "marketing",
  "prizes",
  "software",
  "other",
] as const;

export const REIMBURSEMENT_STATUSES = [
  "submitted",
  "approved",
  "paid",
  "rejected",
] as const;

export const REIMBURSEMENT_CATEGORY_LABELS: Record<
  ReimbursementCategory,
  string
> = {
  food: "Food and drinks",
  venue: "Venue",
  marketing: "Marketing and printing",
  prizes: "Prizes and swag",
  software: "Software",
  other: "Other",
};

export const reimbursementSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    event_id: z.string().nullable(),
    event_name: z.string().nullable(),
    item: z.string(),
    amount: z.coerce.number().positive(),
    category: z.enum(REIMBURSEMENT_CATEGORIES),
    receipt_url: z.string(),
    etransfer_email: z.string(),
    // FR-17 fields not yet in the HLD reimbursements table.
    purchase_date: z.iso.date().nullable(),
    notes: z.string().nullable(),
    status: z.enum(REIMBURSEMENT_STATUSES),
    created_at: z.iso.datetime({ offset: true }),
  })
  .transform((request) => ({
    id: request.id,
    userId: request.user_id,
    eventId: request.event_id,
    eventName: request.event_name,
    item: request.item,
    amount: request.amount,
    category: request.category,
    receiptUrl: request.receipt_url,
    etransferEmail: request.etransfer_email,
    purchaseDate: request.purchase_date,
    notes: request.notes,
    status: request.status,
    createdAt: request.created_at,
  }));

export const reimbursementListSchema = z.array(reimbursementSchema);

export type Reimbursement = z.output<typeof reimbursementSchema>;
export type ReimbursementCategory = (typeof REIMBURSEMENT_CATEGORIES)[number];
export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];
