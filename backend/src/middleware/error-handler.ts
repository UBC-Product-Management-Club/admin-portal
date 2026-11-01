import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { HttpError } from "../lib/http-error.js";

export const notFound: RequestHandler = (req) => {
  throw new HttpError(
    404,
    "NOT_FOUND",
    `No route for ${req.method} ${req.path}`,
  );
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    return;
  }
  console.error(err);
  res
    .status(500)
    .json({ error: { code: "INTERNAL", message: "Internal server error" } });
};
