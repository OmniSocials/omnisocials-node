import type { OmniSocials } from "../client.js";
import type { Account, AccountsListResponse, ItemResponse } from "../types.js";

export class AccountsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /accounts` - the workspace's connected social accounts. The
   * response also carries the active workspace's identity top-level
   * (`workspace_id`, `workspace_name`, `workspace_icon`), a sibling of `data`.
   */
  list(): Promise<AccountsListResponse> {
    return this.client.get("/accounts");
  }

  /** `GET /accounts/:id` - a single connected account. */
  get(id: string): Promise<ItemResponse<Account>> {
    return this.client.get(`/accounts/${encodeURIComponent(id)}`);
  }
}
