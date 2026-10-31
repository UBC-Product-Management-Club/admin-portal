import { z } from "zod";

// Backend error format: { "error": { "code": "NOT_FOUND", "message": "..." } }
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
