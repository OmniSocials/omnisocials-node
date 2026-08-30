import type { OmniSocials } from "../client.js";
import type {
  CreatePostParams,
  CreatePostResponse,
  ItemResponse,
  ListPostsParams,
  ListResponse,
  Post,
  PostApproveResult,
  PostRejectResult,
  PostRetryResult,
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

  /**
   * `POST /posts/create` - create a draft or scheduled post. When the post
   * targets X and its text (or any thread part) contains a URL, the response
   * carries a top-level `warnings` array (code `x_url_post_credits`): X's
   * link-post fee is passed through as prepaid credits at publish time.
   *
   * Scheduling an X link post is also gated up front: if reserving this
   * post's cost would push the company's total reserved credits (across all
   * scheduled X link posts) past its balance, the request is rejected before
   * it's accepted with `402 { error: { code: "x_credits_insufficient",
   * details: { credits_required, credits_balance, credits_reserved } } }`.
   * Drafts are never gated, and posts publishing before 2026-08-14 are never
   * gated.
   */
  create(params: CreatePostParams): Promise<CreatePostResponse> {
    return this.client.post("/posts/create", params);
  }

  /**
   * `POST /posts/create-and-publish` - create a post and publish it
   * immediately. See {@link create} for the `warnings` array and the
   * `402 x_credits_insufficient` schedule-time gate on X link posts.
   */
  createAndPublish(
    params: Omit<CreatePostParams, "scheduled_at">
  ): Promise<CreatePostResponse> {
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

  /**
   * `POST /posts/:id/retry` - retry the failed platforms of a `failed` or
   * `warning` (partially failed) post, on the same post. Only the platforms
   * that failed are re-published; platforms that already succeeded are never
   * posted again. Asynchronous: a 200 means the retry is queued - poll
   * `get()` for the outcome. Max 3 retries per platform.
   */
  retry(id: string): Promise<ItemResponse<PostRetryResult>> {
    return this.client.post(`/posts/${encodeURIComponent(id)}/retry`);
  }

  /**
   * `POST /posts/:id/approve` - approve the current step of a post's
   * approval workflow, on behalf of the user who owns this API key. That
   * user must be a listed approver for the workflow's CURRENT step - steps
   * approve in order, so an approver on a later step gets a `forbidden`
   * error until earlier steps clear. Only works on a post with
   * `approval_status: "pending"`. Approving the last step finalizes the
   * post immediately (`scheduled` or `posting`); otherwise it stays
   * `in_approval` and the next step's approvers are notified.
   */
  approve(id: string): Promise<ItemResponse<PostApproveResult>> {
    return this.client.post(`/posts/${encodeURIComponent(id)}/approve`);
  }

  /**
   * `POST /posts/:id/reject` - reject a post's approval workflow, on behalf
   * of the user who owns this API key. Same approver requirement as
   * {@link approve}. Unlike approval, a rejection stops the WHOLE workflow
   * immediately (not just the current step) - the post's status becomes
   * `rejected`. `comment` is optional and, when given, is shown to the
   * requester and other approvers in the post's review thread.
   */
  reject(id: string, comment?: string): Promise<ItemResponse<PostRejectResult>> {
    return this.client.post(
      `/posts/${encodeURIComponent(id)}/reject`,
      comment ? { comment } : undefined
    );
  }
}
