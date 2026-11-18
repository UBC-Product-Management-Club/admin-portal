import { BaseService } from "~/lib/api/base-service";
import {
  okSchema,
  reimbursementCategorySchema,
  reimbursementConfigSchema,
  reimbursementInstructionSchema,
  reimbursementListSchema,
  reimbursementSchema,
  type ReimbursementStatus,
} from "~/lib/types/reimbursement";

class FinanceReimbursementService extends BaseService {
  async getSettings() {
    return (await this.client()).get("/finance/settings", reimbursementConfigSchema);
  }

  async updateInstructions(content: string) {
    return (await this.client()).put(
      "/finance/settings/instructions",
      reimbursementInstructionSchema,
      { content },
    );
  }

  async addCategory(input: { label: string; gl_code: string }) {
    return (await this.client()).post(
      "/finance/settings/categories",
      reimbursementCategorySchema,
      input,
    );
  }

  async removeCategory(categoryId: string) {
    return (await this.client()).patch(
      `/finance/settings/categories/${encodeURIComponent(categoryId)}/archive`,
      okSchema,
    );
  }

  async listTickets() {
    return (await this.client()).get(
      "/finance/reimbursements",
      reimbursementListSchema,
    );
  }

  async getTicket(reimbursementId: string) {
    return (await this.client()).get(
      `/finance/reimbursements/${encodeURIComponent(reimbursementId)}`,
      reimbursementSchema,
    );
  }

  async updateStatus(
    reimbursementId: string,
    input: { status: ReimbursementStatus; reason?: string | null },
  ) {
    return (await this.client()).patch(
      `/finance/reimbursements/${encodeURIComponent(reimbursementId)}/status`,
      reimbursementSchema,
      input,
    );
  }
}

export const financeReimbursementService = new FinanceReimbursementService();
