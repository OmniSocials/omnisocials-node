import type { OmniSocials } from "../client.js";
import type { Account, AccountsListResponse, ItemResponse, UpdateAccountParams } from "../types.js";

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

  /**
   * `PATCH /accounts/:id` - change how often the X statistics of an X
   * account are read: `{ x_statistics: { posts: "light", followers: "daily" } }`.
   * Send one key or both; only the keys you give are sent. X bills every
   * read and OmniSocials passes X's price on as credits (half a credit per
   * post check, plus half for a video or GIF, 1 credit per follower count).
   * Needs the opt-in scope `accounts:write` and billing rights
   * (`manage_billing`) for the key's creator. OmniSocials Connect keys (the
   * partner's own X app pays) also take `posts: "custom"` with
   * `post_schedule`, `followers: "hourly"` / `"6h"`, and
   * `x_statistics: null` to follow the customer's setting again. Returns the
   * account with its new `x_statistics`. Errors: `400 validation_error`,
   * `schedule_invalid` (the message says why), `not_supported` (not an X
   * account); `403 forbidden`; `404 not_found`.
   */
  update(id: string, params: UpdateAccountParams): Promise<ItemResponse<Account>> {
    const x = params.x_statistics;
    const body: Record<string, unknown> = {};
    if (x === null) {
      body.x_statistics = null;
    } else if (x !== undefined) {
      const change: Record<string, unknown> = {};
      if (x.posts !== undefined) change.posts = x.posts;
      if (x.followers !== undefined) change.followers = x.followers;
      if (x.post_schedule !== undefined) change.post_schedule = x.post_schedule;
      body.x_statistics = change;
    }
    return this.client.patch(`/accounts/${encodeURIComponent(id)}`, body);
  }
}
