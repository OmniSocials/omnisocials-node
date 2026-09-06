import type { OmniSocials } from "../client.js";
import type { ApprovalWorkflow, ListResponse } from "../types.js";

/**
 * Approval workflows are configured in the OmniSocials dashboard (Approvals);
 * the API lists them so a post can be routed through one at create time via
 * `posts.create({ approval_workflow_id })`.
 */
export class ApprovalWorkflowsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /approval-workflows` - the workflows this workspace can use
   * (company-wide plus workspace-bound), with steps and named approvers.
   */
  list(): Promise<ListResponse<ApprovalWorkflow>> {
    return this.client.get("/approval-workflows");
  }
}
