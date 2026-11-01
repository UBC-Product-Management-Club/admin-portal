import { getApiClient, type ApiClient } from "~/lib/api/api-client";

/** Feature services extend this; it picks the real or mock client. */
export abstract class BaseService {
  protected client(): Promise<ApiClient> {
    return getApiClient();
  }
}
