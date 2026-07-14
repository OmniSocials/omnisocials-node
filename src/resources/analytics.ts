import type { OmniSocials } from "../client.js";
import type {
  AccountAnalyticsParams,
  AnalyticsOverview,
  AnalyticsOverviewParams,
  BestTimesParams,
  ItemResponse,
  PostAnalytics,
} from "../types.js";

export class AnalyticsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /analytics/posts/:id` - latest per-platform metrics for one post. */
  post(postId: string): Promise<ItemResponse<PostAnalytics>> {
    return this.client.get(`/analytics/posts/${encodeURIComponent(postId)}`);
  }

  /**
   * `GET /analytics/posts?ids=a,b,c` - batch metrics for up to 100 posts in
   * one call instead of one request per post.
   */
  posts(postIds: string[]): Promise<ItemResponse<PostAnalytics[]>> {
    return this.client.get("/analytics/posts", { ids: postIds.join(",") });
  }

  /** `GET /analytics/overview` - workspace-wide totals for a period. */
  overview(
    params: AnalyticsOverviewParams = {}
  ): Promise<ItemResponse<AnalyticsOverview>> {
    return this.client.get("/analytics/overview", {
      period: params.period,
      start_date: params.start_date,
      end_date: params.end_date,
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
   * platform, based on when the account's audience engages.
   */
  bestTimes(params: BestTimesParams): Promise<ItemResponse<Record<string, unknown>>> {
    return this.client.get("/analytics/best-times", {
      platform: params.platform,
      timezone: params.timezone,
    });
  }
}
