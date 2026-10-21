/**
 * Request and response types for the OmniSocials API.
 *
 * Request shapes are ported from the canonical MCP client
 * (mcp-server/src/client.ts); response shapes from mcp-server/src/types.ts and
 * the OpenAPI spec. Deep platform-specific blobs stay as
 * `Record<string, unknown>` passthrough on purpose.
 */

// ─── Envelope ────────────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Single-item envelope: `{ data: T }` (extra sibling keys may be present). */
export interface ItemResponse<T> {
  data: T;
  message?: string;
  [key: string]: unknown;
}

/** List envelope: `{ data: T[], pagination? }`. */
export interface ListResponse<T> {
  data: T[];
  pagination?: Pagination;
  [key: string]: unknown;
}

// ─── Media entries (alt text) ────────────────────────────────────────────────

/**
 * One `media_urls` entry: a plain public URL string, or an object pairing the
 * URL with `alt` text (accessibility description, max 1500 chars). Alt text is
 * delivered to Mastodon (media description), Bluesky (embed alt), X (photo/GIF
 * media metadata), Pinterest (pin alt_text fallback), Instagram (images), and
 * LinkedIn (images). Plain strings and objects can be mixed in the same array.
 */
export type MediaUrlInput = string | { url: string; alt?: string };

/**
 * One `media_ids` entry: a Media Library id string, or an object pairing the
 * id with `alt` text (accessibility description, max 1500 chars). See
 * {@link MediaUrlInput} for which platforms receive alt text.
 */
export type MediaIdInput = string | { id: string; alt?: string };

// ─── X (Twitter) options ─────────────────────────────────────────────────────

export interface XThreadPartInput {
  /** Tweet text, up to 280 chars standard, 25,000 for X Premium/Premium+ accounts. */
  text: string;
  /** Optional per-part media as Library ids from media upload (max 4 combined with media_urls). Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[];
  /** Optional per-part media as external URLs (max 4 combined with media_ids). Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[];
}

/**
 * A poll on an X, Threads or Mastodon post (the post text is the question).
 * X: 2 to 4 options of up to 25 characters, `duration_minutes` 5 to 10080
 * (default 1440). Threads: 2 to 4 options of 1 to 25 characters, closed by
 * Threads after 24 hours. Mastodon: options and `expires_in` (seconds)
 * within the instance's limits, plus `multiple` and `hide_totals`. A poll
 * and media do not go together on these platforms; on a thread the poll
 * goes on the first part.
 */
export interface ChannelPoll {
  options: string[];
  duration_minutes?: number;
  expires_in?: number;
  multiple?: boolean;
  hide_totals?: boolean;
}

export interface XPostOptions {
  reply_settings?: "" | "following" | "mentionedUsers";
  paid_partnership?: boolean;
  made_with_ai?: boolean;
  /** A poll on the tweet; see ChannelPoll. `null` on update removes it. */
  poll?: ChannelPoll | null;
  /** Provide 2-25 parts to publish as a thread. Omit for a single tweet. */
  thread_parts?: XThreadPartInput[];
}

/**
 * Update-side variant: passing `thread_parts: null` explicitly clears the
 * thread shape on the post (reverting to single-tweet mode). Passing
 * `undefined` (omit it) leaves the existing thread untouched.
 */
export interface XPostOptionsUpdate extends Omit<XPostOptions, "thread_parts"> {
  thread_parts?: XThreadPartInput[] | null;
}

// ─── Bluesky options ─────────────────────────────────────────────────────────

export interface BlueskyThreadPartInput {
  /** Post text, up to 300 characters (counted as graphemes; one emoji = 1). */
  text: string;
  /** Optional per-part media as Library ids from media upload (max 4). Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[];
  /** Optional per-part media as external URLs (max 4). Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[];
}

export interface BlueskyPostOptions {
  /** Provide 2-25 parts to publish as a thread. Omit for a single post. */
  thread_parts?: BlueskyThreadPartInput[];
}

/**
 * Update-side variant: `thread_parts: null` clears the thread (revert to a
 * single post); `undefined` leaves the existing thread untouched.
 */
export interface BlueskyPostOptionsUpdate {
  thread_parts?: BlueskyThreadPartInput[] | null;
}

// ─── Mastodon options ────────────────────────────────────────────────────────

export interface MastodonThreadPartInput {
  /** Status text, up to 500 characters by default (some instances allow more). */
  text: string;
  /** Optional per-part media as Library ids from media upload (max 4). Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[];
  /** Optional per-part media as external URLs (max 4). Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[];
}

export interface MastodonPostOptions {
  /** A poll on the status; see ChannelPoll. `null` on update removes it. */
  poll?: ChannelPoll | null;
  /** Provide 2-25 parts to publish as a thread. Omit for a single status. */
  thread_parts?: MastodonThreadPartInput[];
}

/**
 * Update-side variant: `thread_parts: null` clears the thread (revert to a
 * single status); `undefined` leaves the existing thread untouched.
 */
export interface MastodonPostOptionsUpdate {
  poll?: ChannelPoll | null;
  thread_parts?: MastodonThreadPartInput[] | null;
}

// ─── Threads (Meta) options ──────────────────────────────────────────────────

export interface ThreadsThreadPartInput {
  /** Part text, 1 to 500 characters. */
  text: string;
  /** Optional per-part media as Library ids from media upload (max 10, images and/or videos). Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[];
  /** Optional per-part media as external URLs (max 10, images and/or videos). Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[];
}

/**
 * Object form of a Threads location tag: the id plus optional display fields
 * to store along with it. `location_id` wins when both are given.
 */
export interface ThreadsLocationInput {
  /** A Threads location id from `locations.search({ platform: "threads" })`. */
  id: string;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface ThreadsPostOptions {
  /** A poll on the post (text-only post); see ChannelPoll. `null` on update removes it. */
  poll?: ChannelPoll | null;
  /**
   * Provide 2-25 parts to publish as a chained thread; parts after the first
   * publish as replies to the previous part. When set, the Threads caption is
   * taken from part 1. Omit for a single post.
   */
  thread_parts?: ThreadsThreadPartInput[];
  /**
   * Threads location tag: a Threads location id from
   * `locations.search({ platform: "threads" })` (a Facebook Place id is not
   * a Threads location id). On a multi-post thread the tag is applied to
   * part 1. Threads location tagging is currently rolling out; until Meta
   * approves the permissions it is disabled on production and calls return
   * a clear error.
   */
  location_id?: string;
  /**
   * Alternative to `location_id`: store display fields along with the id.
   * `location_id` wins when both are given.
   */
  location?: ThreadsLocationInput;
}

/**
 * Update-side variant: `thread_parts: null` clears the thread (revert to a
 * single post); `undefined` leaves the existing thread untouched. The
 * location tag works the same way: `location_id: null` (or `location: null`)
 * clears it, `undefined` leaves it untouched.
 */
export interface ThreadsPostOptionsUpdate {
  poll?: ChannelPoll | null;
  thread_parts?: ThreadsThreadPartInput[] | null;
  location_id?: string | null;
  location?: ThreadsLocationInput | null;
}

/**
 * Telegram options: the connected channel or group, posted by the OmniSocials
 * bot. Text up to 4,096 characters; with media, text over 1,024 characters is
 * sent as a reply under the media. Up to 10 photos and videos per album (a GIF
 * goes on its own), files up to 50 MB, no Stories. On update every key merges
 * into the stored options and `null` removes it.
 */
export interface TelegramButton {
  /** Button label, 1 to 64 characters. */
  text: string;
  /** Link the button opens: https://, http:// or tg://. */
  url: string;
}

/** A native Telegram poll; the post text is the question (max 300 characters). No media with a poll. */
export interface TelegramPoll {
  /** 2 to 12 answer options of up to 100 characters, all different. */
  options: string[];
  /** Seconds the poll stays open (5 to 2628000). Omit to keep it open. */
  open_period?: number;
  /** Allow several answers per person. */
  multiple?: boolean;
}

export interface TelegramPostOptions {
  /** Send without a notification sound. */
  silent?: boolean | null;
  /** `false` hides the link preview of a text-only post (shown by default). */
  link_preview?: boolean | null;
  /** Pin the post in the chat. Needs the bot's Edit messages right in a channel, Pin messages in a group. */
  pin?: boolean | null;
  /** Stop forwarding and saving of the post in Telegram apps. */
  protect_content?: boolean | null;
  /** Blur the photos and videos until someone taps them. */
  spoiler?: boolean | null;
  /** Show the text above the media instead of below. */
  caption_above_media?: boolean | null;
  /** Up to 3 link buttons, one per row. Not on an album (2+ media) or a poll. */
  buttons?: TelegramButton[] | null;
  poll?: TelegramPoll | null;
  /** A reply the bot sends under the post right after it is published (max 4,096 characters). */
  first_comment?: string;
}

/** Where a Telegram post landed, on `Post.telegram.result` once it is sent. */
export interface TelegramPostResult {
  chat_id: string | null;
  message_ids: string[];
  pinned: boolean;
  /** `no_right` when the bot may not pin, `failed` otherwise. */
  pin_error?: string;
  /** The reply that holds the text when it was over 1,024 characters with media. */
  text_message_id?: string;
  link_public: string | null;
  link_private: string | null;
  sent_at: string | null;
}

/**
 * Non-sponsored LinkedIn poll (question + 2-4 options + duration). Mutually
 * exclusive with media and a link share on that channel's post — a poll
 * takes priority over both at publish time.
 */
export interface LinkedInPollFields {
  /** The poll question (max 140 characters). */
  question: string;
  /** 2-4 answer options (max 30 characters each). */
  options: string[];
  duration: "ONE_DAY" | "THREE_DAYS" | "SEVEN_DAYS" | "FOURTEEN_DAYS";
}

/**
 * LinkedIn poll(s), independent per channel — `linkedin` (personal profile)
 * and `linkedin_page` (company page) can each carry their own poll, or
 * none. On update_post, replaces wholesale: set a channel's key to `null`
 * to clear that channel's poll and revert it to a normal post; omit the
 * whole field to leave both channels' polls untouched.
 */
export interface LinkedInPollInput {
  linkedin?: LinkedInPollFields | null;
  linkedin_page?: LinkedInPollFields | null;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export interface UserTag {
  username: string;
  x: number;
  y: number;
  image_index?: number;
}

/** One video-cover choice: a frame offset or a custom image. */
export interface VideoCoverEntry {
  type: "frame" | "custom";
  /** Milliseconds into the video (type "frame"), e.g. 3000 = 0:03. */
  thumb_offset?: number;
  /** Public image URL, JPEG or PNG (type "custom"). */
  cover_url?: string;
}

/**
 * Video thumbnail for a post whose media is one video. Applied on Instagram
 * (feed videos and reels), Facebook (feed videos and reels), LinkedIn Profile
 * and Page, TikTok (frame only), Pinterest and YouTube Shorts (shown on
 * Shorts only on channels where YouTube has enabled custom Shorts
 * thumbnails). `overrides` wins over the base cover for that platform; on
 * update a `null` override entry drops it.
 */
export interface VideoCover extends VideoCoverEntry {
  overrides?: Record<string, VideoCoverEntry | null>;
}

/**
 * One channel's value in `media_fit`: `auto` takes the channel's rule,
 * `crop` crops the image to the channel's window, `keep` sends the original.
 */
export type MediaFitMode = "auto" | "crop" | "keep";

export interface CreatePostParams {
  /** Caption. Either a single string or a per-platform map with a `default` key. */
  content: string | Record<string, string>;
  /** Platform identifiers, e.g. ["instagram", "linkedin", "x"]. */
  channels?: string[];
  /** ISO 8601 datetime. Omit to create a draft. */
  scheduled_at?: string;
  /** Media Library ids, either shared or a per-platform map. Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[] | Record<string, MediaIdInput[]>;
  /** Public media URLs, either shared or a per-platform map. Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[] | Record<string, MediaUrlInput[]>;
  type?: string;
  source?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_thumbnail_url?: string;
  /** Instagram location tag (a Facebook Place id, see locations.search). */
  location_id?: string;
  collaborators?: string[];
  user_tags?: UserTag[];
  /** Video thumbnail (frame offset or custom image, optional per-platform overrides). */
  video_cover?: VideoCover;
  /**
   * Name of a saved hashtag set (case-insensitive). Applies the set once at
   * create time; tags already in a caption are skipped; Instagram's
   * 30-hashtag cap returns error code `hashtag_limit_exceeded`.
   */
  hashtag_set?: string;
  /** Id of a saved hashtag set to apply at create time (see `hashtag_set`). */
  hashtag_set_id?: string;
  /** Where the hashtags go: appended to the caption (default) or posted as the first comment. */
  hashtag_placement?: "caption_append" | "first_comment";
  /** Restrict the hashtags to a subset of the post's channels. Omit for all. */
  hashtag_platforms?: string[];
  /**
   * Route the post through a saved approval workflow (id from
   * `approvalWorkflows.list()`). The post is created as `in_approval`
   * (`approval_status: "pending"`) instead of `scheduled`; its approvers are
   * notified and it publishes at `scheduled_at` once the last step approves
   * (dashboard, or `posts.approve`). Requires `scheduled_at`; not allowed
   * with `publish_now`. Errors: `404 workflow_not_found`, `400 validation_error`.
   */
  approval_workflow_id?: string;
  /**
   * Planned draft. With `scheduled_at`, the post is stored as `draft` and
   * keeps that time: it shows on the dashboard calendar at that slot with a
   * dashed outline, the scheduler never publishes it, and a person schedules
   * it from the composer (or you do with `update` and `draft: false`). Use it
   * when an agent proposes a slot that a human should confirm. Not allowed
   * with `publish_now` or `approval_workflow_id` (`400 validation_error`).
   * Without `scheduled_at` it changes nothing: that post is a draft already.
   */
  draft?: boolean;
  /**
   * Image fit per channel for feed images whose ratio is outside what a
   * channel shows uncropped, keyed by platform id (`instagram`,
   * `pinterest`, ...). `auto` (default): Instagram crops a tall or wide
   * image to 4:5 / 1.91:1 around the subject (Instagram cuts it to that
   * window anyway and Meta cannot boost a feed post outside it); Pinterest
   * keeps a Pin taller than 2:3 and reports it. `crop` / `keep` force it per
   * channel. Decisions come back in `warnings` with code `image_fit`.
   */
  media_fit?: Record<string, MediaFitMode>;
  /**
   * Comment-to-DM automation bound to this post (Instagram must be in
   * `channels`): a keyword in a comment is answered with a DM, once per
   * person, with an optional public reply under the comment. See
   * {@link CommentDmAutomationInput} for the shape. Needs the
   * `automations:write` scope on the key (`403 insufficient_scope`, checked
   * before anything else); a bad object is a `400 validation_error` whose
   * message starts with `comment_dm_automation: `. The response carries
   * `data.comment_dm_automation` (the {@link Automation}, with `post: null`);
   * it starts listening once the post is live on Instagram.
   */
  comment_dm_automation?: CommentDmAutomationInput | null;
  /**
   * Pinterest options (`board_id`, `title`, `link`, `alt_text`, ...).
   * `product_tags` tags products on the Pin: up to 24 product Pins of the
   * connected Pinterest account, each as a Pin id string (see
   * `pinterest.listProducts()`) or a Pin link. Products of other merchants
   * cannot be tagged. The tags are added right after the Pin is published; a
   * product Pinterest refuses never fails the post (see
   * {@link PinterestProductTagsResult}). More than 24 entries or an invalid
   * entry returns `400 validation_error`.
   */
  pinterest?: Record<string, unknown>;
  youtube?: Record<string, unknown>;
  instagram?: Record<string, unknown>;
  facebook?: Record<string, unknown>;
  linkedin?: Record<string, unknown>;
  linkedin_page?: Record<string, unknown>;
  linkedin_poll?: LinkedInPollInput | null;
  tiktok?: Record<string, unknown>;
  x?: XPostOptions;
  bluesky?: BlueskyPostOptions;
  mastodon?: MastodonPostOptions;
  threads?: ThreadsPostOptions;
  google_business?: Record<string, unknown>;
  telegram?: TelegramPostOptions | null;
}

export interface UpdatePostParams {
  content?: string | Record<string, string>;
  scheduled_at?: string;
  /**
   * Planned-draft switch. `false` without `scheduled_at` schedules a draft at
   * the `scheduled_at` it already carries (`400 validation_error` when it has
   * none or it is in the past). `true` without `scheduled_at` unschedules a
   * scheduled post: it keeps its time and stays on the calendar as a dashed
   * draft, nothing publishes; a post waiting for approval leaves its
   * workflow. `true` with `scheduled_at` moves the time and keeps (or makes)
   * the post a draft.
   */
  draft?: boolean;
  /**
   * Image fit per channel (same shape as {@link CreatePostParams.media_fit}).
   * On update, `media_fit` alone re-decides the stored images (`keep` gives
   * the original back). Decisions come back in `warnings` with code
   * `image_fit`.
   */
  media_fit?: Record<string, MediaFitMode>;
  /**
   * Comment-to-DM automation on this post (same shape as on
   * {@link CreatePostParams.comment_dm_automation}): an object replaces the
   * post's automation, `null` removes it, omit to leave it untouched. Needs
   * the `automations:write` scope.
   */
  comment_dm_automation?: CommentDmAutomationInput | null;
  channels?: string[];
  /** Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[] | Record<string, MediaIdInput[]>;
  /** Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[] | Record<string, MediaUrlInput[]>;
  type?: string;
  location_id?: string;
  collaborators?: string[];
  user_tags?: UserTag[];
  /** Replaces the stored video cover wholesale; `null` removes it; omit to leave it untouched. */
  video_cover?: VideoCover | null;
  /**
   * Replaces the stored Pinterest options wholesale, so leave `product_tags`
   * out (or send `[]`) to remove the product tags.
   */
  pinterest?: Record<string, unknown>;
  youtube?: Record<string, unknown>;
  instagram?: Record<string, unknown>;
  facebook?: Record<string, unknown>;
  linkedin?: Record<string, unknown>;
  linkedin_page?: Record<string, unknown>;
  /** `null` clears the poll (revert to a normal post); omit to leave it untouched. */
  linkedin_poll?: LinkedInPollInput | null;
  tiktok?: Record<string, unknown>;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  x?: XPostOptionsUpdate;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  bluesky?: BlueskyPostOptionsUpdate;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  mastodon?: MastodonPostOptionsUpdate;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  threads?: ThreadsPostOptionsUpdate;
  google_business?: Record<string, unknown>;
  /** Merges into the stored Telegram options; `null` on a key removes it. */
  telegram?: TelegramPostOptions | null;
}

export interface ListPostsParams {
  /** Filter by status: "draft", "in_approval", "scheduled", "posting", "published", "failed", "warning". "in_approval" = waiting for a reviewer in an approval workflow. */
  status?: string;
  /** Max items to return (default 20, max 100). */
  limit?: number;
  /** Items to skip (default 0). */
  offset?: number;
}

export interface RecentPlatformPostsParams {
  /** Max posts per platform. */
  limit?: number;
  /** Platforms to fetch, e.g. ["instagram", "x"] or "instagram,x". Omit for all connected. */
  platforms?: string | string[];
}

/** One published slide of a multi-slide story. */
export interface StorySlide {
  /** Zero-based slide position. */
  index: number;
  /** The slide's story id on the platform. */
  native_post_id: string;
  /** Story URL (valid for 24 hours). */
  url: string | null;
  media_url?: string | null;
  media_type?: "image" | "video" | string | null;
  published_at?: string | null;
}

export interface Post {
  id: string;
  /** Caption; either a plain string or a per-platform map with a `default` key. */
  content: string | Record<string, string>;
  status: string;
  type?: string;
  /**
   * The channels this post targets, as a map of every platform key to
   * `true` or `false` (e.g. `{ instagram: true, x: false }`). Requests take
   * an array of account IDs instead.
   */
  accounts: Record<string, boolean>;
  /**
   * Attached media: a flat array shared across platforms, or a per-platform
   * map (`default` key + platform overrides). Items include an optional `alt`
   * accessibility description when one was set. A channel entry decided by
   * `media_fit` also carries `fit` (`"crop"` | `"keep"`) and, when cropped,
   * `crop` (`{ of, id?, ratio, focus: { x, y } | null }`: the original it was
   * cut from, the crop's ratio and the focus point).
   */
  media: unknown[] | Record<string, unknown[]>;
  /** ISO datetime the post is/was scheduled for, or null. */
  schedule_at: string | null;
  approval_status?: string | null;
  /** Deep link to this post inside the OmniSocials app (composer or details view). */
  app_url: string;
  /** Live post URL per platform, present once published. */
  published_urls: Record<string, string>;
  /**
   * Stories only, after publishing: every slide per platform in publish
   * order. `published_urls` keeps only the first slide's URL.
   */
  story_slides?: Record<string, StorySlide[]>;
  /** Instagram location tag (Facebook Place/Page ID), echoed when set. */
  location_id?: string;
  /** Instagram collaborators, echoed when set. */
  collaborators?: string[];
  /** Instagram photo user tags, echoed when set. */
  user_tags?: Array<{ username: string; x: number; y: number; image_index?: number }>;
  /** Stored video thumbnail (base + per-platform overrides); null when none was chosen. */
  video_cover?: VideoCover | null;
  source?: string | null;
  /**
   * Present when this post was created by the dashboard "retry as new post"
   * flow: the ID of the original failed post it retries.
   */
  retry_of?: string;
  /**
   * Present on a post that has been retried as a new post: the IDs of its
   * retry posts. A `published` post with empty `published_urls` and `retries`
   * set is a resolved failure, not a second publish.
   */
  retries?: string[];
  created_at: string;
  updated_at?: string;
  /**
   * Per-platform user-friendly error messages, keyed by platform identifier.
   * Populated when `status` is `failed` or `warning`; only failed platforms
   * appear. `null` while draft/scheduled/processing or if all succeeded.
   */
  errors?: Record<string, string> | null;
  x?: {
    reply_settings?: string;
    paid_partnership?: boolean;
    made_with_ai?: boolean;
    poll?: ChannelPoll | null;
    thread_parts?: Array<{ id?: string; text: string; media_urls?: MediaUrlInput[] }>;
    [key: string]: unknown;
  };
  bluesky?: {
    thread_parts?: Array<{ id?: string; text: string; media_urls?: MediaUrlInput[] }>;
    [key: string]: unknown;
  };
  mastodon?: {
    poll?: ChannelPoll | null;
    thread_parts?: Array<{ id?: string; text: string; media_urls?: MediaUrlInput[] }>;
    [key: string]: unknown;
  };
  threads?: {
    poll?: ChannelPoll | null;
    thread_parts?: Array<{ id?: string; text: string; media_urls?: MediaUrlInput[] }>;
    /** Threads location tag, present only when one is set. */
    location?: {
      id: string;
      name?: string | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
    };
    [key: string]: unknown;
  };
  telegram?: TelegramPostOptions & {
    /** Present once the post was sent. */
    result?: TelegramPostResult;
    first_comment_result?: Record<string, unknown> | null;
    [key: string]: unknown;
  };
  pinterest?: {
    /** Product Pin ids tagged on the Pin, echoed when set. */
    product_tags?: string[];
    /** Present on a published post that had `product_tags`. */
    product_tags_result?: PinterestProductTagsResult;
    [key: string]: unknown;
  };
  /** Non-sponsored LinkedIn poll, echoed back when this post is one. */
  linkedin_poll?: LinkedInPollInput | null;
  /**
   * On a post that goes to Instagram (`posts.get()`, and the create / update
   * response when the request carried the field): the comment-to-DM
   * automation bound to this post, with `post: null`, or `null` when it has
   * none.
   */
  comment_dm_automation?: Automation | null;
  [key: string]: unknown;
}

/**
 * One entry of the optional top-level `warnings` array on post create and
 * update responses (a sibling of `data`, omitted when there is nothing to
 * warn about). Two codes. `x_url_post_credits`: X bills API posts whose text
 * contains a URL at a premium, and OmniSocials passes that through as prepaid
 * credits (20 credits per URL-containing tweet; threads billed per part with
 * a link). Debiting starts at `enforce_from` (2026-08-14); if the company
 * balance can't cover it at publish time, only the X target fails and can be
 * retried after topping up in the dashboard (Settings -> Organisation ->
 * Billing -> Credits). Posts without links stay free. `image_fit`: a feed
 * image whose ratio is outside what a channel shows uncropped; `action` says
 * what was done for that channel (see `media_fit` on the params), with
 * `platform`, `media_url`, `ratio`, `target` and `crop_url`.
 */
export interface PostWarning {
  /** Warning identifier: "x_url_post_credits" or "image_fit". */
  code: string;
  /** Human-readable explanation. */
  message: string;
  /** Credits this post will use when it publishes. */
  credits_required?: number;
  /** The company's current credit balance (null if unavailable). */
  credits_balance?: number | null;
  /** Whether the credit debit is enforced yet (warning-only before `enforce_from`). */
  enforced?: boolean;
  /** ISO date enforcement starts, e.g. "2026-08-14". */
  enforce_from?: string;
  /** `image_fit`: the channel the decision is for, e.g. "instagram". */
  platform?: string;
  /** `image_fit`: the original image. */
  media_url?: string;
  /** `image_fit`: the image's ratio, e.g. "9:16". */
  ratio?: string;
  /** `image_fit`: the channel's window, e.g. "4:5". */
  target?: string;
  /** `image_fit`: what happened for that channel. */
  action?: "cropped" | "kept" | "crop_failed";
  /** `image_fit`: the cropped file when `action` is "cropped". */
  crop_url?: string;
}

/** Response of `posts.create` / `posts.createAndPublish`: `{ data, warnings? }`. */
export interface CreatePostResponse extends ItemResponse<Post> {
  /** Non-blocking notices about this post; see {@link PostWarning}. */
  warnings?: PostWarning[];
}

/**
 * Response of `posts.update`: `{ data, warnings? }`. The same envelope as
 * {@link CreatePostResponse}; `warnings` carries the `image_fit` decisions
 * when the update changes the images or `media_fit`.
 */
export type UpdatePostResponse = CreatePostResponse;

/** `data` payload of `POST /posts/:id/retry`. */
export interface PostRetryResult {
  /** ID of the post being retried. */
  id: string;
  /** Post status after queueing, e.g. "posting". */
  status: string;
  /** The failed platforms being retried. */
  platforms: string[];
  /** Human-readable confirmation, e.g. "Retry queued for: tiktok. ...". */
  message: string;
}

/** `data` payload of `POST /posts/:id/approve`. */
export interface PostApproveResult {
  id: string;
  /** Post status after this call: "in_approval" (more steps remain), "scheduled", or "posting". */
  status: string;
  approval_status: "pending" | "approved";
  message?: string;
}

/** `data` payload of `POST /posts/:id/reject`. */
export interface PostRejectResult {
  id: string;
  status: "rejected";
  approval_status: "rejected";
  message?: string;
}

/** A person named in a post's approval review: `id` is the user id. */
export interface PostApprovalUser {
  id: string;
  name: string | null;
}

/** One approver on a step of a post's approval review. */
export interface PostApprovalApprover {
  /** User id of the approver. */
  id: string;
  name: string | null;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  /** When this approver decided; `null` while pending. */
  decided_at: string | null;
  /** The reason this approver gave with a rejection; `null` otherwise. */
  comment: string | null;
}

/** One step of a post's approval review. */
export interface PostApprovalStep {
  /** 1-based step order; steps are approved in order. */
  order: number;
  name: string;
  /** `any` = one approver of the step is enough; `all` = every approver must approve. */
  require_mode: "any" | "all";
  status: "pending" | "approved" | "rejected";
  approvers: PostApprovalApprover[];
}

/** Who rejected the post, why, when, and on which step. */
export interface PostApprovalRejection {
  by: PostApprovalUser;
  reason: string | null;
  at: string | null;
  /** Order of the step the rejection happened on. */
  step: number | null;
}

/** One entry of the review thread. */
export interface PostApprovalComment {
  id: string;
  /** `null` when the author is not known. */
  author: PostApprovalUser | null;
  message: string;
  /** The channel the comment is about (`instagram`, `linkedin_page`, ...); `null` = the whole post. */
  account: string | null;
  created_at: string;
}

/** `data` payload of `GET /posts/:id/approval`: the approval review of a post. */
export interface PostApproval {
  post_id: string;
  /**
   * `none` = the post has no approval workflow; then `workflow`,
   * `requested_by`, `requested_at`, `current_step` and `rejection` are
   * `null` and `steps` and `comments` are empty.
   */
  status: "none" | "pending" | "approved" | "rejected";
  /** `workflow.id` is `null` for a one-off approval that was not made from a saved workflow. */
  workflow: { id: string | null; name: string } | null;
  requested_by: PostApprovalUser | null;
  requested_at: string | null;
  /** Order of the step the post waits on; `null` when the review ended. */
  current_step: number | null;
  steps: PostApprovalStep[];
  /** Set when an approver rejected the post; `null` otherwise. */
  rejection: PostApprovalRejection | null;
  /** The review thread, oldest first. Includes the entries OmniSocials writes when a reviewer edits the post. */
  comments: PostApprovalComment[];
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  /** "image", "video" or "document" (a PDF kept as one item). */
  type: string;
  name?: string | null;
  filename: string;
  folder_id?: string | null;
  /** Human-formatted size string (e.g. "2.50 MB"), not a byte count. */
  size: string;
  /** Pixel width; null for videos and older files. */
  width?: number | null;
  /** Pixel height; null for videos and older files. */
  height?: number | null;
  status?: string;
  created_at: string;
  /**
   * Present on a PDF document item (type "document": the kept file plus its
   * rendered `pages`) and on a slide rendered from a PDF (type "image": which
   * file and `page` it came from). LinkedIn receives the original when the
   * pages are posted unchanged (see `document_source` on the LinkedIn options).
   */
  pdf?: {
    id: string;
    name: string;
    url: string;
    /** Slides only: the 1-based page this image renders. */
    page?: number;
    total_pages: number;
    rendered_pages: number;
    /** Document items only. */
    truncated?: boolean;
    /** Document items only: the rendered page images, in order. */
    pages?: Array<{ url: string; width?: number | null; height?: number | null }>;
  };
  [key: string]: unknown;
}

/**
 * Extra top-level fields returned by media uploads when the file is a PDF.
 * A PDF is rasterized into one image slide per page (max 20) and the original
 * file is kept: `data` mirrors the first slide (back-compat) while `slides` +
 * `media_ids` carry the whole carousel in page order. Pass ALL of `media_ids`
 * to posts.create. On LinkedIn the slides post as a native swipeable document
 * made from the original PDF (unless the post's `linkedin.document_source` is
 * `"slides"`); elsewhere as an image carousel.
 */
export interface PdfUploadResult {
  slides: MediaItem[];
  media_ids: string[];
  pdf: {
    total_pages: number;
    rendered_pages: number;
    truncated: boolean;
    /** The kept original PDF. */
    id?: string;
    name?: string;
    url?: string;
    size_bytes?: number;
  };
}

/** Per-platform compatibility block returned alongside media uploads. */
export type MediaCompatibility = Record<string, unknown>;

export interface MediaUploadResponse extends Partial<PdfUploadResult> {
  data: MediaItem;
  /** Connected platforms that would reject this file, with reasons. */
  compatibility?: MediaCompatibility;
  message?: string;
  [key: string]: unknown;
}

export interface ListMediaParams {
  /** Max items to return (default 20, max 100). */
  limit?: number;
  /** Items to skip (default 0). */
  offset?: number;
  /** Free-text search over name + filename. */
  search?: string;
  /** Filter by folder. Use "root" (or "null") for unfiled items. */
  folder_id?: string;
}

export interface UploadMediaParams {
  /**
   * The file to upload: a Buffer / Uint8Array / ArrayBuffer of bytes, a Blob,
   * or a filesystem path string (read with node:fs).
   */
  file: Uint8Array | ArrayBuffer | Blob | string;
  /** Filename sent with the multipart part (inferred from a path when omitted). */
  filename?: string;
  /** Optional human-readable label so the asset is findable by name later. */
  name?: string;
  /** Folder name to file the asset under (created at top level if missing). */
  folder?: string;
  /** Id of an existing folder to file the asset under. */
  folder_id?: string;
  /**
   * PDF uploads only. "slides" (default): one image item per page, one id
   * each (pass all of media_ids). "document": one item of type "document"
   * for the whole PDF; its single id in media_ids expands into every page.
   */
  pdf_mode?: "slides" | "document";
}

export interface UploadMediaFromUrlParams {
  /** Publicly accessible http(s) URL. Files up to 1GB are supported. */
  url: string;
  filename?: string;
  /** Optional human-readable label so the asset is findable by name later. */
  name?: string;
  /** Folder name to file the asset under (created at top level if missing). */
  folder?: string;
  /** Id of an existing folder to file the asset under. */
  folder_id?: string;
  /**
   * PDF uploads only. "slides" (default): one image item per page, one id
   * each (pass all of media_ids). "document": one item of type "document"
   * for the whole PDF; its single id in media_ids expands into every page.
   */
  pdf_mode?: "slides" | "document";
}

export interface UploadMediaFromBase64Params {
  /** Base64-encoded file data (without a data URI prefix). */
  data: string;
  /** MIME type, e.g. "image/jpeg", "image/png", "application/pdf". */
  mime_type: string;
  filename?: string;
  /** Optional human-readable label so the asset is findable by name later. */
  name?: string;
  /** Folder name to file the asset under (created at top level if missing). */
  folder?: string;
  /** Id of an existing folder to file the asset under. */
  folder_id?: string;
  /**
   * PDF uploads only. "slides" (default): one image item per page, one id
   * each (pass all of media_ids). "document": one item of type "document"
   * for the whole PDF; its single id in media_ids expands into every page.
   */
  pdf_mode?: "slides" | "document";
}

/**
 * Response of media.createUploadUrl(): a one-time presigned upload URL for
 * large files (up to 1GB). POST the file as multipart form data (field name
 * "file") to `upload_url` within `expires_in_seconds`; no auth headers needed.
 */
export interface CreateUploadUrlResponse {
  upload_url: string;
  upload_token: string;
  expires_in_seconds: number;
  method: string;
  content_type: string;
  instructions?: string;
  hint?: string;
  [key: string]: unknown;
}

export interface CheckMediaParams {
  /** Public URL of the file to preflight. */
  url?: string;
  /** Id of an already-uploaded Library item. */
  media_id?: string;
  /** Raw size in bytes (pair with `mime`). */
  size_bytes?: number;
  /** MIME type (pair with `size_bytes`). */
  mime?: string;
}

/**
 * One connected channel's fit verdict for an IMAGE as a feed post, in
 * `MediaCheckResponse.fit`. `fits: false` = the ratio is outside the window
 * the channel shows uncropped; `default_action` is what a post create does
 * (`crop` = Instagram crops it to `target` around the subject; `keep` =
 * Pinterest sends it as it is and reports it) unless the post's `media_fit`
 * says otherwise.
 */
export interface MediaCheckFit {
  platform: string;
  display_name: string;
  fits: boolean;
  /** The image's ratio, e.g. "9:16". */
  ratio: string;
  /** Whether the channel shows the whole image or cuts it. */
  shown: "whole" | "cut";
  /** The channel's window, e.g. "4:5"; null when the image fits. */
  target: string | null;
  /** What a post create does for this channel; null when the image fits. */
  default_action: "crop" | "keep" | null;
  /** Human-readable explanation; null when the image fits. */
  message: string | null;
}

/** Response of `media.check`. Not the `{ data }` envelope. */
export interface MediaCheckResponse {
  file: {
    size_bytes: number | null;
    mime: string | null;
    size_known: boolean;
    /** Pixel width, known for library images; null otherwise. */
    width: number | null;
    /** Pixel height, known for library images; null otherwise. */
    height: number | null;
  };
  connected_platforms: string[];
  /** true when no connected platform would reject the file. */
  compatible: boolean;
  /** Connected platforms that would reject this file, with reasons. */
  warnings: Array<{ platform: string; display_name: string; reasons: string[] }>;
  /** One-line human summary, or null when fully compatible. */
  summary: string | null;
  /**
   * How each connected channel with a fit rule shows this image as a feed
   * post. Empty for videos and unknown sizes.
   */
  fit: MediaCheckFit[];
  [key: string]: unknown;
}

export interface UpdateMediaParams {
  /** Human-readable label. Send an empty string to clear it. */
  name?: string;
  /** Move into this folder; `null` moves it to the root ("All media"). */
  folder_id?: string | null;
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  item_count?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface CreateFolderParams {
  name: string;
  parent_id?: string;
}

export interface UpdateFolderParams {
  /** New folder name. */
  name?: string;
  /** Move under this folder; `null` moves it to the top level. */
  parent_id?: string | null;
}

// ─── Approval workflows ──────────────────────────────────────────────────────

export interface ApprovalWorkflowApprover {
  /** User id of the approver. */
  id: string;
  name: string | null;
  email: string | null;
}

export interface ApprovalWorkflowStep {
  /** 1-based step order; steps are approved in order. */
  order: number;
  name: string;
  /** `any` = one approver of the step is enough; `all` = every approver must approve. */
  require_mode: "any" | "all";
  approvers: ApprovalWorkflowApprover[];
}

/** A saved approval workflow (configured in the dashboard under Approvals). */
export interface ApprovalWorkflow {
  /** Pass as `approval_workflow_id` on `posts.create`. */
  id: string;
  name: string;
  /** Workspace the workflow is bound to, or `null` when it is company-wide. */
  workspace_id: number | null;
  steps: ApprovalWorkflowStep[];
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// ─── Hashtag sets ────────────────────────────────────────────────────────────

export interface HashtagSet {
  id: string;
  name: string;
  /** The tags, WITHOUT the leading `#`. */
  hashtags: string[];
  hashtag_count: number;
  /** Ready-to-paste form, e.g. `"#a #b"`. */
  preview: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CreateHashtagSetParams {
  /** Set name; posts.create matches it case-insensitively via `hashtag_set`. */
  name: string;
  /** The tags: an array, or a single string of tags. */
  hashtags: string[] | string;
}

export interface UpdateHashtagSetParams {
  /** New set name. */
  name?: string;
  /** Replaces the FULL hashtag list: an array, or a single string of tags. */
  hashtags?: string[] | string;
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  content_types: string[];
  /**
   * "active" while the OAuth token is healthy. Flips to "needs_reconnect"
   * when the platform has revoked/expired the token; posts to this account
   * will fail until the user reconnects.
   */
  status: "active" | "needs_reconnect" | string;
  needs_reconnect: boolean;
  /** Short reason from the platform; only present when needs_reconnect is true. */
  reauth_reason?: string | null;
  connected_at: string | null;
  boards?: { id: string; name: string }[];
  platform_details?: {
    subscription_type?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Response of `accounts.list()`: `{ data, workspace_id?, workspace_name?, workspace_icon? }`. */
export interface AccountsListResponse extends ListResponse<Account> {
  /** Stable id of the active workspace this key belongs to. */
  workspace_id?: number;
  /** Human-readable name of the active workspace. */
  workspace_name?: string | null;
  /** Icon URL of the active workspace, if one is set. */
  workspace_icon?: string | null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * One entry per platform the post was published to. For thread platforms
 * (X, Bluesky, Mastodon, Threads) `metrics` is summed across all parts and
 * `platform_post_id` is the thread root; `thread_parts` is 1 for single posts.
 */
export interface PostAnalyticsPlatformEntry {
  platform: string;
  platform_post_id: string;
  metrics: Record<string, number | string>;
  thread_parts: number;
  collected_at: string;
  /**
   * Multi-slide stories only: per-slide metrics in publish order
   * (`metrics` above is the sum across slides).
   */
  story_slides?: PostAnalyticsStorySlide[];
  [key: string]: unknown;
}

/** One slide's own metrics inside a multi-slide story. */
export interface PostAnalyticsStorySlide {
  /** Zero-based slide position. */
  index: number;
  /** The slide's own story id on the platform. */
  platform_post_id: string;
  metrics: Record<string, number | string>;
  collected_at: string;
}

export interface PostAnalytics {
  post_id: string;
  platforms: Record<string, PostAnalyticsPlatformEntry>;
  [key: string]: unknown;
}

/** Response of `analytics.posts()`: `{ data, count? }`. */
export interface PostsAnalyticsResponse extends ItemResponse<PostAnalytics[]> {
  /** Number of entries returned (equals the number of valid ids requested). */
  count?: number;
}

/** Per-platform block inside `AnalyticsOverview.platform_breakdown`. */
export interface AnalyticsOverviewPlatform {
  posts: number;
  total_engagement: number;
  total_impressions: number;
  average_engagement: number;
  /** Percentage 0-100; 0 when impressions are below the reporting threshold. */
  engagement_rate: number;
  [key: string]: unknown;
}

export interface AnalyticsOverview {
  total_posts: number;
  total_platforms: number;
  total_engagement: number;
  total_impressions: number;
  /** Percentage 0-100; 0 when impressions are below the reporting threshold. */
  average_engagement_rate: number;
  top_performing_platform: string | null;
  platform_breakdown: Record<string, AnalyticsOverviewPlatform>;
  [key: string]: unknown;
}

/** Response of `analytics.overview()`: `{ data, current_date? }`. */
export interface AnalyticsOverviewResponse extends ItemResponse<AnalyticsOverview> {
  /** Today's date (YYYY-MM-DD), server-side, for grounding relative date calculations. */
  current_date?: string;
}

export interface AnalyticsOverviewParams {
  /** Named period, e.g. "7d", "30d", "90d". */
  period?: string;
  /** ISO date (YYYY-MM-DD); use with end_date instead of period. */
  start_date?: string;
  /** ISO date (YYYY-MM-DD); use with start_date instead of period. */
  end_date?: string;
}

export interface AccountAnalyticsParams {
  /** Restrict to one platform, e.g. "instagram". */
  platform?: string;
  /** ISO date (YYYY-MM-DD) to fetch a specific day's snapshot. */
  date?: string;
}

export interface BestTimesParams {
  /** Platform identifier, e.g. "instagram". */
  platform: string;
  /** IANA timezone for the returned slots, e.g. "Europe/Amsterdam". */
  timezone?: string;
}

/** One day/hour cell in `BestTimesResponse.grid`. */
export interface BestTimesSlot {
  /** Lowercase weekday, e.g. "monday". */
  day: string;
  /** Hour of the day, 0-23, in the response timezone. */
  hour: number;
  /** Score relative to the best slot of the platform (100 = best). */
  score: number;
  /** Sample count behind the cell. Absent on defaults. */
  n?: number;
  /** Typical engagement for the slot. Absent on defaults. */
  typical_engagement?: number;
  [key: string]: unknown;
}

/** One of the top slots in `BestTimesResponse.recommendations`. */
export interface BestTimesRecommendation extends BestTimesSlot {
  /** The hour as "HH:00", e.g. "15:00". */
  time: string;
}

/**
 * Response of `analytics.bestTimes()`. The fields sit at the top level of
 * the response. There is no `data` wrapper.
 */
export interface BestTimesResponse {
  platform: string;
  /** IANA timezone the day/hour buckets are expressed in. */
  timezone: string;
  /** Where the slots come from: own posts, audience activity, or industry defaults. */
  basis: "own_data" | "own_data_and_audience" | "audience" | "defaults" | (string & {});
  /** Number of analyzed posts. */
  sample_size?: number;
  /** Published posts still needed for personalized slots (0 on own data). */
  posts_needed?: number;
  metric?: string;
  window_days?: number;
  /** Hour (0-23) to the number of followers online. Instagram and TikTok Business only. */
  audience_online?: Record<string, number>;
  /** Snapshot date (YYYY-MM-DD) of `audience_online`. */
  audience_online_date?: string;
  /** Every day/hour cell that has data. */
  grid: BestTimesSlot[];
  /** The top 3 slots. */
  recommendations: BestTimesRecommendation[];
  [key: string]: unknown;
}

// ─── Locations ───────────────────────────────────────────────────────────────

export interface LocationSearchItem {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  [key: string]: unknown;
}

/**
 * Note: locations responses are NOT wrapped in the usual `{ data }` envelope
 * alone; `error` here is a plain string set when search is unavailable (e.g.
 * no Facebook account connected), with `data` then empty.
 */
export interface LocationSearchResponse {
  data: LocationSearchItem[];
  error?: string | null;
  /** true when the Facebook app lacks "Page Public Content Access". */
  needsPermission?: boolean;
  [key: string]: unknown;
}

export interface SearchLocationsParams {
  /** Search text (min 2 characters). Threads also accepts `latitude` + `longitude` instead. */
  q?: string;
  /**
   * Location source: `"instagram"` (Facebook Places, the default) or
   * `"threads"`. The two sources use different ids (a Facebook Place id is
   * not a Threads location id).
   */
  platform?: "instagram" | "threads";
  /** Threads only: search around a point instead of `q` (-90 to 90). Pair with `longitude`. */
  latitude?: number;
  /** Threads only: pair with `latitude` (-180 to 180). */
  longitude?: number;
}

/** One Threads location from `locations.search({ platform: "threads" })`. */
export interface ThreadsLocation {
  /** The Threads location id; use it as `threads.location_id` on a post. */
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  [key: string]: unknown;
}

/** The `error` object on a degraded Threads location search response. */
export interface ThreadsLocationSearchError {
  /**
   * `"not_available"` (Threads location tagging is not enabled in this
   * environment yet; it is rolling out), `"threads_not_connected"`,
   * `"threads_reauth_required"` (the connection lacks the
   * `threads_location_tagging` permission; reconnect Threads), or
   * `"platform_error"`.
   */
  code:
    | "not_available"
    | "threads_not_connected"
    | "threads_reauth_required"
    | "platform_error"
    | (string & {});
  message: string;
  [key: string]: unknown;
}

/**
 * Response of `locations.search({ platform: "threads" })`. Note the shape
 * differs from the Instagram response: `locations` on success OR `error` on
 * the degraded path. Validation problems (neither `q` nor
 * `latitude`+`longitude`, `q` under 2 characters, coordinates out of range)
 * throw a 400 `APIError` instead.
 */
export interface ThreadsLocationSearchResponse {
  locations?: ThreadsLocation[];
  error?: ThreadsLocationSearchError;
  [key: string]: unknown;
}

export interface LocationValidateResponse {
  valid: boolean;
  id?: string | null;
  name?: string | null;
  address?: string | null;
  /** Couldn't be checked now; the publish step will validate. */
  unverified?: boolean;
  /** Why it isn't valid / couldn't be verified. */
  reason?: string | null;
  [key: string]: unknown;
}

// ─── Audio ───────────────────────────────────────────────────────────────────

export interface AudioTrack {
  /** Meta audio id; use it as `instagram.audio_id` on a reel post. */
  audio_id: string;
  title: string | null;
  artist: string | null;
  duration_ms: number | null;
  audio_type: "music" | "original_sound";
  cover_url: string | null;
  /** Temporary URL (~1.5 days); never persist it. */
  preview_url: string | null;
  ig_username: string | null;
  [key: string]: unknown;
}

/**
 * Note: audio responses are NOT wrapped in the usual `{ data }` envelope
 * alone; `error` here is a plain string set when search is unavailable (e.g.
 * no Facebook account connected), with `data` then empty.
 */
export interface AudioSearchResponse {
  data: AudioTrack[];
  error?: string | null;
  /**
   * true when the workspace needs a Facebook connection linked to the
   * Instagram account.
   */
  needsFacebook?: boolean;
  [key: string]: unknown;
}

// ─── Pinterest ───────────────────────────────────────────────────────────────

/** One product Pin from `pinterest.listProducts()`. */
export interface PinterestProduct {
  /** The Pin id; use it in `pinterest.product_tags` on a post. */
  pin_id: string;
  title: string | null;
  description: string | null;
  /** The product page the Pin links to. */
  link: string | null;
  /** A small image of the product Pin. */
  image_url: string | null;
  /** Catalog source only. */
  price: number | null;
  /** Catalog source only. ISO 4217 code, e.g. "EUR". */
  currency: string | null;
  /** Catalog source only, as Pinterest reports it (e.g. "IN_STOCK", "OUT_OF_STOCK"). */
  availability: string | null;
  /** Catalog source only. The merchant's own product id. */
  item_id: string | null;
  [key: string]: unknown;
}

/** One catalog product group on a `pinterest.listProducts()` response. */
export interface PinterestProductGroup {
  id: string;
  name: string | null;
  [key: string]: unknown;
}

export interface ListPinterestProductsParams {
  /**
   * Where to read product Pins from: `"catalog"` (the Pinterest catalog,
   * needs catalog access) or `"pins"` (the account's own Pins). Default:
   * `"catalog"` when the connection has catalog access, else `"pins"`.
   */
  source?: "catalog" | "pins";
  /**
   * Catalog source only: a product group `id` from `product_groups`.
   * Default: the group named "All Products", else the first group.
   */
  product_group_id?: string;
  /** Cursor from the previous response, to get the next page. */
  bookmark?: string;
  /** Catalog source only: products per page (1 to 100, default 25). */
  page_size?: number;
}

/** The `error` object on a `pinterest.listProducts()` response that has no `products`. */
export interface PinterestProductsError {
  /**
   * `"pinterest_not_connected"` (no Pinterest account on the workspace),
   * `"pinterest_catalog_access_required"` (`source: "catalog"` was asked but
   * the connection has no catalog access; connect the catalog in the
   * composer or use `source: "pins"`), or `"platform_error"` (Pinterest did
   * not answer or refused; the message carries Pinterest's text).
   */
  code:
    | "pinterest_not_connected"
    | "pinterest_catalog_access_required"
    | "platform_error"
    | (string & {});
  message: string;
  [key: string]: unknown;
}

/**
 * Response of `pinterest.listProducts()`. Note the shape is NOT the usual
 * `{ data }` envelope: `products` on success OR `error` when the list could
 * not be read (no Pinterest account, no catalog access, Pinterest did not
 * answer), both with HTTP 200. Validation problems (a `source` that is not
 * `"catalog"` or `"pins"`, an unknown `product_group_id`) throw a 400
 * `APIError` instead.
 */
export interface PinterestProductsResponse {
  products?: PinterestProduct[];
  /** Pass as `bookmark` to get the next page. `null` on the last page. */
  bookmark?: string | null;
  /** The source that was read. */
  source?: "catalog" | "pins";
  /** true when the Pinterest connection can read the catalog. */
  catalog_access?: boolean;
  /** The connection has catalog access but the Pinterest account has no
   * catalog yet; `products` and `product_groups` are empty. */
  no_catalog?: boolean;
  /** Catalog source only: the product groups of the account. */
  product_groups?: PinterestProductGroup[];
  /** Catalog source only: the group these products come from. */
  product_group_id?: string | null;
  error?: PinterestProductsError;
  [key: string]: unknown;
}

export interface PinterestProductValidateResponse {
  valid: boolean;
  /** The Pin id read from `id` (`null` when `id` is not a Pin id or link). */
  pin_id: string | null;
  title?: string | null;
  link?: string | null;
  image_url?: string | null;
  /** Couldn't be checked now; the publish step is the final check. */
  unverified?: boolean;
  /** Why the Pin isn't valid / couldn't be checked. */
  reason?: string | null;
  [key: string]: unknown;
}

/**
 * Read-only `pinterest.product_tags_result` on a published post that had
 * `product_tags`: what Pinterest did with them. A product Pinterest refuses
 * never fails the post.
 */
export interface PinterestProductTagsResult {
  /** Number of products that were sent. */
  requested: number;
  /** Pin ids that are tagged on the Pin. */
  tagged: string[];
  /**
   * Products that were not tagged. `reason` is Pinterest's code:
   * `PIN_MISSING`, `PIN_IS_PRIVATE`, `PRODUCT_METADATA_MISSING` (not a
   * product Pin), `PIN_NOT_FROM_VERIFIED_DOMAIN` (the product link is not on
   * a claimed website), `PIN_NOT_FROM_SAME_USER_AS_HERO_PIN` (Pin of another
   * account).
   */
  skipped: Array<{ pin_id: string; reason: string }>;
  /** Set when the tag request itself failed; `tagged` is then empty. */
  error: string | null;
}

// ─── Automations (comment-to-DM) ─────────────────────────────────────────────

/** What an automation answers: a comment on the post, a DM, or a reply to a story. */
export type AutomationTriggerKind = "comment" | "dm" | "story_reply";

/**
 * How the keywords are matched: `word` (whole word), `contains` (anywhere in
 * the text) or `any` (every message, no keywords needed).
 */
export type AutomationMatch = "word" | "contains" | "any";

export type AutomationStatus = "active" | "paused" | "completed";

export type AutomationEventOutcome = "sent" | "skipped" | "failed" | "pending";

/** The `trigger` block of an {@link Automation}. */
export interface AutomationTrigger {
  /** One or more of `comment`, `dm`, `story_reply`. */
  kinds: AutomationTriggerKind[];
  /**
   * For the `comment` kind: `post` (one post), `next_post` (the next
   * Instagram post the workspace publishes) or `any` (every post). `null`
   * when `kinds` has no `comment`.
   */
  scope: "post" | "next_post" | "any" | null;
  keywords: string[];
  match: AutomationMatch;
  [key: string]: unknown;
}

/** The `actions` block of an {@link Automation}: the DM, and the optional public reply under the comment. */
export interface AutomationActions {
  dm: { text: string };
  /** Comment kind only: one of `variations` is posted under the comment. */
  public_reply?: { enabled: boolean; variations: string[] };
  [key: string]: unknown;
}

/** The `limits` block of an {@link Automation}; both are `null` when unset. */
export interface AutomationLimits {
  /** Stop after this many DMs. */
  max_sends: number | null;
  /** ISO 8601 datetime after which the automation stops. */
  stop_at: string | null;
}

export interface AutomationStats {
  matched: number;
  sent: number;
  skipped: number;
  failed: number;
  last_event_at: string | null;
}

/** The post an automation listens on, as a snapshot; `null` for scope `next_post` or `any`. */
export interface AutomationPost {
  /** `omnisocials` (a post made here) or `instagram` (a post published outside OmniSocials). */
  source: "omnisocials" | "instagram";
  id: string;
  caption: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  /** `POST`, `REEL`, `IMAGE`, `VIDEO` or `CAROUSEL_ALBUM`. */
  media_type: string | null;
  /** `omnisocials` source only: the post's status. */
  status?: string;
  /** `omnisocials` source only. */
  post_date_time?: string | null;
  /** `omnisocials` source only: true once the post is live on Instagram. */
  live?: boolean;
  [key: string]: unknown;
}

/**
 * A comment-to-DM automation: a keyword in an Instagram comment (or a DM, or
 * a story reply) is answered with a DM, once per person, with an optional
 * public reply under the comment. Instagram rules: one private reply per
 * comment, within 7 days; OmniSocials caps sends at 180 DMs an hour per
 * account.
 */
export interface Automation {
  id: string;
  type: "comment_to_dm" | (string & {});
  platform: "instagram" | (string & {});
  status: AutomationStatus;
  name: string | null;
  /** The OmniSocials post it listens on, or `null`. */
  post_id: string | null;
  /** The Instagram media id it listens on; set once the post is live. */
  instagram_media_id: string | null;
  post: AutomationPost | null;
  trigger: AutomationTrigger;
  actions: AutomationActions;
  limits: AutomationLimits;
  stats: AutomationStats;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/** One entry of `automations.listEvents()`: what happened for one person. */
export interface AutomationEvent {
  id: string;
  automation_id: string;
  /** What the person did: `comment`, `dm` or `story_reply`. */
  kind: AutomationTriggerKind;
  outcome: AutomationEventOutcome;
  /**
   * `skipped`: `already_sent`, `limit_reached`, `stopped`, `window_passed`
   * or `rate_limited`; `failed`: the platform's error text.
   */
  reason: string | null;
  /** `reason` in plain words. */
  reason_label: string | null;
  person: { id: string; username: string | null } | null;
  /** The comment id or message id that triggered the event. */
  trigger_id: string | null;
  /** The comment text; for `dm` and `story_reply` only with the `inbox:read` scope, else `null`. */
  trigger_text: string | null;
  /** The DM that was sent. */
  message: string | null;
  public_reply: string | null;
  platform_message_id: string | null;
  created_at: string;
  sent_at: string | null;
  [key: string]: unknown;
}

/**
 * Response of `automations.listEvents()`. NOT the plain list envelope: next
 * to `data` it carries `counts` (events per outcome, e.g. `{ sent: 12,
 * skipped: 3 }`; an outcome with no events is left out) and `pagination`.
 */
export interface AutomationEventsResponse {
  data: AutomationEvent[];
  counts: Partial<Record<AutomationEventOutcome, number>>;
  pagination: Pagination;
  [key: string]: unknown;
}

/** `trigger` on `automations.create()` / `automations.update()`. */
export interface AutomationTriggerInput {
  /** Default `["comment"]`. */
  kinds?: AutomationTriggerKind[];
  /**
   * Default `post`. `next_post` = the next Instagram post the workspace
   * publishes, `any` = every post.
   */
  scope?: "post" | "next_post" | "any";
  /** Up to 20, 60 characters each. Required unless `match` is `any`. */
  keywords?: string[];
  /** Default `word`. */
  match?: AutomationMatch;
}

/** `actions` on `automations.create()` / `automations.update()` and in `comment_dm_automation`. */
export interface AutomationActionsInput {
  /** The DM to send (`text` max 1000 characters). */
  dm: { text: string };
  /** Comment kind only: up to 10 variations of 300 characters; one is posted under the comment. */
  public_reply?: { enabled?: boolean; variations?: string[] };
}

/** `limits` on `automations.create()` / `automations.update()` and in `comment_dm_automation`. */
export interface AutomationLimitsInput {
  /** Stop after this many DMs. */
  max_sends?: number | null;
  /** ISO 8601 datetime after which the automation stops. */
  stop_at?: string | null;
}

export interface CreateAutomationParams {
  /** Max 120 characters. */
  name?: string;
  /**
   * For scope `post`: an OmniSocials post that goes to Instagram (scheduled
   * or live). One automation per post. Pass `post_id` OR
   * `instagram_media_id`, not both.
   */
  post_id?: string;
  /** For scope `post`: a post published outside OmniSocials (numeric Instagram media id). */
  instagram_media_id?: string;
  trigger?: AutomationTriggerInput;
  actions: AutomationActionsInput;
  limits?: AutomationLimitsInput;
  /** `active` (default) or `paused` (create as paused). */
  status?: "active" | "paused";
}

/** Every field is optional; a body with nothing is a `400 no_fields`. */
export interface UpdateAutomationParams {
  name?: string;
  /** Moves the automation to that post. */
  post_id?: string;
  /** Moves the automation to that Instagram post. */
  instagram_media_id?: string;
  /**
   * Merged into the stored trigger: keys you omit keep their value, so new
   * `keywords` keep the kinds, the scope and the match.
   */
  trigger?: AutomationTriggerInput;
  /**
   * Merged into the stored actions: a new `dm.text` keeps the public reply;
   * `public_reply: { enabled: false }` or `{ variations: [] }` turns it off.
   */
  actions?: AutomationActionsInput;
  /**
   * Merged into the stored limits: `{ stop_at }` keeps `max_sends`;
   * `{ max_sends: null }` removes that limit.
   */
  limits?: AutomationLimitsInput;
  /** `paused` pauses, `active` resumes. */
  status?: "active" | "paused";
}

export interface ListAutomationsParams {
  status?: AutomationStatus;
  /** Only the automation bound to this OmniSocials post. */
  post_id?: string;
}

export interface ListAutomationEventsParams {
  outcome?: AutomationEventOutcome;
  /** 1 to 100, default 25. */
  limit?: number;
  offset?: number;
}

/**
 * `comment_dm_automation` on `posts.create()` / `posts.update()`: the
 * automation bound to that post. The create body of `automations.create()`
 * without `post_id`, `instagram_media_id`, `scope`, `kinds`, `name` and
 * `status`; Instagram must be one of the post's channels. Needs the
 * `automations:write` scope on the key.
 */
export interface CommentDmAutomationInput {
  trigger?: { keywords?: string[]; match?: AutomationMatch };
  actions: AutomationActionsInput;
  limits?: AutomationLimitsInput;
}

// ─── Webhooks (management) ───────────────────────────────────────────────────

export type WebhookEventType =
  | "post.scheduled"
  | "post.published"
  | "post.failed"
  | "post.approved"
  | "post.rejected";

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  last_failure: {
    at: string;
    status: number | null;
    error: string;
    attempts: number;
  } | null;
  created_at: string;
  /** Signing secret; only returned on create and rotate-secret. */
  secret?: string;
  [key: string]: unknown;
}

export interface CreateWebhookParams {
  /** HTTPS endpoint that will receive event deliveries. */
  url: string;
  /** Events to subscribe to: post.scheduled, post.published, post.failed, post.approved, post.rejected. */
  events: string[];
}

export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  is_active?: boolean;
}

export interface RotateWebhookSecretResponse {
  data: {
    id: string;
    /** The new signing secret. Save it; it is only shown once. */
    secret: string;
  };
  message?: string;
  [key: string]: unknown;
}

// ─── Webhook deliveries (incoming events) ────────────────────────────────────

export interface WebhookEventTarget {
  platform: string;
  status: string;
  /** The platform-native post id, when available. */
  native_post_id: string | null;
  /** Present when the target failed. */
  error?: string;
  [key: string]: unknown;
}

/** The `data.approval` object on `post.approved` and `post.rejected` deliveries. */
export interface WebhookEventApproval {
  status: "approved" | "rejected";
  /** User id of the approver who gave the last approval, or who rejected. */
  decided_by: string;
  /** The reason given with a rejection; always `null` on `post.approved`. */
  reason: string | null;
}

/** The JSON object POSTed to your webhook endpoint (and returned by verifyWebhookSignature). */
export interface WebhookEvent {
  /** Unique delivery id. */
  id: string;
  type: WebhookEventType | (string & {});
  created_at: string;
  data: {
    post_id: string | number;
    workspace_id: string | number | null;
    status: string;
    post_type: string | null;
    scheduled_at: string | null;
    published_at: string | null;
    /** Empty on `post.scheduled`, `post.approved` and `post.rejected`. */
    targets: WebhookEventTarget[];
    /** Only on `post.approved` and `post.rejected`. */
    approval?: WebhookEventApproval;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ─── Inbox (social inbox) ────────────────────────────────────────────────────

/**
 * Cursor-based pagination used by the inbox list endpoints. Unlike the
 * offset-based `Pagination`, page on by passing `next_cursor` back as the
 * request's `cursor` while `has_more` is true. `next_cursor` is `null` on the
 * last page.
 */
export interface InboxCursorPagination {
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

/** A person on the other side of a conversation (or the sender of a message). */
export interface InboxParticipant {
  id: string;
  name: string;
  username: string;
  profile_picture: string | null;
}

/**
 * The post a comment/mention conversation is attached to (null for DMs), so a
 * reply can be drafted with the post in view.
 */
export interface InboxPostRef {
  id: string | null;
  caption: string | null;
  /** Image URL of the post (or the video's cover). */
  thumbnail: string | null;
  /**
   * Public link to the post when the platform provides one (Instagram,
   * Facebook, YouTube, TikTok, LinkedIn, Threads); `null` otherwise.
   */
  url: string | null;
  /**
   * The platform's own media label when known (e.g. `IMAGE`, `VIDEO`,
   * `CAROUSEL_ALBUM` on Instagram); `null` otherwise.
   */
  media_type: string | null;
}

/** Inbox platform identifier. */
export type InboxPlatform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "x"
  | "threads";

export interface InboxConversation {
  conversation_id: string;
  /**
   * Platform identifier, e.g. "instagram", "facebook", "linkedin", "tiktok",
   * "youtube", "x", or "threads".
   */
  platform: string;
  /** Conversation kind: "dm", "comment", or "mention". */
  type: string;
  participant: InboxParticipant;
  unread_count: number;
  last_message: {
    id: string;
    /** "incoming" (from the participant) or "outgoing" (from you). */
    direction: string;
    text: string;
    timestamp: string;
    is_read: boolean;
  };
  /** The related post for comment/mention conversations; null for DMs. */
  post: InboxPostRef | null;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  /**
   * Platform identifier, e.g. "instagram", "facebook", "linkedin", "tiktok",
   * "youtube", "x", or "threads".
   */
  platform: string;
  /** Message kind: "dm", "comment", or "mention". */
  type: string;
  /** "incoming" (from the sender) or "outgoing" (from you). */
  direction: string;
  text: string;
  timestamp: string;
  is_read: boolean;
  is_replied: boolean;
  /** Emoji reaction on the message, if any. */
  reaction: string | null;
  /** Parent comment id when this is a threaded comment reply. */
  parent_comment_id: string | null;
  /**
   * Comments and mentions only: `true` when the comment is hidden on the
   * platform (see `inbox.hide`), `false` when it is not. `null` for DMs,
   * which have no notion of hidden.
   */
  hidden: boolean | null;
  /** Link to the reply or mentioning post on the platform, when known. */
  permalink: string | null;
  /**
   * Media on this message, when present. Incoming Instagram/Facebook DM
   * images, videos, voice messages, and story mentions are re-hosted on our
   * CDN so the URL stays valid indefinitely (the platform's own URL is
   * short-lived). `null` when the message has no media.
   */
  attachment: { url: string; type: "image" | "video" | "audio" | "file" } | null;
  sender: InboxParticipant;
  /** The related post for comment/mention messages; null for DMs. */
  post: InboxPostRef | null;
}

export interface ListInboxConversationsParams {
  /** Filter by platform. */
  platform?: InboxPlatform;
  /** Filter by conversation kind. */
  type?: "dm" | "comment" | "mention";
  /** Only return conversations with unread messages. */
  unread?: boolean;
  /**
   * Only return conversations that still need an answer: the customer's
   * latest DM has no reply after it (Instagram/Facebook DMs past Meta's
   * 24-hour messaging window included: they cannot be answered through the
   * API, but the customer is still waiting), or a comment/mention that has
   * not been replied to and is not hidden. Replies typed in the native apps
   * count as answers (they are mirrored into the inbox). Read state is
   * ignored here; use `inbox.next()` for a work queue.
   */
  unanswered?: boolean;
  /** Max items to return (1-100). */
  limit?: number;
  /** Opaque cursor from a previous response's `pagination.next_cursor`. */
  cursor?: string;
}

export interface ListInboxMessagesParams {
  /** Max items to return. */
  limit?: number;
  /** Opaque cursor from a previous response's `pagination.next_cursor`. */
  cursor?: string;
}

export interface ReplyInboxParams {
  /** Reply text. Optional when `attachment_url` is set — an attachment-only
   * reply is allowed. */
  text?: string;
  /** Public URL of a single media asset to attach (Facebook and Instagram
   * DMs only; other platforms are text-only). */
  attachment_url?: string;
  /** Attachment kind; pair with `attachment_url`. */
  attachment_type?: "image" | "video" | "audio" | "file";
  /**
   * For comment and mention threads: the inbox id of the specific incoming
   * comment being answered (`message.id` from `inbox.next()`, or a message
   * `id` from `inbox.getMessages()`). Every comment on a post shares one
   * conversation, so without it the reply is posted under the newest
   * comment on the post, which may be a different person than the one you
   * drafted for. Always pass it when replying to an item served by the
   * queue. Ignored for DMs (a DM reply goes to the conversation). 404
   * `not_found` when it is not an incoming message of this conversation.
   */
  message_id?: string;
  /**
   * When `true`, the response also carries `next` (the next conversation
   * that needs an answer, the same object as `inbox.next()`'s `data`, using
   * its default queue order and filters) and `remaining`. Saves the extra
   * call when working through the inbox.
   */
  include_next?: boolean;
}

/** List envelope for inbox conversations (cursor-paginated). */
export interface InboxConversationsResponse {
  data: InboxConversation[];
  pagination: InboxCursorPagination;
  [key: string]: unknown;
}

/** List envelope for inbox messages (cursor-paginated). */
export interface InboxMessagesResponse {
  data: InboxMessage[];
  pagination: InboxCursorPagination;
  [key: string]: unknown;
}

export interface InboxMarkReadResponse {
  conversation_id: string;
  /** Number of messages that were newly marked read. */
  marked_read: number;
  [key: string]: unknown;
}

/** Single-item envelope for the message created by a reply. */
export interface InboxReplyResponse {
  data: InboxMessage;
  message?: string;
  /**
   * Only when `include_next` was set: the next conversation that needs an
   * answer (the same object as `inbox.next()`'s `data`), or `null` when
   * nothing is waiting.
   */
  next?: InboxNextUnanswered | null;
  /**
   * Only when `include_next` was set: unanswered items still waiting after
   * `next` (capped at 500).
   */
  remaining?: number;
  [key: string]: unknown;
}

export interface HideInboxParams {
  /** `true` hides the reply, `false` unhides it. Defaults to `true`. */
  hide?: boolean;
}

/** Single-item envelope for the message returned by `inbox.hide`. */
export interface InboxHideResponse {
  data: InboxMessage;
  message?: string;
  [key: string]: unknown;
}

/** The `data` of `inbox.deleteMessage()`. */
export interface InboxDeletedMessage {
  /** The deleted message id. */
  id: string;
  conversation_id: string;
  /** Inbox ids of replies removed together with the comment. */
  removed_reply_ids: string[];
}

/** Response envelope for `inbox.deleteMessage()`. */
export interface InboxDeleteMessageResponse {
  data: InboxDeletedMessage;
  [key: string]: unknown;
}

/** Query params for `inbox.next()`. All optional. */
export interface InboxNextParams {
  /** Only items from one platform. */
  platform?: InboxPlatform;
  /** Only items of one type. */
  type?: "dm" | "comment" | "mention";
  /**
   * `"oldest"` (default) serves the item that has waited longest first;
   * `"newest"` the most recent.
   */
  order?: "oldest" | "newest";
  /**
   * Also serve items that were marked read but never answered. Defaults to
   * `false`: only unread items are served, so marking a conversation read is
   * the durable way to skip it.
   */
  include_read?: boolean;
  /**
   * Conversation ids to leave out of this call (a session-local skip; up to
   * 100). Sent comma-separated.
   */
  exclude?: string[];
}

/**
 * Whether a reply can still be sent through the API. Only Instagram and
 * Facebook DMs have a window (Meta: 24 hours after the customer's last
 * message); every other item has `open: true` and `closes_at: null`.
 */
export interface InboxReplyWindow {
  /**
   * `false` when the item is an Instagram/Facebook DM whose 24-hour window
   * has closed. It is still served (the customer is still waiting), but
   * `inbox.reply` answers 422 `outside_messaging_window`: answer it from
   * the Instagram or Facebook app (that reply is mirrored into the inbox
   * and clears the item) or mark the conversation read to skip it.
   */
  open: boolean;
  /**
   * When the window closes or closed (the customer's last message + 24 h);
   * `null` when there is no window.
   */
  closes_at: string | null;
}

/**
 * The next conversation that needs an answer, with everything needed to
 * draft the reply.
 */
export interface InboxNextUnanswered {
  conversation: InboxConversation;
  /**
   * The unanswered incoming message itself: the customer's latest DM, or the
   * specific comment. Its `id` is what `inbox.hide` and `inbox.deleteMessage`
   * take, and the `message_id` to pass to `inbox.reply` on comment threads
   * (so the reply lands under this comment, not under the newest one on the
   * post); its `conversation_id` is what `inbox.reply` takes.
   */
  message: InboxMessage;
  /**
   * The conversation so far, oldest first (the most recent 50 messages for
   * long DM threads).
   */
  messages: InboxMessage[];
  /** Whether `inbox.reply` can still answer this item; see `InboxReplyWindow`. */
  reply_window: InboxReplyWindow;
}

/** Response envelope for `inbox.next()`. */
export interface InboxNextResponse {
  /** The next item, or `null` when nothing is waiting. */
  data: InboxNextUnanswered | null;
  /**
   * Unanswered items still waiting after this one (capped at 500). `0` when
   * `data` is `null`.
   */
  remaining: number;
  [key: string]: unknown;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  [key: string]: unknown;
}
