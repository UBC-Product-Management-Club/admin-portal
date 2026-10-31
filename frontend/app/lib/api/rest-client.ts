import type { z } from "zod";

import { getEnv } from "~/lib/env";
import { getSupabase } from "~/lib/supabase";
import { apiErrorSchema } from "~/lib/types/api-error";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Body = Record<string, unknown> | FormData;

/**
 * Single place for fetch + auth-header logic. Every response is parsed through
 * a Zod schema before it reaches a component, so backend shape drift fails loudly.
 */
export class RestClient {
  private static instance: RestClient | undefined;

  static getInstance(): RestClient {
    RestClient.instance ??= new RestClient();
    return RestClient.instance;
  }

  private constructor() {}

  get<T extends z.ZodType>(path: string, schema: T) {
    return this.request("GET", path, schema);
  }

  post<T extends z.ZodType>(path: string, schema: T, body?: Body) {
    return this.request("POST", path, schema, body);
  }

  patch<T extends z.ZodType>(path: string, schema: T, body?: Body) {
    return this.request("PATCH", path, schema, body);
  }

  private async request<T extends z.ZodType>(
    method: string,
    path: string,
    schema: T,
    body?: Body,
  ): Promise<z.output<T>> {
    const headers = new Headers(await this.authHeaders());
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      headers.set("Content-Type", "application/json");
      payload = JSON.stringify(body);
    }

    const res = await fetch(`${getEnv().VITE_API_URL}/api/v2/admin${path}`, {
      method,
      headers,
      body: payload,
    });
    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const parsed = apiErrorSchema.safeParse(json);
      throw parsed.success
        ? new ApiError(
            res.status,
            parsed.data.error.code,
            parsed.data.error.message,
          )
        : new ApiError(
            res.status,
            "UNKNOWN",
            res.statusText || "Request failed",
          );
    }

    return schema.parse(json);
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
