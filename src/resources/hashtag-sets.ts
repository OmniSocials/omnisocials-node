import type { OmniSocials } from "../client.js";
import type {
  CreateHashtagSetParams,
  HashtagSet,
  ItemResponse,
  ListResponse,
  UpdateHashtagSetParams,
} from "../types.js";

export class HashtagSetsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /hashtag-sets` - list the workspace's saved hashtag sets. */
  list(): Promise<ListResponse<HashtagSet>> {
    return this.client.get("/hashtag-sets");
  }

  /** `GET /hashtag-sets/:id` - fetch a single hashtag set. */
  get(id: string): Promise<ItemResponse<HashtagSet>> {
    return this.client.get(`/hashtag-sets/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /hashtag-sets` - create a hashtag set. `hashtags` is an array of
   * tags, or a single string of tags. Apply the set on posts.create via
   * `hashtag_set` (name) or `hashtag_set_id`.
   */
  create(params: CreateHashtagSetParams): Promise<ItemResponse<HashtagSet>> {
    return this.client.post("/hashtag-sets", params);
  }

  /**
   * `PATCH /hashtag-sets/:id` - rename (`name`) and/or replace the tags
   * (`hashtags` replaces the FULL list).
   */
  update(id: string, params: UpdateHashtagSetParams): Promise<ItemResponse<HashtagSet>> {
    return this.client.patch(`/hashtag-sets/${encodeURIComponent(id)}`, params);
  }

  /** `DELETE /hashtag-sets/:id` - delete a hashtag set. Resolves to `null` (204). */
  delete(id: string): Promise<null> {
    return this.client.delete(`/hashtag-sets/${encodeURIComponent(id)}`);
  }
}
