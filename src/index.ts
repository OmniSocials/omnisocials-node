export { OmniSocials, VERSION } from "./client.js";
export type { OmniSocialsOptions, QueryValue, RequestOptions } from "./client.js";

export {
  OmniSocialsError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  APIConnectionError,
  WebhookVerificationError,
} from "./errors.js";
export type { APIErrorOptions } from "./errors.js";

export { verifyWebhookSignature } from "./webhooks.js";
export type { VerifyWebhookSignatureParams } from "./webhooks.js";

export { PostsResource } from "./resources/posts.js";
export { MediaResource } from "./resources/media.js";
export { FoldersResource } from "./resources/folders.js";
export { HashtagSetsResource } from "./resources/hashtag-sets.js";
export { AccountsResource } from "./resources/accounts.js";
export { AnalyticsResource } from "./resources/analytics.js";
export { LocationsResource } from "./resources/locations.js";
export { AudioResource } from "./resources/audio.js";
export { WebhooksResource } from "./resources/webhooks.js";
export { InboxResource } from "./resources/inbox.js";

export type {
  // Envelope
  Pagination,
  ItemResponse,
  ListResponse,
  // Posts
  Post,
  PostWarning,
  CreatePostResponse,
  CreatePostParams,
  UpdatePostParams,
  ListPostsParams,
  RecentPlatformPostsParams,
  UserTag,
  MediaUrlInput,
  MediaIdInput,
  // Platform options
  XThreadPartInput,
  XPostOptions,
  XPostOptionsUpdate,
  BlueskyThreadPartInput,
  BlueskyPostOptions,
  BlueskyPostOptionsUpdate,
  MastodonThreadPartInput,
  MastodonPostOptions,
  MastodonPostOptionsUpdate,
  LinkedInPollInput,
  LinkedInPollFields,
  // Media
  MediaItem,
  PdfUploadResult,
  MediaCompatibility,
  MediaUploadResponse,
  ListMediaParams,
  UploadMediaParams,
  UploadMediaFromUrlParams,
  UploadMediaFromBase64Params,
  CreateUploadUrlResponse,
  CheckMediaParams,
  UpdateMediaParams,
  // Folders
  Folder,
  CreateFolderParams,
  UpdateFolderParams,
  // Hashtag sets
  HashtagSet,
  CreateHashtagSetParams,
  UpdateHashtagSetParams,
  // Accounts
  Account,
  // Analytics
  PostAnalytics,
  PostAnalyticsPlatformEntry,
  AnalyticsOverview,
  AnalyticsOverviewParams,
  AccountAnalyticsParams,
  BestTimesParams,
  // Locations
  LocationSearchItem,
  LocationSearchResponse,
  LocationValidateResponse,
  // Audio
  AudioTrack,
  AudioSearchResponse,
  // Webhooks
  Webhook,
  WebhookEventType,
  CreateWebhookParams,
  UpdateWebhookParams,
  RotateWebhookSecretResponse,
  WebhookEvent,
  WebhookEventTarget,
  // Inbox
  InboxCursorPagination,
  InboxParticipant,
  InboxPostRef,
  InboxConversation,
  InboxMessage,
  ListInboxConversationsParams,
  ListInboxMessagesParams,
  ReplyInboxParams,
  InboxConversationsResponse,
  InboxMessagesResponse,
  InboxMarkReadResponse,
  InboxReplyResponse,
  // Health
  HealthResponse,
} from "./types.js";
