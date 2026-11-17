import { BaseService } from "~/lib/api/base-service";
import {
  reimbursementConfigSchema,
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

  async getFormConfig() {
    return (await this.client()).get(
      "/reimbursements/config",
      reimbursementConfigSchema,
    );
  }

  async getRequest(reimbursementId: string) {
    return (await this.client()).get(
      `/reimbursements/${encodeURIComponent(reimbursementId)}`,
      reimbursementSchema,
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

  async updateRequest(reimbursementId: string, form: FormData) {
    return (await this.client()).patch(
      `/reimbursements/${encodeURIComponent(reimbursementId)}`,
      reimbursementSchema,
      form,
    );
  }
}

export const reimbursementService = new ReimbursementService();
