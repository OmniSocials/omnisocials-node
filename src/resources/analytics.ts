import type { OmniSocials } from "../client.js";
import type {
  AccountAnalyticsParams,
  AnalyticsOverviewParams,
  AnalyticsOverviewResponse,
  BestTimesParams,
  BestTimesResponse,
  ItemResponse,
  PostAnalytics,
  PostsAnalyticsResponse,
} from "../types.js";
import type { TagAnalytics, TagAnalyticsParams } from "../tag-types.js";

export class AnalyticsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /analytics/posts/:id` - latest per-platform metrics for one post. */
  post(postId: string): Promise<ItemResponse<PostAnalytics>> {
    return this.client.get(`/analytics/posts/${encodeURIComponent(postId)}`);
  }

  /**
   * `GET /analytics/posts?ids=a,b,c` - batch metrics for up to 100 posts in
   * one call instead of one request per post. The response also carries
   * `count` (a sibling of `data`), the number of entries returned.
   */
  posts(postIds: string[]): Promise<PostsAnalyticsResponse> {
    return this.client.get("/analytics/posts", { ids: postIds.join(",") });
  }

  /**
   * `GET /analytics/overview` - workspace-wide totals for a period. The
   * response also carries `current_date` (a sibling of `data`), the server's
   * current date, useful for grounding relative date calculations. `tag`
   * narrows the post numbers to the posts with that tag (account numbers
   * stay those of the whole account).
   */
  overview(
    params: AnalyticsOverviewParams = {}
  ): Promise<AnalyticsOverviewResponse> {
    return this.client.get("/analytics/overview", {
      period: params.period,
      start_date: params.start_date,
      end_date: params.end_date,
      tag: Array.isArray(params.tag) ? params.tag.join(",") : params.tag,
    });
  }

  /** `GET /analytics/accounts` - account-level stats (followers etc), one entry per account. */
  accounts(
    params: AccountAnalyticsParams = {}
  ): Promise<ItemResponse<Array<Record<string, unknown>>>> {
    return this.client.get("/analytics/accounts", {
      platform: params.platform,
      date: params.date,
    });
  }

  /**
   * `GET /analytics/best-times` - recommended posting time slots for a
   * platform, based on when the account's audience engages. The response
   * fields (`platform`, `timezone`, `basis`, `grid`, `recommendations`) sit
   * at the top level, with no `data` wrapper.
   */
  bestTimes(params: BestTimesParams): Promise<BestTimesResponse> {
    return this.client.get("/analytics/best-times", {
      platform: params.platform,
      timezone: params.timezone,
    });
  }

  /**
   * `GET /analytics/tags` - how each tag did against your normal for the
   * published posts in a period (default: the last 90 days). `vs_normal` is
   * a fraction (0.38 = 38% above): each post is measured against the median
   * impressions of its own channel. `enough_posts` is false below
   * `min_posts` measured posts. `untagged` covers the posts without a tag.
   * Errors: `400 invalid_date`, `invalid_date_range`, `invalid_platform`.
   */
  tags(params: TagAnalyticsParams = {}): Promise<ItemResponse<TagAnalytics>> {
    return this.client.get("/analytics/tags", {
      start_date: params.start_date,
      end_date: params.end_date,
      platform: params.platform,
      min_posts: params.min_posts,
    });
  }
}
