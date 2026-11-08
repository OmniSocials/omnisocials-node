import type { OmniSocials } from "../client.js";
import type { Credits, ItemResponse } from "../types.js";

/**
 * The organisation's credits: the balance, auto-refill, the credits used this
 * month and what X statistics cost. Top-ups are made in the OmniSocials app
 * (Settings -> Organisation -> Billing -> Credits).
 */
export class CreditsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /credits` - the balance (1 credit = EUR 0.01), `auto_refill`,
   * `this_month` (credits used per reason) and `x_statistics` (state, the
   * date charging starts, the prices per read, this month's reads, and each X
   * account with its setting and its estimate for a month). Needs the opt-in
   * scope `credits:read` and billing rights (`manage_billing`) for the key's
   * creator. OmniSocials Connect keys get `403 not_available_for_connect`.
   */
  get(): Promise<ItemResponse<Credits>> {
    return this.client.get("/credits");
  }
}
