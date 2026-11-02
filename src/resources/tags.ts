import type { OmniSocials } from "../client.js";
import type { ItemResponse, ListResponse } from "../types.js";
import type {
  ApplyTagsParams,
  CreateTagParams,
  Tag,
  TagApplyResult,
  TagDeleteResult,
  UpdateTagParams,
} from "../tag-types.js";

/**
 * Post tags: the workspace's own labels for its posts, to filter them
 * (`posts.list({ tag })`) and compare them (`analytics.tags()`). Tags never
 * go to a platform. Uses the `posts:read` / `posts:write` scopes. Errors
 * carry `tag_not_found` (404), `tag_exists` (409, the existing tag in
 * `body.error.tag`), `tag_limit_reached` (409, 200 per workspace),
 * `invalid_tag_name`, `invalid_tag_color` and, on apply, `invalid_post_ids`,
 * `too_many_posts`, `too_many_tags`, `invalid_tags` (400).
 */
export class TagsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /tags` - every tag of the workspace, by name. */
  list(): Promise<ListResponse<Tag>> {
    return this.client.get("/tags");
  }

  /** `POST /tags` - create a tag. Omit `color` to get the next one of the palette. */
  create(params: CreateTagParams): Promise<ItemResponse<Tag>> {
    return this.client.post("/tags", params);
  }

  /** `PATCH /tags/:id` - rename or recolour. A key you leave out keeps its value; posts keep the tag. */
  update(id: number | string, params: UpdateTagParams): Promise<ItemResponse<Tag>> {
    return this.client.patch(`/tags/${encodeURIComponent(String(id))}`, params);
  }

  /** `DELETE /tags/:id` - delete the tag and take it off every post (the posts stay). */
  delete(id: number | string): Promise<ItemResponse<TagDeleteResult>> {
    return this.client.delete(`/tags/${encodeURIComponent(String(id))}`);
  }

  /**
   * `POST /tags/apply` - add, remove or replace the tags of up to 500 posts at
   * once, published ones included. `add`, `remove` and `set` take tag ids or
   * names; a new name in `add` or `set` becomes a tag. Post ids that are not
   * posts of this workspace come back in `not_found`.
   */
  apply(params: ApplyTagsParams): Promise<ItemResponse<TagApplyResult>> {
    return this.client.post("/tags/apply", params);
  }
}
