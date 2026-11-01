import { BaseService } from "~/lib/api/base-service";
import { basicEventListSchema } from "~/lib/types/event";
import { userListSchema } from "~/lib/types/user";

class UserService extends BaseService {
  async listUsers() {
    return (await this.client()).get("/users", userListSchema);
  }

  /** Events the member checked in to. Not in HLD 6.1 yet; needed for FR-6. */
  async listEventsAttended(userId: string) {
    return (await this.client()).get(
      `/users/${encodeURIComponent(userId)}/events`,
      basicEventListSchema,
    );
  }
}

export const userService = new UserService();
