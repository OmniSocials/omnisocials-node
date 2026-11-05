import type { OmniSocials } from "../client.js";
import type { ItemResponse, ListResponse } from "../types.js";
import type {
  CreateFeatureRequestParams,
  FeatureRequest,
  FeatureRequestCreateResult,
} from "../feature-request-types.js";

/**
 * Feature requests to the OmniSocials team, for the person who owns the key
 * (their name and email are stored with it so the team can answer). The
 * person sees them in OmniSocials (Settings, Request a feature) and gets an
 * email when the status changes. No scope needed.
 */
export class FeatureRequestsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `POST /feature-requests` - send a request. Send it only when the person
   * asked for it. Check `outcome`: `created` is a new request, `voted` added
   * a vote to the organisation's open request for the same gap, and
   * `already_requested` means this person already has an open request for
   * it (`data` is that request).
   *
   * Errors: `400 invalid_summary` / `invalid_title` / `invalid_platform` /
   * `invalid_area` / `unknown_limit`; `409 not_requestable` (the `limit_id`
   * is a platform rule or a choice of OmniSocials; the entry is in
   * `error.body.error.limit` and nothing was stored); `429
   * too_many_requests` (10 an hour per person).
   */
  create(params: CreateFeatureRequestParams): Promise<FeatureRequestCreateResult> {
    return this.client.post("/feature-requests", params);
  }

  /** `GET /feature-requests` - the person's own requests, newest first, at most 50. */
  list(): Promise<ListResponse<FeatureRequest>> {
    return this.client.get("/feature-requests");
  }

  /** `GET /feature-requests/:id` - one request with its status and the team's replies. Errors: `400 invalid_id`, `404 not_found`. */
  get(id: number | string): Promise<ItemResponse<FeatureRequest>> {
    return this.client.get(`/feature-requests/${encodeURIComponent(String(id))}`);
  }
}
