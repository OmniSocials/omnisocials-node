import type { OmniSocials } from "../client.js";
import type {
  CreateWebhookParams,
  ItemResponse,
  ListResponse,
  RotateWebhookSecretResponse,
  UpdateWebhookParams,
  Webhook,
} from "../types.js";

export class WebhooksResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /webhooks` - list the webhooks of the key's workspace and the
   * organisation-wide webhooks of its organisation (`workspace_id` `null`,
   * made in the OmniSocials dashboard; they receive the events of every
   * workspace). A webhook whose creator lost access to the organisation or
   * workspace is switched off automatically:
   * `is_active` is `false` and `last_failure.error` says why.
   */
  list(): Promise<ListResponse<Webhook>> {
    return this.client.get("/webhooks");
  }

  /**
   * `GET /webhooks/:id` - fetch a single webhook of the key's workspace, or
   * an organisation-wide webhook of its organisation (`workspace_id` `null`).
   */
  get(id: string): Promise<ItemResponse<Webhook>> {
    return this.client.get(`/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /webhooks` - register an endpoint for event deliveries
   * (post.scheduled, post.published, post.failed, post.approved,
   * post.rejected; for ads ad.status_changed, ad.created, ad.updated,
   * ad.review, ad.delivery_issue, campaign.created, campaign.updated,
   * campaign.budget, lead.received, ads.sync_failed, ads.sync_recovered,
   * ads.initial_sync_completed and ad_rule.triggered). The response
   * includes the signing `secret`; save it, it is only shown once.
   * `ad.status_changed` needs the `ads:read` scope on the key and
   * `access_ads` for its person (`403 insufficient_scope` /
   * `insufficient_permission`).
   */
  create(params: CreateWebhookParams): Promise<ItemResponse<Webhook>> {
    return this.client.post("/webhooks", params);
  }

  /**
   * `PATCH /webhooks/:id` - change the URL, events, or active state. Adding
   * an Ads event needs `ads:read` on the key and `access_ads` for its person,
   * as on `create()`. Works on organisation-wide webhooks too.
   * `{ is_active: true }` switches on a webhook that was switched off
   * (also an automatic switch-off); setting `url`, `events` or switching it
   * on makes the key's creator the person behind the webhook.
   */
  update(id: string, params: UpdateWebhookParams): Promise<ItemResponse<Webhook>> {
    return this.client.patch(`/webhooks/${encodeURIComponent(id)}`, params);
  }

  /**
   * `DELETE /webhooks/:id` - delete a webhook of the key's workspace or an
   * organisation-wide webhook of its organisation. Resolves to `null` (204).
   */
  delete(id: string): Promise<null> {
    return this.client.delete(`/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /webhooks/:id/rotate-secret` - generate a new signing secret.
   * Save the returned secret; it is only shown once. The old secret keeps
   * signing for 24 hours: every delivery then carries
   * `X-OmniSocials-Signature` (new secret) and
   * `X-OmniSocials-Signature-Previous` (old secret, same format, same
   * timestamp and body). Verify the first with the new secret and, when
   * that fails, the second with the old one (see `verifyWebhookSignature`).
   * Rotating again within the 24 hours replaces the previous secret with
   * the one just rotated out. Works on organisation-wide webhooks too.
   */
  rotateSecret(id: string): Promise<RotateWebhookSecretResponse> {
    return this.client.post(`/webhooks/${encodeURIComponent(id)}/rotate-secret`);
  }
}
