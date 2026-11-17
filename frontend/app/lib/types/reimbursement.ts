import { z } from "zod";

export const REIMBURSEMENT_STATUSES = [
  "pending",
  "in_transit",
  "complete",
  "needs_changes",
  "rejected",
] as const;

const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  gl_code: z.string(),
});
const departmentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
});
const attachmentSchema = z.object({
  id: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  byte_size: z.number(),
  sort_order: z.number(),
  created_at: z.string(),
  url: z.string().nullable(),
});

export const reimbursementSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    event_id: z.string().nullable(),
    event_name: z.string().nullable(),
    item: z.string(),
    amount: z.coerce.number().positive(),
    category: categorySchema,
    department: departmentSchema,
    etransfer_email: z.string().email(),
    etransfer_full_name: z.string().nullable(),
    purchase_date: z.iso.date().nullable(),
    vendor: z.string().nullable(),
    vendor_reference: z.string().nullable(),
    notes: z.string().nullable(),
    status: z.enum(REIMBURSEMENT_STATUSES),
    status_reason: z.string().nullable(),
    instruction_version: z.number().nullable(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
    attachments: z.array(attachmentSchema),
  })
  .transform((request) => ({
    id: request.id,
    userId: request.user_id,
    eventId: request.event_id,
    eventName: request.event_name,
    item: request.item,
    amount: request.amount,
    category: {
      id: request.category.id,
      slug: request.category.slug,
      label: request.category.label,
      glCode: request.category.gl_code,
    },
    department: {
      id: request.department.id,
      slug: request.department.slug,
      label: request.department.label,
    },
    etransferEmail: request.etransfer_email,
    etransferFullName: request.etransfer_full_name,
    purchaseDate: request.purchase_date,
    vendor: request.vendor,
    vendorReference: request.vendor_reference,
    notes: request.notes,
    status: request.status,
    statusReason: request.status_reason,
    instructionVersion: request.instruction_version,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    attachments: request.attachments.map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.original_filename,
      mimeType: attachment.mime_type,
      byteSize: attachment.byte_size,
      sortOrder: attachment.sort_order,
      createdAt: attachment.created_at,
      url: attachment.url,
    })),
  }));

export const reimbursementListSchema = z.array(reimbursementSchema);
export const reimbursementConfigSchema = z.object({
  categories: z.array(categorySchema),
  departments: z.array(departmentSchema),
  instruction: z
    .object({
      content: z.string(),
      version: z.number(),
      updated_at: z.string(),
    })
    .nullable(),
});

export type Reimbursement = z.output<typeof reimbursementSchema>;
export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];
export type ReimbursementConfig = z.output<typeof reimbursementConfigSchema>;
