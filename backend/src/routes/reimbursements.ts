import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import {
  reimbursementInputSchema,
  type ReceiptUpload,
  type ReimbursementStore,
} from "../lib/reimbursements.js";

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const supportedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const requestParamsSchema = z.object({ reimbursementId: z.string().uuid() });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_ATTACHMENTS, fileSize: MAX_ATTACHMENT_BYTES },
  fileFilter: (_req, file, callback) => {
    if (supportedMimeTypes.has(file.mimetype)) callback(null, true);
    else
      callback(
        new Error(
          "Unsupported receipt type. Upload a PDF, JPEG, PNG, WebP, HEIC, or HEIF file.",
        ),
      );
  },
});

export function createReimbursementsRouter(reimbursements: ReimbursementStore) {
  const router = Router();

  router.get("/config", async (_req, res) => {
    res.json(await reimbursements.getFormConfig());
  });

  router.get("/", async (_req, res) => {
    res.json(await reimbursements.listForUser(res.locals.user!.id));
  });

  router.post(
    "/",
    upload.array("attachments", MAX_ATTACHMENTS),
    async (req, res) => {
      res
        .status(201)
        .json(
          await reimbursements.create(
            res.locals.user!.id,
            parseInput(req.body),
            asReceiptUploads(req.files),
          ),
        );
    },
  );

  router.get("/:reimbursementId", async (req, res) => {
    const { reimbursementId } = requestParamsSchema.parse(req.params);
    res.json(
      await reimbursements.getForUser(reimbursementId, res.locals.user!.id),
    );
  });

  router.patch(
    "/:reimbursementId",
    upload.array("attachments", MAX_ATTACHMENTS),
    async (req, res) => {
      const { reimbursementId } = requestParamsSchema.parse(req.params);
      res.json(
        await reimbursements.update(
          reimbursementId,
          res.locals.user!.id,
          parseInput(req.body),
          asReceiptUploads(req.files),
          values(req.body.remove_attachment_ids),
        ),
      );
    },
  );

  return router;
}

function parseInput(body: Record<string, unknown>) {
  return reimbursementInputSchema.parse({
    ...body,
    event_id: blankToNull(body.event_id),
    vendor: blankToNull(body.vendor),
    vendor_reference: blankToNull(body.vendor_reference),
    notes: blankToNull(body.notes),
  });
}

function blankToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function values(value: unknown) {
  return z
    .array(z.string().uuid())
    .parse(value === undefined ? [] : Array.isArray(value) ? value : [value]);
}

function asReceiptUploads(files: Express.Request["files"]): ReceiptUpload[] {
  const uploaded = Array.isArray(files) ? files : [];
  return uploaded.map(({ buffer, originalname, mimetype, size }) => ({
    buffer,
    originalname,
    mimetype,
    size,
  }));
}
