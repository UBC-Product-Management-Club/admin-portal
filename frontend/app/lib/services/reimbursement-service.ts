import { BaseService } from "~/lib/api/base-service";
import {
  reimbursementListSchema,
  reimbursementSchema,
} from "~/lib/types/reimbursement";

class ReimbursementService extends BaseService {
  async listMyRequests() {
    return (await this.client()).get(
      "/reimbursements",
      reimbursementListSchema,
    );
  }

  /** Multipart so the receipt file travels with the request. */
  async submitRequest(form: FormData) {
    return (await this.client()).post(
      "/reimbursements",
      reimbursementSchema,
      form,
    );
  }
}

export const reimbursementService = new ReimbursementService();
