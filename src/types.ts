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
 * media metadata), and Pinterest (pin alt_text fallback). Plain strings and
 * objects can be mixed in the same array.
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
  /** Tweet text, up to 280 chars (the API enforces 280 even for X Premium). */
  text: string;
  /** Optional per-part media as Library ids from media upload (max 4 combined with media_urls). Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[];
  /** Optional per-part media as external URLs (max 4 combined with media_ids). Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[];
}

export interface XPostOptions {
  reply_settings?: "" | "following" | "mentionedUsers";
  paid_partnership?: boolean;
  made_with_ai?: boolean;
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
  /** Provide 2-25 parts to publish as a thread. Omit for a single status. */
  thread_parts?: MastodonThreadPartInput[];
}

/**
 * Update-side variant: `thread_parts: null` clears the thread (revert to a
 * single status); `undefined` leaves the existing thread untouched.
 */
export interface MastodonPostOptionsUpdate {
  thread_parts?: MastodonThreadPartInput[] | null;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export interface UserTag {
  username: string;
  x: number;
  y: number;
  image_index?: number;
}

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
  pinterest?: Record<string, unknown>;
  youtube?: Record<string, unknown>;
  instagram?: Record<string, unknown>;
  facebook?: Record<string, unknown>;
  linkedin?: Record<string, unknown>;
  linkedin_page?: Record<string, unknown>;
  tiktok?: Record<string, unknown>;
  x?: XPostOptions;
  bluesky?: BlueskyPostOptions;
  mastodon?: MastodonPostOptions;
  google_business?: Record<string, unknown>;
}

export interface UpdatePostParams {
  content?: string | Record<string, string>;
  scheduled_at?: string;
  channels?: string[];
  /** Entries accept `{ id, alt }` objects for per-media alt text. */
  media_ids?: MediaIdInput[] | Record<string, MediaIdInput[]>;
  /** Entries accept `{ url, alt }` objects for per-media alt text. */
  media_urls?: MediaUrlInput[] | Record<string, MediaUrlInput[]>;
  type?: string;
  location_id?: string;
  collaborators?: string[];
  user_tags?: UserTag[];
  pinterest?: Record<string, unknown>;
  youtube?: Record<string, unknown>;
  instagram?: Record<string, unknown>;
  facebook?: Record<string, unknown>;
  linkedin?: Record<string, unknown>;
  linkedin_page?: Record<string, unknown>;
  tiktok?: Record<string, unknown>;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  x?: XPostOptionsUpdate;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  bluesky?: BlueskyPostOptionsUpdate;
  /** `thread_parts: null` clears thread mode; omit to leave it untouched. */
  mastodon?: MastodonPostOptionsUpdate;
  google_business?: Record<string, unknown>;
}

export interface ListPostsParams {
  /** Filter by status, e.g. "draft", "scheduled", "published", "failed". */
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

export interface Post {
  id: string;
  /** Caption; either a plain string or a per-platform map with a `default` key. */
  content: string | Record<string, string>;
  status: string;
  type?: string;
  /** Platform identifiers this post targets (e.g. ["instagram", "x"]). */
  accounts: string[];
  /** Attached media: a flat array shared across platforms, or a per-platform map (`default` key + platform overrides). Items include an optional `alt` accessibility description when one was set. */
  media: unknown[] | Record<string, unknown[]>;
  /** ISO datetime the post is/was scheduled for, or null. */
  schedule_at: string | null;
  approval_status?: string | null;
  /** Deep link to this post inside the OmniSocials app (composer or details view). */
  app_url: string;
  /** Live post URL per platform, present once published. */
  published_urls: Record<string, string>;
  /** Instagram location tag (Facebook Place/Page ID), echoed when set. */
  location_id?: string;
  /** Instagram collaborators, echoed when set. */
  collaborators?: string[];
  /** Instagram photo user tags, echoed when set. */
  user_tags?: Array<{ username: string; x: number; y: number; image_index?: number }>;
  source?: string | null;
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
    thread_parts?: Array<{ id?: string; text: string; media_urls?: MediaUrlInput[] }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  type: string;
  name?: string | null;
  filename: string;
  folder_id?: string | null;
  /** Human-formatted size string (e.g. "2.50 MB"), not a byte count. */
  size: string;
  status?: string;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Extra top-level fields returned by media uploads when the file is a PDF.
 * A PDF is rasterized into one image slide per page (max 20): `data` mirrors
 * the first slide (back-compat) while `slides` + `media_ids` carry the whole
 * carousel in page order. Pass ALL of `media_ids` to posts.create. On LinkedIn
 * the slides post as a native swipeable document; elsewhere as an image
 * carousel.
 */
export interface PdfUploadResult {
  slides: MediaItem[];
  media_ids: string[];
  pdf: {
    total_pages: number;
    rendered_pages: number;
    truncated: boolean;
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

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * One entry per platform the post was published to. For thread platforms
 * (X, Bluesky, Mastodon) `metrics` is summed across all parts and
 * `platform_post_id` is the thread root; `thread_parts` is 1 for single posts.
 */
export interface PostAnalyticsPlatformEntry {
  platform: string;
  platform_post_id: string;
  metrics: Record<string, number | string>;
  thread_parts: number;
  collected_at: string;
  [key: string]: unknown;
}

export interface PostAnalytics {
  post_id: string;
  platforms: Record<string, PostAnalyticsPlatformEntry>;
  [key: string]: unknown;
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

// ─── Webhooks (management) ───────────────────────────────────────────────────

export type WebhookEventType = "post.scheduled" | "post.published" | "post.failed";

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
  /** Events to subscribe to: post.scheduled, post.published, post.failed. */
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
    targets: WebhookEventTarget[];
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

/** The post a comment/mention conversation is attached to (null for DMs). */
export interface InboxPostRef {
  id: string | null;
  caption: string | null;
  thumbnail: string | null;
}

export interface InboxConversation {
  conversation_id: string;
  /** Platform identifier, e.g. "instagram", "facebook", "linkedin". */
  platform: string;
  /** Conversation kind: "dm", "comment", or "mention". */
  type: string;
  participant: InboxParticipant;
  unread_count: number;
  last_message: {
    id: string;
    /** "inbound" (from the participant) or "outbound" (from you). */
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
  /** Platform identifier, e.g. "instagram", "facebook", "linkedin". */
  platform: string;
  /** Message kind: "dm", "comment", or "mention". */
  type: string;
  /** "inbound" (from the sender) or "outbound" (from you). */
  direction: string;
  text: string;
  timestamp: string;
  is_read: boolean;
  is_replied: boolean;
  /** Emoji reaction on the message, if any. */
  reaction: string | null;
  /** Parent comment id when this is a threaded comment reply. */
  parent_comment_id: string | null;
  sender: InboxParticipant;
  /** The related post for comment/mention messages; null for DMs. */
  post: InboxPostRef | null;
}

export interface ListInboxConversationsParams {
  /** Filter by platform. */
  platform?: "instagram" | "facebook" | "linkedin";
  /** Filter by conversation kind. */
  type?: "dm" | "comment" | "mention";
  /** Only return conversations with unread messages. */
  unread?: boolean;
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
  /** Reply text (required). */
  text: string;
  /** Public URL of a single media asset to attach. */
  attachment_url?: string;
  /** Attachment kind; pair with `attachment_url`. */
  attachment_type?: "image" | "video" | "audio" | "file";
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
  [key: string]: unknown;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  [key: string]: unknown;
}
