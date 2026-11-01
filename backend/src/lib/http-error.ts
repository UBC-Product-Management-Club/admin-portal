/** Serialized as { "error": { "code", "message" } } by the error handler. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notImplemented = () =>
  new HttpError(501, "NOT_IMPLEMENTED", "Endpoint not implemented yet");
