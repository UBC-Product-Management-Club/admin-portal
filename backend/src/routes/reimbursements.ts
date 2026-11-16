import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";

import { HttpError } from "../lib/http-error.js";
import {
  REIMBURSEMENT_CATEGORIES,
  type ReimbursementStore,
} from "../lib/reimbursements.js";

// Matches the receipts bucket's own limits.
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const isReceiptType = (mimetype: string) =>
  mimetype.startsWith("image/") || mimetype === "application/pdf";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => s || null);

const newRequestSchema = z.object({
  item: z.string().trim().min(1),
  // Dollars and cents, to match the column's numeric(10, 2).
  amount: z
    .string()
    .regex(/^\d{1,8}(\.\d{1,2})?$/, "Enter an amount like 12.50")
    .transform(Number)
    .refine((n) => n > 0, "Amount must be more than $0"),
  category: z.enum(REIMBURSEMENT_CATEGORIES),
  etransfer_email: z.email(),
  purchase_date: z.iso
    .date()
    .optional()
    .transform((d) => d ?? null),
  event_id: z
    .guid()
    .optional()
    .transform((id) => id ?? null),
  notes: optionalText,
});

const idParamsSchema = z.object({ id: z.guid() });
const reviewSchema = z.object({
  status: z.enum(["approved", "rejected", "paid"]),
  reviewer_note: z
    .string()
    .trim()
    .nullish()
    .transform((s) => s || null),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT_BYTES, files: 1 },
});

/** Reports upload problems as 400s instead of server errors. */
const receiptUpload: RequestHandler = (req, res, next) => {
  upload.single("receipt")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          err.code === "LIMIT_FILE_SIZE"
            ? "Receipts can be up to 10 MB"
            : err.message,
        ),
      );
      return;
    }
    next(err);
  });
};

export function createReimbursementsRouter(reimbursements: ReimbursementStore) {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await reimbursements.listForUser(currentUserId(res.locals)));
  });

  router.post("/", receiptUpload, async (req, res) => {
    const request = newRequestSchema.parse(req.body);
    const receipt = req.file;
    if (!receipt) {
      throw new HttpError(400, "VALIDATION_ERROR", "Attach a receipt");
    }
    if (!isReceiptType(receipt.mimetype)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Receipts must be an image or a PDF",
      );
    }
    res
      .status(201)
      .json(
        await reimbursements.submit(
          currentUserId(res.locals),
          request,
          receipt,
        ),
      );
  });

  router.patch("/:id", async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const { status, reviewer_note } = reviewSchema.parse(req.body);
    res.json(
      await reimbursements.review(
        id,
        status,
        currentUserId(res.locals),
        reviewer_note,
      ),
    );
  });

  return router;
}

function currentUserId(locals: { user?: { id: string } }) {
  if (!locals.user) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing user");
  }
  return locals.user.id;
}
