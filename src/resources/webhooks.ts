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

  /** `GET /webhooks` - list the workspace's webhook endpoints. */
  list(): Promise<ListResponse<Webhook>> {
    return this.client.get("/webhooks");
  }

  /** `GET /webhooks/:id` - fetch a single webhook. */
  get(id: string): Promise<ItemResponse<Webhook>> {
    return this.client.get(`/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /webhooks` - register an endpoint for event deliveries
   * (post.scheduled, post.published, post.failed). The response includes the
   * signing `secret`; save it, it is only shown once.
   */
  create(params: CreateWebhookParams): Promise<ItemResponse<Webhook>> {
    return this.client.post("/webhooks", params);
  }

  /** `PATCH /webhooks/:id` - change the URL, events, or active state. */
  update(id: string, params: UpdateWebhookParams): Promise<ItemResponse<Webhook>> {
    return this.client.patch(`/webhooks/${encodeURIComponent(id)}`, params);
  }

  /** `DELETE /webhooks/:id` - delete a webhook. Resolves to `null` (204). */
  delete(id: string): Promise<null> {
    return this.client.delete(`/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /webhooks/:id/rotate-secret` - generate a new signing secret.
   * Save the returned secret; it is only shown once.
   */
  rotateSecret(id: string): Promise<RotateWebhookSecretResponse> {
    return this.client.post(`/webhooks/${encodeURIComponent(id)}/rotate-secret`);
  }
}
