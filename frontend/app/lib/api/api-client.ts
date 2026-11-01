import type { z } from "zod";

import { getEnv } from "~/lib/env";

export type RequestBody = Record<string, unknown> | FormData;

/** Shared by RestClient (real backend) and MockClient (dev data). */
export interface ApiClient {
  get<T extends z.ZodType>(path: string, schema: T): Promise<z.output<T>>;
  post<T extends z.ZodType>(
    path: string,
    schema: T,
    body?: RequestBody,
  ): Promise<z.output<T>>;
  patch<T extends z.ZodType>(
    path: string,
    schema: T,
    body?: RequestBody,
  ): Promise<z.output<T>>;
}

let client: ApiClient | undefined;

export async function getApiClient(): Promise<ApiClient> {
  if (!client) {
    // Dynamic imports keep mock data out of the bundle when mocks are off.
    if (getEnv().VITE_USE_MOCKS) {
      const { MockClient } = await import("~/lib/api/mock-client");
      client = new MockClient();
    } else {
      const { RestClient } = await import("~/lib/api/rest-client");
      client = RestClient.getInstance();
    }
  }
  return client;
}
