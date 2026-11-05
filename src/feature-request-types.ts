/**
 * What OmniSocials cannot do, and feature requests (2026-11-04). `GET
 * /limits` lists the things OmniSocials cannot do, why and what to do
 * instead; `/feature-requests` sends a request to the OmniSocials team for
 * the person who owns the key and reads their own requests back. No scope
 * needed: every key may call these.
 */

/**
 * Why something is not possible. `platform` (the platform does not allow
 * it) and `by_design` (OmniSocials does not do it on purpose) cannot change
 * through a request; the others can.
 */
export type LimitKind =
  | "platform"
  | "by_design"
  | "not_built"
  | "beta"
  | "dashboard_only"
  | "needs_setup";

/** The part of OmniSocials a limit or a request is about. */
export type LimitArea =
  | "posts"
  | "media"
  | "inbox"
  | "analytics"
  | "automations"
  | "accounts"
  | "ads"
  | "team"
  | "other";

/** Something OmniSocials cannot do, why, and what to do instead. */
export interface Limit {
  /** For example `"tiktok.delete"`. Pass it as `limit_id` on a feature request. */
  id: string;
  kind: LimitKind;
  /** The kind in words, e.g. "The platform does not allow it". */
  kind_label: string;
  area: LimitArea;
  /** The platforms it is about; empty = every channel. */
  platforms: string[];
  title: string;
  /** The reason, to tell the person. */
  says: string;
  /** What to do instead, when there is something. */
  instead: string | null;
  /** Whether a feature request can name it. False for `platform` and `by_design`. */
  requestable: boolean;
  [key: string]: unknown;
}

export interface ListLimitsParams {
  /**
   * Only the entries for this platform (entries for every channel stay in):
   * instagram, facebook, linkedin, linkedin_page, youtube, tiktok, x,
   * pinterest, bluesky, threads, mastodon, google_business, telegram,
   * discord, reddit, snapchat. Anything else answers `400 invalid_platform`.
   */
  platform?: string;
  /** Only the entries of this area. Anything else answers `400 invalid_area`. */
  area?: LimitArea;
}

/** Response of `limits.list()`: the entries plus a label per kind. */
export interface LimitsResponse {
  data: Limit[];
  kinds: Record<LimitKind, string>;
}

export type FeatureRequestStatus = "open" | "in_progress" | "completed" | "declined";

/** Where a request was sent from. */
export type FeatureRequestSource = "app" | "mcp" | "api" | "cli";

/** A reply of the OmniSocials team on a request. */
export interface FeatureRequestTeamReply {
  message: string;
  created_at: string;
}

/** A feature request of the person who owns the key. */
export interface FeatureRequest {
  id: number;
  title: string;
  summary: string;
  status: FeatureRequestStatus;
  /** The OmniSocials team's answer, when there is one. */
  team_answer: string | null;
  /** Replies of the OmniSocials team, oldest first. */
  team_replies: FeatureRequestTeamReply[];
  /** People of the organisation who asked for the same thing. */
  votes_count: number;
  limit_id: string | null;
  platform: string | null;
  area: string | null;
  source: FeatureRequestSource;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  [key: string]: unknown;
}

export interface CreateFeatureRequestParams {
  /**
   * What the person wants to do and why, in one or two sentences (10 to
   * 1000 characters). Write it yourself; never paste a conversation.
   */
  summary: string;
  /** A short name, at most 120 characters. Made from the summary when left out. */
  title?: string;
  /** The platform it is about, when it is about one (same values as `limits.list({ platform })`). */
  platform?: string;
  area?: LimitArea;
  /**
   * The `id` of the `limits.list()` entry the request is about. A second
   * person of the same organisation then adds a vote to the open request
   * instead of a new one.
   */
  limit_id?: string;
}

/**
 * `created` = a new request; `voted` = a vote added to the organisation's
 * open request for the same gap; `already_requested` = this person already
 * has an open request for it (nothing new was stored).
 */
export type FeatureRequestOutcome = "created" | "voted" | "already_requested";

/** Response of `featureRequests.create()`. `data` is the request the outcome is about. */
export interface FeatureRequestCreateResult {
  outcome: FeatureRequestOutcome;
  data: FeatureRequest;
}
