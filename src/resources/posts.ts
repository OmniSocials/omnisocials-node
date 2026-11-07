import type { OmniSocials } from "../client.js";
import type {
  ApprovePostParams,
  CreatePostParams,
  CreatePostResponse,
  ItemResponse,
  ListPostsParams,
  ListResponse,
  Post,
  PostApproval,
  PostApproveResult,
  PostRejectResult,
  PostRetryResult,
  RecentPlatformPostsParams,
  RejectPostParams,
  UpdatePostParams,
  UpdatePostResponse,
} from "../types.js";

export class PostsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /posts` - list posts in the workspace (newest first); `start_date` / `end_date` narrow it to a period on `schedule_at`, in calendar order (earliest first); `tag` keeps the posts with any of the given tags. */
  list(params: ListPostsParams = {}): Promise<ListResponse<Post>> {
    return this.client.get("/posts", {
      status: params.status,
      limit: params.limit,
      offset: params.offset,
      start_date: params.start_date,
      end_date: params.end_date,
      tag: Array.isArray(params.tag) ? params.tag.join(",") : params.tag,
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
   *
   * The same `warnings` array carries one `image_fit` entry per channel
   * decision on a feed image whose ratio is outside what the channel shows
   * uncropped (`action` is `cropped`, `kept` or `crop_failed`); `media_fit`
   * on the params steers it per channel.
   *
   * `comment_dm_automation` binds a comment-to-DM automation to the post
   * (Instagram or Facebook must be in `channels`; `platforms` picks the
   * channels; needs the `automations:write` scope on the key). The response
   * then carries `data.comment_dm_automation` with `platforms` and
   * `automations`, and each automation starts listening once the post is
   * live on its channel.
   *
   * A media id that is still processing (a large video is checked and
   * converted after upload) answers `409 media_processing` and nothing is
   * created: wait until `media.get(id)` says `ready`, then send the same
   * request again. A file whose processing failed answers
   * `400 invalid_media`: upload it again.
   */
  create(params: CreatePostParams): Promise<CreatePostResponse> {
    return this.client.post("/posts/create", params);
  }

  /**
   * `POST /posts/create-and-publish` - create a post and publish it
   * immediately. See {@link create} for the `warnings` array, the
   * `402 x_credits_insufficient` schedule-time gate on X link posts and the
   * `409 media_processing` / `400 invalid_media` answers.
   */
  createAndPublish(
    params: Omit<CreatePostParams, "scheduled_at">
  ): Promise<CreatePostResponse> {
    return this.client.post("/posts/create-and-publish", params);
  }

  /**
   * `PATCH /posts/:id` - update a draft or scheduled post. Like {@link create},
   * the response can carry a top-level `warnings` array: `image_fit` entries
   * when the update changes the images or `media_fit` (`media_fit` alone
   * re-decides the stored images; `keep` gives the original back).
   * `comment_dm_automation` as an object replaces the post's comment-to-DM
   * automations (a channel no longer in `platforms` loses its automation),
   * `null` removes them all, omitted leaves them (needs the
   * `automations:write` scope).
   *
   * `409` answers, where nothing is changed: `post_publishing` while the
   * post is publishing (status `posting`) or a retry publishes one of its
   * channels (poll {@link get} until `published`, `warning` or `failed`; an
   * update with only `tags` still works); `review_required` when changes
   * were requested on the post (`approval_status` `rejected`) and the
   * update would schedule it (it needs a new review: create it again with
   * `approval_workflow_id`; saving it as a draft works); `media_processing`
   * as on {@link create}.
   */
  update(id: string, params: UpdatePostParams): Promise<UpdatePostResponse> {
    return this.client.patch(`/posts/${encodeURIComponent(id)}`, params);
  }

  /**
   * `DELETE /posts/:id` - remove a post from OmniSocials (the live post
   * stays on the platform). Resolves to `null` (204). While the post is
   * publishing (status `posting`) or a retry publishes one of its channels,
   * the answer is `409 post_publishing` and nothing is deleted: poll
   * {@link get} until `published`, `warning` or `failed`, then delete it.
   */
  delete(id: string): Promise<null> {
    return this.client.delete(`/posts/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /posts/:id/publish` - publish a draft or scheduled post now. A
   * post on which changes were requested in its approval workflow
   * (`approval_status` `rejected`) answers `409 review_required`: it
   * publishes only after a new review (create it again with
   * `approval_workflow_id`).
   */
  publish(id: string): Promise<ItemResponse<Post>> {
    return this.client.post(`/posts/${encodeURIComponent(id)}/publish`);
  }

  /**
   * `POST /posts/:id/retry` - retry the failed platforms of a `failed` or
   * `warning` (partially failed) post, on the same post. Only the platforms
   * that failed are re-published; platforms that already succeeded are never
   * posted again. Asynchronous: a 200 means the retry is queued - poll
   * `get()` for the outcome. Max 3 retries per platform. While another
   * retry runs (a second request, the dashboard, the automatic retry) the
   * answer is `409 retry_in_progress` and nothing is queued: poll `get()`
   * and retry once the post is `failed` or `warning` again.
   */
  retry(id: string): Promise<ItemResponse<PostRetryResult>> {
    return this.client.post(`/posts/${encodeURIComponent(id)}/retry`);
  }

  /**
   * `POST /posts/:id/approve` - approve the current step of a post's
   * approval workflow, on behalf of the user who owns this API key. That
   * user must be a listed approver for the workflow's CURRENT step: steps
   * approve in order, so an approver on a later step gets a `forbidden`
   * error until earlier steps clear. Only works on a post with
   * `approval_status: "pending"`. Approving the last step finalizes the
   * post immediately (`scheduled` or `posting`); otherwise it stays
   * `in_approval` and the next step's approvers are notified.
   *
   * Pass `step_order`: the `current_step` of {@link getApproval}, the step
   * you reviewed. When the review is on another step now (somebody decided
   * since you read it, or a retried call already went through), nothing is
   * approved and the call throws a `409` `APIError` with code
   * `step_changed`; `err.body.error.current_step_order` is the step the
   * review is on now. Read the approval again before you decide. Without
   * `step_order` the call approves whatever step is current, so a retry
   * after a timeout can approve the next step too.
   */
  approve(
    id: string,
    params: ApprovePostParams = {}
  ): Promise<ItemResponse<PostApproveResult>> {
    const body =
      params.step_order !== undefined ? { step_order: params.step_order } : undefined;
    return this.client.post(`/posts/${encodeURIComponent(id)}/approve`, body);
  }

  /**
   * `POST /posts/:id/reject` - reject a post's approval workflow, on behalf
   * of the user who owns this API key. Same approver requirement as
   * {@link approve}. Unlike approval, a rejection stops the WHOLE workflow
   * immediately (not just the current step): the post's status becomes
   * `rejected`. `comment` is optional (max 2000 characters) and, when
   * given, is shown to the requester and other approvers in the post's
   * review thread. Pass the comment as a string, or `{ comment, step_order }`.
   *
   * `step_order` works as on {@link approve}: the `current_step` of
   * {@link getApproval}. When the review moved on, nothing is rejected and
   * the call throws a `409` `step_changed` `APIError` with
   * `err.body.error.current_step_order`.
   */
  reject(
    id: string,
    params?: string | RejectPostParams
  ): Promise<ItemResponse<PostRejectResult>> {
    const { comment, step_order } =
      typeof params === "string" ? { comment: params, step_order: undefined } : params ?? {};
    const body: { comment?: string; step_order?: number } = {};
    if (comment) body.comment = comment;
    if (step_order !== undefined) body.step_order = step_order;
    return this.client.post(
      `/posts/${encodeURIComponent(id)}/reject`,
      Object.keys(body).length > 0 ? body : undefined
    );
  }

  /**
   * `GET /posts/:id/approval` - the approval review of a post: every step
   * with its approvers and their decisions, the rejection with its reason,
   * and the comment thread. Use it when `approval_status` is `rejected` to
   * learn who rejected the post and why, or while it is `pending` to see
   * who the post waits for. A post without an approval workflow returns
   * `status: "none"` with empty `steps` and `comments`. Read-only; requires
   * the `posts:read` scope.
   */
  getApproval(id: string): Promise<ItemResponse<PostApproval>> {
    return this.client.get(`/posts/${encodeURIComponent(id)}/approval`);
  }
}
