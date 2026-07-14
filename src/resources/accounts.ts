import type { OmniSocials } from "../client.js";
import type { Account, ItemResponse, ListResponse } from "../types.js";

export class AccountsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /accounts` - the workspace's connected social accounts. */
  list(): Promise<ListResponse<Account>> {
    return this.client.get("/accounts");
  }

  /** `GET /accounts/:id` - a single connected account. */
  get(id: string): Promise<ItemResponse<Account>> {
    return this.client.get(`/accounts/${encodeURIComponent(id)}`);
  }
}
