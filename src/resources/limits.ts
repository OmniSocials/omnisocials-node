import type { OmniSocials } from "../client.js";
import type { ListLimitsParams, LimitsResponse } from "../feature-request-types.js";

/**
 * What OmniSocials cannot do, why, and what to do instead: platform rules,
 * features not built yet, features that work in the OmniSocials app only.
 * Read it before you tell a person that something is not possible, so you
 * can give the reason (`says`) and the way around it (`instead`). When the
 * person still wants a `requestable` entry, send it with
 * `featureRequests.create({ summary, limit_id })`. No scope needed.
 */
export class LimitsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /limits` - the entries, optionally for one platform or area, plus
   * `kinds` (a label per kind). Errors: `400 invalid_platform`,
   * `invalid_area`.
   */
  list(params: ListLimitsParams = {}): Promise<LimitsResponse> {
    return this.client.get("/limits", { platform: params.platform, area: params.area });
  }
}
