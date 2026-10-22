import type { OmniSocials } from "../client.js";
import type {
  Automation,
  AutomationEventsResponse,
  CreateAutomationParams,
  ItemResponse,
  ListAutomationEventsParams,
  ListAutomationsParams,
  ListResponse,
  UpdateAutomationParams,
} from "../types.js";

export class AutomationsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /automations` - list the workspace's comment-to-DM automations,
   * optionally filtered by `status` (`active`, `paused`, `completed`), by
   * `platform` (`instagram`, `facebook`) or by the OmniSocials `post_id`
   * they are bound to. Requires the `automations:read` scope (opt-in on the
   * API key).
   */
  list(params: ListAutomationsParams = {}): Promise<ListResponse<Automation>> {
    return this.client.get("/automations", {
      status: params.status,
      platform: params.platform,
      post_id: params.post_id,
    });
  }

  /**
   * `GET /automations/:id` - fetch a single automation. Requires the
   * `automations:read` scope (opt-in on the API key).
   */
  get(id: string): Promise<ItemResponse<Automation>> {
    return this.client.get(`/automations/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /automations` - create a comment-to-DM automation: a keyword in an
   * Instagram comment (or a DM, or a story reply) is answered with a DM, once
   * per person, with an optional public reply under the comment. With
   * `platform: "facebook"` it runs on a Facebook Page: a keyword in a comment
   * or a Messenger message to the Page is answered in Messenger (no story
   * replies). Bind it to one post with `post_id` (an OmniSocials post that
   * goes to the channel, scheduled or live; one automation per post and
   * platform), `instagram_media_id` (an Instagram post published outside
   * OmniSocials) or `facebook_post_id` (a Page post published outside
   * OmniSocials; implies `facebook`), at most one; `trigger.scope`
   * `next_post` or `any` needs none. `actions.dm.text` is required. Meta
   * rules: one private reply per comment, within 7 days; OmniSocials caps
   * sends at 180 DMs an hour per account and platform. Requires the
   * `automations:write` scope (opt-in on the API key). Errors:
   * `400 validation_error`, `400 post_not_instagram`, `400 post_not_facebook`,
   * `400 post_required`, `404 post_not_found`, `404 instagram_media_not_found`,
   * `404 facebook_post_not_found`, `409 instagram_not_connected`,
   * `409 instagram_needs_reauth`, `409 facebook_not_connected`,
   * `409 facebook_needs_reauth`, `409 automation_exists` (the error body
   * also carries `automation_id`).
   */
  create(params: CreateAutomationParams): Promise<ItemResponse<Automation>> {
    return this.client.post("/automations", params);
  }

  /**
   * `PATCH /automations/:id` - partial update. Each section (`trigger`,
   * `actions`, `limits`) is merged into the stored one; keys you omit keep
   * their value: new `trigger.keywords` keep the kinds, the scope and the
   * match; a new `actions.dm.text` keeps the public reply; `limits.stop_at`
   * keeps `max_sends`. `public_reply.enabled: false` or `variations: []`
   * turns the public reply off; `limits.max_sends: null` removes that
   * limit. `status: "paused"` pauses and `"active"` resumes; another
   * `post_id` / `instagram_media_id` / `facebook_post_id` moves the
   * automation to that post. The platform cannot change
   * (`400 platform_immutable`). A `completed` automation starts again when
   * its limits or trigger change. Requires the `automations:write` scope.
   * `400 no_fields` when the body is empty.
   */
  update(id: string, params: UpdateAutomationParams): Promise<ItemResponse<Automation>> {
    return this.client.patch(`/automations/${encodeURIComponent(id)}`, params);
  }

  /**
   * `DELETE /automations/:id` - delete an automation. Resolves to `null`
   * (204). Requires the `automations:write` scope.
   */
  delete(id: string): Promise<null> {
    return this.client.delete(`/automations/${encodeURIComponent(id)}`);
  }

  /**
   * `GET /automations/:id/events` - the automation's activity: one event per
   * person it answered, skipped or failed on. Filter by `outcome` (`sent`,
   * `skipped`, `failed`, `pending`); `limit` is 1 to 100 (default 25),
   * `offset` skips. Requires the `automations:read` scope.
   *
   * Note the response shape (see {@link AutomationEventsResponse}): not the
   * plain list envelope but `{ data, counts, pagination }`, where `counts`
   * is the number of events per outcome.
   */
  listEvents(
    id: string,
    params: ListAutomationEventsParams = {}
  ): Promise<AutomationEventsResponse> {
    return this.client.get(`/automations/${encodeURIComponent(id)}/events`, {
      outcome: params.outcome,
      limit: params.limit,
      offset: params.offset,
    });
  }
}
