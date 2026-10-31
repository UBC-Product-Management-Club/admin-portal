import { RestClient } from "~/lib/api/rest-client";

/** Feature services (users, events, reimbursements, budget) extend this. */
export abstract class BaseService {
  protected readonly client = RestClient.getInstance();
}
