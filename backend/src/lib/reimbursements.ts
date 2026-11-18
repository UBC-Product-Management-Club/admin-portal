import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { HttpError } from "./http-error.js";

const workflowStatuses = [
  "pending",
  "in_transit",
  "complete",
  "needs_changes",
  "rejected",
] as const;

const categoryRowSchema = z.object({
  reimbursement_category_id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  gl_code: z.string(),
  sort_order: z.number(),
});
const departmentRowSchema = z.object({
  reimbursement_department_id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  sort_order: z.number(),
});
const instructionRowSchema = z.object({
  content: z.string(),
  version: z.number(),
  updated_at: z.string(),
});
const reimbursementRowSchema = z.object({
  reimbursement_id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  item: z.string(),
  amount: z.coerce.number(),
  etransfer_email: z.string(),
  etransfer_full_name: z.string().nullable(),
  purchase_date: z.string().nullable(),
  notes: z.string().nullable(),
  vendor: z.string().nullable(),
  vendor_reference: z.string().nullable(),
  reimbursement_category_id: z.string().uuid().nullable(),
  reimbursement_department_id: z.string().uuid().nullable(),
  workflow_status: z.enum(workflowStatuses),
  workflow_reason: z.string().nullable(),
  instruction_version: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
const attachmentRowSchema = z.object({
  reimbursement_attachment_id: z.string().uuid(),
  reimbursement_id: z.string().uuid(),
  original_filename: z.string(),
  mime_type: z.string(),
  byte_size: z.number(),
  sort_order: z.number(),
  storage_path: z.string(),
  created_at: z.string(),
});

export const reimbursementInputSchema = z.object({
  item: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive().max(100_000),
  category_id: z.string().uuid(),
  department_id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  purchase_date: z.iso.date(),
  etransfer_email: z.string().trim().email().max(254),
  etransfer_full_name: z.string().trim().min(1).max(160),
  vendor: z.string().trim().max(160).nullable(),
  vendor_reference: z.string().trim().max(160).nullable(),
  notes: z.string().trim().max(5_000).nullable(),
});

export type ReimbursementInput = z.output<typeof reimbursementInputSchema>;
export const financeStatusInputSchema = z
  .object({
    status: z.enum(workflowStatuses),
    reason: z.string().trim().max(2_000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      ["needs_changes", "rejected"].includes(value.status) &&
      !value.reason?.trim()
    )
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Provide a reason for Needs Changes or Rejected",
      });
  });
export type FinanceStatusInput = z.output<typeof financeStatusInputSchema>;
export const financeInstructionInputSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
});
export type FinanceInstructionInput = z.output<typeof financeInstructionInputSchema>;
export const financeCategoryInputSchema = z.object({
  label: z.string().trim().min(1).max(160),
  gl_code: z.string().trim().min(1).max(32),
});
export type FinanceCategoryInput = z.output<typeof financeCategoryInputSchema>;
export type FinanceReimbursementFilters = {
  status?: (typeof workflowStatuses)[number];
  departmentId?: string;
  eventId?: string;
};

export type ReceiptUpload = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type ReimbursementStore = {
  getFormConfig(): Promise<unknown>;
  listForUser(userId: string): Promise<unknown[]>;
  getForUser(reimbursementId: string, userId: string): Promise<unknown>;
  create(
    userId: string,
    input: ReimbursementInput,
    attachments: ReceiptUpload[],
  ): Promise<unknown>;
  update(
    reimbursementId: string,
    userId: string,
    input: ReimbursementInput,
    attachments: ReceiptUpload[],
    removedAttachmentIds: string[],
  ): Promise<unknown>;
  listForFinance(filters: FinanceReimbursementFilters): Promise<unknown[]>;
  getForFinance(reimbursementId: string): Promise<unknown>;
  updateFinanceStatus(
    reimbursementId: string,
    actorId: string,
    input: FinanceStatusInput,
  ): Promise<unknown>;
  updateFinanceInstructions(
    actorId: string,
    input: FinanceInstructionInput,
  ): Promise<unknown>;
  createFinanceCategory(input: FinanceCategoryInput): Promise<unknown>;
  archiveFinanceCategory(categoryId: string): Promise<void>;
};

type ReimbursementRow = z.output<typeof reimbursementRowSchema>;
type AttachmentRow = z.output<typeof attachmentRowSchema>;

const RECEIPT_URL_TTL_SECONDS = 60 * 10;

export function createReimbursementStore(
  db: SupabaseClient,
  bucket: string,
): ReimbursementStore {
  async function activeConfig() {
    const [categoriesResult, departmentsResult, instructionResult] =
      await Promise.all([
        db
          .from("ReimbursementCategory")
          .select("reimbursement_category_id,slug,label,gl_code,sort_order")
          .eq("is_active", true)
          .is("archived_at", null)
          .order("sort_order"),
        db
          .from("ReimbursementDepartment")
          .select("reimbursement_department_id,slug,label,sort_order")
          .eq("is_active", true)
          .is("archived_at", null)
          .order("sort_order"),
        db
          .from("ReimbursementInstruction")
          .select("content,version,updated_at")
          .eq("reimbursement_instruction_id", true)
          .maybeSingle(),
      ]);
    if (categoriesResult.error) throw categoriesResult.error;
    if (departmentsResult.error) throw departmentsResult.error;
    if (instructionResult.error) throw instructionResult.error;
    return {
      categories: z.array(categoryRowSchema).parse(categoriesResult.data),
      departments: z.array(departmentRowSchema).parse(departmentsResult.data),
      instruction: instructionResult.data
        ? instructionRowSchema.parse(instructionResult.data)
        : null,
    };
  }

  async function getRowsForUser(userId: string, reimbursementId?: string) {
    let query = db
      .from("Reimbursement")
      .select(
        "reimbursement_id,user_id,event_id,item,amount,etransfer_email,etransfer_full_name,purchase_date,notes,vendor,vendor_reference,reimbursement_category_id,reimbursement_department_id,workflow_status,workflow_reason,instruction_version,created_at,updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (reimbursementId) query = query.eq("reimbursement_id", reimbursementId);
    const { data, error } = await query;
    if (error) throw error;
    return z.array(reimbursementRowSchema).parse(data);
  }

  async function getRowsForFinance(
    filters: FinanceReimbursementFilters,
    reimbursementId?: string,
  ) {
    let query = db
      .from("Reimbursement")
      .select(
        "reimbursement_id,user_id,event_id,item,amount,etransfer_email,etransfer_full_name,purchase_date,notes,vendor,vendor_reference,reimbursement_category_id,reimbursement_department_id,workflow_status,workflow_reason,instruction_version,created_at,updated_at",
      )
      .order("created_at", { ascending: false });
    if (reimbursementId) query = query.eq("reimbursement_id", reimbursementId);
    if (filters.status) query = query.eq("workflow_status", filters.status);
    if (filters.departmentId)
      query = query.eq("reimbursement_department_id", filters.departmentId);
    if (filters.eventId) query = query.eq("event_id", filters.eventId);
    const { data, error } = await query;
    if (error) throw error;
    return z.array(reimbursementRowSchema).parse(data);
  }

  async function serializeRows(rows: ReimbursementRow[]) {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.reimbursement_id);
    const eventIds = rows
      .map((row) => row.event_id)
      .filter((id): id is string => id !== null);
    const [
      categoriesResult,
      departmentsResult,
      attachmentsResult,
      eventsResult,
    ] = await Promise.all([
      db
        .from("ReimbursementCategory")
        .select("reimbursement_category_id,slug,label,gl_code,sort_order"),
      db
        .from("ReimbursementDepartment")
        .select("reimbursement_department_id,slug,label,sort_order"),
      db
        .from("ReimbursementAttachment")
        .select(
          "reimbursement_attachment_id,reimbursement_id,original_filename,mime_type,byte_size,sort_order,storage_path,created_at",
        )
        .in("reimbursement_id", ids)
        .is("retired_at", null)
        .order("sort_order"),
      eventIds.length > 0
        ? db.from("Event").select("event_id,name").in("event_id", eventIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (categoriesResult.error) throw categoriesResult.error;
    if (departmentsResult.error) throw departmentsResult.error;
    if (attachmentsResult.error) throw attachmentsResult.error;
    if (eventsResult.error) throw eventsResult.error;
    const categories = new Map(
      z
        .array(categoryRowSchema)
        .parse(categoriesResult.data)
        .map((row) => [row.reimbursement_category_id, row]),
    );
    const departments = new Map(
      z
        .array(departmentRowSchema)
        .parse(departmentsResult.data)
        .map((row) => [row.reimbursement_department_id, row]),
    );
    const eventNames = new Map(
      z
        .array(z.object({ event_id: z.string().uuid(), name: z.string() }))
        .parse(eventsResult.data)
        .map((row) => [row.event_id, row.name]),
    );
    const attachmentsByRequest = new Map<string, AttachmentRow[]>();
    for (const attachment of z
      .array(attachmentRowSchema)
      .parse(attachmentsResult.data)) {
      const current =
        attachmentsByRequest.get(attachment.reimbursement_id) ?? [];
      current.push(attachment);
      attachmentsByRequest.set(attachment.reimbursement_id, current);
    }
    const paths = [...attachmentsByRequest.values()]
      .flat()
      .map((attachment) => attachment.storage_path);
    const urlByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUrls(paths, RECEIPT_URL_TTL_SECONDS);
      if (error) throw error;
      for (const signed of data) {
        if (signed.path && signed.signedUrl)
          urlByPath.set(signed.path, signed.signedUrl);
      }
    }
    return rows.map((row) => {
      const category = row.reimbursement_category_id
        ? categories.get(row.reimbursement_category_id)
        : undefined;
      const department = row.reimbursement_department_id
        ? departments.get(row.reimbursement_department_id)
        : undefined;
      if (!category || !department)
        throw new HttpError(
          409,
          "REIMBURSEMENT_CONFIGURATION_MISSING",
          "This reimbursement refers to archived configuration",
        );
      return {
        id: row.reimbursement_id,
        user_id: row.user_id,
        event_id: row.event_id,
        event_name: row.event_id
          ? (eventNames.get(row.event_id) ?? null)
          : null,
        item: row.item,
        amount: row.amount,
        category: {
          id: category.reimbursement_category_id,
          slug: category.slug,
          label: category.label,
          gl_code: category.gl_code,
        },
        department: {
          id: department.reimbursement_department_id,
          slug: department.slug,
          label: department.label,
        },
        etransfer_email: row.etransfer_email,
        etransfer_full_name: row.etransfer_full_name,
        purchase_date: row.purchase_date,
        vendor: row.vendor,
        vendor_reference: row.vendor_reference,
        notes: row.notes,
        status: row.workflow_status,
        status_reason: row.workflow_reason,
        instruction_version: row.instruction_version,
        created_at: row.created_at,
        updated_at: row.updated_at,
        attachments: (attachmentsByRequest.get(row.reimbursement_id) ?? []).map(
          (attachment) => ({
            id: attachment.reimbursement_attachment_id,
            original_filename: attachment.original_filename,
            mime_type: attachment.mime_type,
            byte_size: attachment.byte_size,
            sort_order: attachment.sort_order,
            created_at: attachment.created_at,
            url: urlByPath.get(attachment.storage_path) ?? null,
          }),
        ),
      };
    });
  }

  async function assertInputUsesActiveConfig(input: ReimbursementInput) {
    const config = await activeConfig();
    if (
      !config.categories.some(
        (row) => row.reimbursement_category_id === input.category_id,
      )
    )
      throw new HttpError(
        400,
        "INVALID_CATEGORY",
        "Select an active expense category",
      );
    if (
      !config.departments.some(
        (row) => row.reimbursement_department_id === input.department_id,
      )
    )
      throw new HttpError(
        400,
        "INVALID_DEPARTMENT",
        "Select an active department",
      );
    return config.instruction;
  }

  async function uploadAttachments(
    reimbursementId: string,
    userId: string,
    files: ReceiptUpload[],
    startingSortOrder: number,
  ) {
    const writtenPaths: string[] = [];
    try {
      const records = [];
      for (const [index, file] of files.entries()) {
        const storagePath = `${userId}/${reimbursementId}/${randomUUID()}.${extensionFor(file.originalname, file.mimetype)}`;
        const { error } = await db.storage
          .from(bucket)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
        if (error) throw error;
        writtenPaths.push(storagePath);
        records.push({
          reimbursement_id: reimbursementId,
          storage_path: storagePath,
          original_filename: safeFilename(file.originalname),
          mime_type: file.mimetype,
          byte_size: file.size,
          sort_order: startingSortOrder + index,
          uploaded_by: userId,
        });
      }
      if (records.length > 0) {
        const { error } = await db
          .from("ReimbursementAttachment")
          .insert(records);
        if (error) throw error;
      }
    } catch (error) {
      if (writtenPaths.length > 0)
        await db.storage.from(bucket).remove(writtenPaths);
      throw error;
    }
  }

  return {
    async getFormConfig() {
      const config = await activeConfig();
      return {
        categories: config.categories.map((category) => ({
          id: category.reimbursement_category_id,
          slug: category.slug,
          label: category.label,
          gl_code: category.gl_code,
        })),
        departments: config.departments.map((department) => ({
          id: department.reimbursement_department_id,
          slug: department.slug,
          label: department.label,
        })),
        instruction: config.instruction,
      };
    },
    async listForUser(userId) {
      return serializeRows(await getRowsForUser(userId));
    },
    async listForFinance(filters) {
      return serializeRows(await getRowsForFinance(filters));
    },
    async getForUser(reimbursementId, userId) {
      const rows = await getRowsForUser(userId, reimbursementId);
      if (rows.length === 0)
        throw new HttpError(
          404,
          "NOT_FOUND",
          "Reimbursement request not found",
        );
      return (await serializeRows(rows))[0];
    },
    async getForFinance(reimbursementId) {
      const rows = await getRowsForFinance({}, reimbursementId);
      if (rows.length === 0)
        throw new HttpError(404, "NOT_FOUND", "Reimbursement request not found");
      return (await serializeRows(rows))[0];
    },
    async updateFinanceStatus(reimbursementId, actorId, input) {
      const current = await getRowsForFinance({}, reimbursementId);
      const ticket = current[0];
      if (!ticket)
        throw new HttpError(404, "NOT_FOUND", "Reimbursement request not found");
      const reason = input.reason?.trim() || null;
      const { error } = await db
        .from("Reimbursement")
        .update({
          workflow_status: input.status,
          workflow_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("reimbursement_id", reimbursementId);
      if (error) throw error;
      if (ticket.workflow_status !== input.status || ticket.workflow_reason !== reason) {
        const { error: eventError } = await db
          .from("ReimbursementStatusEvent")
          .insert({
            reimbursement_id: reimbursementId,
            from_status: ticket.workflow_status,
            to_status: input.status,
            reason,
            source: "finance_manual",
            actor_id: actorId,
          });
        if (eventError) throw eventError;
      }
      return this.getForFinance(reimbursementId);
    },
    async updateFinanceInstructions(actorId, input) {
      const { data: current, error: currentError } = await db
        .from("ReimbursementInstruction")
        .select("version")
        .eq("reimbursement_instruction_id", true)
        .maybeSingle();
      if (currentError) throw currentError;
      const { data, error } = await db
        .from("ReimbursementInstruction")
        .upsert({
          reimbursement_instruction_id: true,
          content: input.content,
          version: (current?.version ?? 0) + 1,
          updated_by: actorId,
          updated_at: new Date().toISOString(),
        })
        .select("content,version,updated_at")
        .single();
      if (error) throw error;
      return instructionRowSchema.parse(data);
    },
    async createFinanceCategory(input) {
      const slug = input.label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (!slug)
        throw new HttpError(400, "INVALID_CATEGORY", "Enter a valid category name");
      const { data: lastCategory, error: lastCategoryError } = await db
        .from("ReimbursementCategory")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastCategoryError) throw lastCategoryError;
      const { data, error } = await db
        .from("ReimbursementCategory")
        .insert({
          slug,
          label: input.label,
          gl_code: input.gl_code,
          sort_order: (lastCategory?.sort_order ?? 0) + 10,
        })
        .select("reimbursement_category_id,slug,label,gl_code,sort_order")
        .single();
      if (error) throw error;
      const category = categoryRowSchema.parse(data);
      return {
        id: category.reimbursement_category_id,
        slug: category.slug,
        label: category.label,
        gl_code: category.gl_code,
      };
    },
    async archiveFinanceCategory(categoryId) {
      const { error } = await db
        .from("ReimbursementCategory")
        .update({ is_active: false, archived_at: new Date().toISOString() })
        .eq("reimbursement_category_id", categoryId);
      if (error) throw error;
    },
    async create(userId, input, attachments) {
      if (attachments.length === 0)
        throw new HttpError(
          400,
          "RECEIPT_REQUIRED",
          "Attach at least one receipt",
        );
      const instruction = await assertInputUsesActiveConfig(input);
      const { data, error } = await db
        .from("Reimbursement")
        .insert({
          user_id: userId,
          event_id: input.event_id,
          item: input.item,
          amount: input.amount,
          // Kept for compatibility with the legacy enum from migration 001.
          category: "other",
          receipt_path: null,
          etransfer_email: input.etransfer_email,
          purchase_date: input.purchase_date,
          notes: input.notes,
          reimbursement_category_id: input.category_id,
          reimbursement_department_id: input.department_id,
          etransfer_full_name: input.etransfer_full_name,
          vendor: input.vendor,
          vendor_reference: input.vendor_reference,
          workflow_status: "pending",
          workflow_reason: null,
          instruction_version: instruction?.version ?? null,
        })
        .select("reimbursement_id")
        .single();
      if (error) throw error;
      const reimbursementId = z
        .object({ reimbursement_id: z.string().uuid() })
        .parse(data).reimbursement_id;
      await uploadAttachments(reimbursementId, userId, attachments, 0);
      const { error: eventError } = await db
        .from("ReimbursementStatusEvent")
        .insert({
          reimbursement_id: reimbursementId,
          from_status: null,
          to_status: "pending",
          source: "submitter",
          actor_id: userId,
        });
      if (eventError) throw eventError;
      const { error: outboxError } = await db
        .from("ReimbursementOutbox")
        .insert({
          reimbursement_id: reimbursementId,
          kind: "google_drive_sync",
        });
      if (outboxError) throw outboxError;
      return this.getForUser(reimbursementId, userId);
    },
    async update(
      reimbursementId,
      userId,
      input,
      attachments,
      removedAttachmentIds,
    ) {
      const existing = await getRowsForUser(userId, reimbursementId);
      const ticket = existing[0];
      if (!ticket)
        throw new HttpError(
          404,
          "NOT_FOUND",
          "Reimbursement request not found",
        );
      if (!["pending", "needs_changes"].includes(ticket.workflow_status))
        throw new HttpError(
          409,
          "REIMBURSEMENT_LOCKED",
          "Only Pending or Needs Changes requests can be edited",
        );
      const instruction = await assertInputUsesActiveConfig(input);
      const { data: activeAttachments, error: attachmentsError } = await db
        .from("ReimbursementAttachment")
        .select("reimbursement_attachment_id,sort_order")
        .eq("reimbursement_id", reimbursementId)
        .is("retired_at", null)
        .order("sort_order");
      if (attachmentsError) throw attachmentsError;
      const active = z
        .array(
          z.object({
            reimbursement_attachment_id: z.string().uuid(),
            sort_order: z.number(),
          }),
        )
        .parse(activeAttachments);
      const removals = new Set(removedAttachmentIds);
      if (
        removedAttachmentIds.some(
          (id) =>
            !active.some((file) => file.reimbursement_attachment_id === id),
        )
      )
        throw new HttpError(
          400,
          "INVALID_ATTACHMENT",
          "One or more receipts cannot be removed",
        );
      if (active.length - removals.size + attachments.length < 1)
        throw new HttpError(
          400,
          "RECEIPT_REQUIRED",
          "Keep or attach at least one receipt",
        );
      if (removals.size > 0) {
        const { error } = await db
          .from("ReimbursementAttachment")
          .update({ retired_at: new Date().toISOString(), retired_by: userId })
          .in("reimbursement_attachment_id", [...removals])
          .eq("reimbursement_id", reimbursementId);
        if (error) throw error;
      }
      await uploadAttachments(
        reimbursementId,
        userId,
        attachments,
        active.reduce(
          (highest, file) => Math.max(highest, file.sort_order),
          -1,
        ) + 1,
      );
      const nextStatus =
        ticket.workflow_status === "needs_changes"
          ? "pending"
          : ticket.workflow_status;
      const { error } = await db
        .from("Reimbursement")
        .update({
          event_id: input.event_id,
          item: input.item,
          amount: input.amount,
          etransfer_email: input.etransfer_email,
          purchase_date: input.purchase_date,
          notes: input.notes,
          reimbursement_category_id: input.category_id,
          reimbursement_department_id: input.department_id,
          etransfer_full_name: input.etransfer_full_name,
          vendor: input.vendor,
          vendor_reference: input.vendor_reference,
          workflow_status: nextStatus,
          workflow_reason: null,
          instruction_version: instruction?.version ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("reimbursement_id", reimbursementId)
        .eq("user_id", userId);
      if (error) throw error;
      if (nextStatus !== ticket.workflow_status) {
        const { error: eventError } = await db
          .from("ReimbursementStatusEvent")
          .insert({
            reimbursement_id: reimbursementId,
            from_status: ticket.workflow_status,
            to_status: nextStatus,
            source: "submitter",
            actor_id: userId,
          });
        if (eventError) throw eventError;
      }
      const { error: outboxError } = await db
        .from("ReimbursementOutbox")
        .insert({
          reimbursement_id: reimbursementId,
          kind: "google_drive_sync",
        });
      if (outboxError) throw outboxError;
      return this.getForUser(reimbursementId, userId);
    },
  };
}

function safeFilename(filename: string) {
  const normalized = Array.from(filename, (character) =>
    character === "/" || character === "\\" || character.charCodeAt(0) < 32
      ? "_"
      : character,
  ).join("");
  return normalized.slice(0, 255) || "receipt";
}
function extensionFor(filename: string, mimeType: string) {
  const fromName = filename.split(".").at(-1)?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,10}$/.test(fromName)) return fromName;
  return (
    {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
      "image/heif": "heif",
    }[mimeType] ?? "file"
  );
}
