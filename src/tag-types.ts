/**
 * Post tags (2026-11-02): the workspace's own labels for its posts (a hook
 * style, a format, a campaign), to filter posts and compare them in
 * Analytics. Tags never go to a platform. Endpoints: `/tags` (CRUD + bulk
 * apply), `tag` on `GET /posts` and `GET /analytics/overview`, `tags` on post
 * create / update, and `GET /analytics/tags`.
 */

/** The palette a tag's colour comes from. */
export type TagColor =
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "pink"
  | "teal"
  | "yellow"
  | "brown"
  | "gray";

/** A tag of the workspace. */
export interface Tag {
  id: number;
  /** Unique in the workspace (case-insensitive), up to 40 characters. */
  name: string;
  color: TagColor;
  created_at: string;
  [key: string]: unknown;
}

/**
 * A tag reference in `tags` on posts and in `add` / `remove` / `set` of
 * `tags.apply()`: a tag id, or a tag name (matched case-insensitively). A
 * name that does not exist yet becomes a new tag where the call says so.
 */
export type TagRef = number | string;

/** Set on a post that went to Instagram as a Trial Reel, `null` otherwise. */
export interface TrialReel {
  /**
   * `SS_PERFORMANCE`: Instagram shares it with followers when it does well.
   * `MANUAL`: the person decides in the Instagram app. Instagram's API does
   * not say whether a trial reel was later shared with followers.
   */
  strategy: "MANUAL" | "SS_PERFORMANCE";
}

export interface CreateTagParams {
  /** Up to 40 characters, unique in the workspace (case-insensitive). */
  name: string;
  /** Omit to get the next colour of the palette. */
  color?: TagColor;
}

export interface UpdateTagParams {
  /** New name. A key you leave out keeps its value. */
  name?: string;
  color?: TagColor;
}

/** Response data of `tags.delete()`. */
export interface TagDeleteResult {
  /** The tag as it was. */
  tag: Tag;
  /** Posts that carried the tag (they keep everything else). */
  posts_untagged: number;
}

export interface ApplyTagsParams {
  /** Up to 500 post ids of the workspace, published posts included. */
  post_ids: string[];
  /** Tags to add (ids or names; a new name becomes a tag). */
  add?: TagRef[];
  /** Tags to take off (ids or names; never creates a tag). */
  remove?: TagRef[];
  /** Replaces each post's tags (ids or names; a new name becomes a tag). `[]` removes them all. */
  set?: TagRef[];
}

/** Response data of `tags.apply()`. */
export interface TagApplyResult {
  /** Posts whose tags changed. */
  updated: number;
  /** Each post of the request with its tags now. */
  posts: Array<{ id: string; tags: Tag[] }>;
  /** Post ids that are not posts of this workspace. */
  not_found: string[];
}

export interface TagAnalyticsParams {
  /** "YYYY-MM-DD", "YYYY-MM" or ISO 8601. Default: 90 days before `end_date`. */
  start_date?: string;
  /** "YYYY-MM-DD", "YYYY-MM" or ISO 8601 (inclusive). Default: today. */
  end_date?: string;
  /** Only this channel's numbers (instagram, tiktok, youtube, ...). Default: every connected channel. */
  platform?: string;
  /** Measured posts a tag needs before `enough_posts` is true (1 to 50, default 5). */
  min_posts?: number;
}

/** How a set of posts did against the workspace's normal. */
export interface TagSummary {
  posts: number;
  /** Posts with numbers. */
  measured: number;
  median_impressions: number | null;
  /** Percent (5.4 = 5.4%). */
  engagement_rate: number | null;
  /**
   * Fraction against the normal: 0.38 = 38% above, -0.2 = 20% below. Each
   * post is measured against the median impressions of its own channel in
   * the period.
   */
  vs_normal: number | null;
  /** Channel where the posts beat the normal by the most (3 posts there at least). */
  best_channel: string | null;
  /** False below `min_posts` measured posts: read `vs_normal` as a hint only. */
  enough_posts: boolean;
}

/** One tag's row in `analytics.tags()`. */
export interface TagComparison extends TagSummary {
  tag: Tag;
}

/** Response data of `analytics.tags()`. */
export interface TagAnalytics {
  period: { start_date: string; end_date: string };
  platform: string | null;
  min_posts: number;
  /** Comparable tags first, best first. */
  tags: TagComparison[];
  /** The posts without a tag. */
  untagged: TagSummary;
  /** Median impressions per channel in the period. */
  normals: Record<string, number | null>;
}
