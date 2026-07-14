import type { OmniSocials } from "../client.js";
import type {
  CreatePostParams,
  ItemResponse,
  ListPostsParams,
  ListResponse,
  Post,
  RecentPlatformPostsParams,
  UpdatePostParams,
} from "../types.js";

export class PostsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /posts` - list posts in the workspace (newest first). */
  list(params: ListPostsParams = {}): Promise<ListResponse<Post>> {
    return this.client.get("/posts", {
      status: params.status,
      limit: params.limit,
      offset: params.offset,
    });
  }

  /** `GET /posts/:id` - fetch a single post. */
  get(id: string): Promise<ItemResponse<Post>> {
    return this.client.get(`/posts/${encodeURIComponent(id)}`);
  }

  /**
   * `GET /posts/recent-platform` - recent posts fetched live from the
   * connected platform APIs (including content published outside
   * OmniSocials). The fallback for brand-new workspaces where `list()` is
   * empty. Requires the `analytics:read` scope.
   */
  recentPlatform(
    params: RecentPlatformPostsParams = {}
  ): Promise<ListResponse<Record<string, unknown>>> {
    return this.client.get("/posts/recent-platform", {
      limit: params.limit,
      platforms: Array.isArray(params.platforms)
        ? params.platforms.join(",")
        : params.platforms,
    });
  }

  /** `POST /posts/create` - create a draft or scheduled post. */
  create(params: CreatePostParams): Promise<ItemResponse<Post>> {
    return this.client.post("/posts/create", params);
  }

  /** `POST /posts/create-and-publish` - create a post and publish it immediately. */
  createAndPublish(
    params: Omit<CreatePostParams, "scheduled_at">
  ): Promise<ItemResponse<Post>> {
    return this.client.post("/posts/create-and-publish", params);
  }

  /** `PATCH /posts/:id` - update a draft or scheduled post. */
  update(id: string, params: UpdatePostParams): Promise<ItemResponse<Post>> {
    return this.client.patch(`/posts/${encodeURIComponent(id)}`, params);
  }

  /** `DELETE /posts/:id` - delete a post. Resolves to `null` (204). */
  delete(id: string): Promise<null> {
    return this.client.delete(`/posts/${encodeURIComponent(id)}`);
  }

  /** `POST /posts/:id/publish` - publish a draft or scheduled post now. */
  publish(id: string): Promise<ItemResponse<Post>> {
    return this.client.post(`/posts/${encodeURIComponent(id)}/publish`);
  }
}
