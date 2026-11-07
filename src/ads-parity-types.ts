/**
 * Ads API parity (2026-11-05): the structure of an ad account (also the
 * campaigns made outside OmniSocials), the ads of a campaign, targeting
 * search, custom audiences, lead forms and leads, conversions, insights and
 * background reports, automated rules, your own results, the network's media
 * library, previews, partnership ads, comments on ads, ad account admin,
 * Meta reach and frequency, studies, budget schedules and Google reports.
 *
 * The SDK is a thin passthrough: the API checks every field. A network that
 * has no such feature answers `400 not_supported_on_network`
 * (`ads.capabilities()` lists the features per network). A missing
 * permission on the network side answers `403 network_permission_missing`.
 * Money moments (switching something on, a budget or spend cap change, a
 * rule that can raise spend, a reach and frequency reservation, a study, a
 * planned budget increase) and other changes of a campaign on the network
 * need a key with the opt-in `ads:spend` scope ("Start ads"): without it,
 * and on Google always, they answer `403 start_in_app` with the page where
 * a person does it in the app (rules: `403 rule_raises_spend`). Pausing,
 * deleting and archiving stay open, except on Google. With `ads:spend` a
 * money moment answers `400 budget_confirmation_required` until the person's
 * own amount comes back as `confirm_budget_amount` (rules:
 * `confirm_max_daily_budget`).
 */

import type { AdBudget, AdId, AdPlatform } from "./types.js";

// ─── Shared shapes ────────────────────────────────────────────────────────────

/** Meta campaign/ad set/ad, TikTok campaign/ad group/ad, LinkedIn campaign group/campaign/creative and so on. */
export type AdObjectLevel = "campaign" | "ad_set" | "ad";

/** The status of a campaign, ad set or ad as the network has it. */
export type AdObjectStatus =
  | "active"
  | "paused"
  | "pending_review"
  | "rejected"
  | "error"
  | "completed"
  | "archived"
  | "deleted"
  | "draft";

/** The status you can set. `active` starts spend and needs `confirm_budget_amount`. */
export type AdSwitchStatus = "active" | "paused";

/** Goals through the API and MCP only (the builder has no screens for them yet). */
export type AdApiGoal = "lead_generation" | "conversions" | "messages" | "calls";

/** Bid strategies of `settings.optimization.bidding.strategy`. */
export type AdBidStrategy = "lowest_cost" | "cost_cap" | "bid_cap" | "min_roas" | "target_cost";

export type AdMetricKey =
  | "spend"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "reach"
  | "frequency"
  | "conversions"
  | "conversion_value"
  | "video_views"
  | "leads"
  | "engagements";

/** Numbers in major currency units; `null` = the network does not report it. `ctr` is a percent. */
export interface AdMetrics {
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  reach?: number | null;
  frequency?: number | null;
  conversions?: number | null;
  conversion_value?: number | null;
  video_views?: number | null;
  leads?: number | null;
  engagements?: number | null;
  [key: string]: unknown;
}

/** A date range: ISO dates (`YYYY-MM-DD`). */
export interface AdDateRangeParams {
  from?: string;
  to?: string;
}

/** A generic `data` payload for answers the API documents loosely. */
export type AdsData = Record<string, unknown>;

// ─── Targeting, settings and per-ad fields (drafts and campaigns) ─────────────

/** One targeting entry: an id from `ads.targeting.search()` of the same network. */
export interface AdTargetingItem {
  id: string;
  name?: string;
  /** Only on `include.location`: 1 to 80 km around the place. */
  radius_km?: number;
  [key: string]: unknown;
}

/**
 * The targeting of one network: `targeting.networks.<network>` on a draft,
 * `targeting.network` on a campaign. The keys of `include` and `exclude`
 * are the network's `targeting_types` (`ads.capabilities()`).
 * `include.location` replaces `targeting.countries` on that network.
 */
export interface AdNetworkTargeting {
  include?: Record<string, AdTargetingItem[]>;
  exclude?: Record<string, AdTargetingItem[]>;
  /** The network's own custom audience ids of the same ad account (`ads.audiences.list()`). */
  audiences?: {
    include?: { id: string; name?: string }[];
    exclude?: { id: string; name?: string }[];
  };
}

/**
 * The settings of one network: `platforms[].settings` on a draft,
 * `settings` on `ads.update()` (while the campaign is a draft). Each network's `settings` entry in `ads.capabilities()` says which
 * keys it reads.
 */
export interface AdNetworkSettings {
  optimization?: {
    /** Goal `conversions`: the pixel or tag and the event to optimise for. */
    conversion?: { destination_id: string; event?: string; custom_conversion_id?: string };
    bidding?: { strategy: AdBidStrategy; amount?: number; roas_floor?: number };
    attribution?: { click_days?: 1 | 7 | 28; view_days?: 0 | 1 };
  };
  /** Meta, goal `messages`. */
  messaging?: {
    destination: "messenger" | "instagram_direct" | "whatsapp";
    whatsapp_phone_number?: string;
    welcome_message?: { text: string; quick_replies?: string[] };
    /** A DM automation that answers the first message from the ad. */
    automation_id?: number;
  };
  /** Meta, goal `calls`: an E.164 number. */
  calls?: { phone_number: string };
  /** Goal `lead_generation`: the network's lead form id (`external_id` from `ads.leadForms.list()`). */
  lead_form_id?: string;
  google?: {
    kind?: "demand_gen" | "search" | "performance_max";
    search?: Record<string, unknown>;
    performance_max?: Record<string, unknown>;
  };
  meta?: { budget_level?: "ad_set" | "campaign" };
  [key: string]: unknown;
}

/** Per ad, per network extras (`ads[].network.<network>`). */
export interface AdNetworkAdFields {
  meta?: {
    lead_form_id?: string;
    /** Up to 4 more texts next to the ad's own (website goals only). */
    primary_texts?: string[];
    /** Up to 4 more headlines next to the ad's own (website goals only). */
    headlines?: string[];
    creative_features?: Record<string, "OPT_IN" | "OPT_OUT">;
    /** From the ad account's library (`ads.media`): no upload. */
    media_ref?: { image_hash?: string; video_id?: string };
    /** A partnership ad: the partner's Instagram account id. */
    partnership?: { sponsor_id: string };
    [key: string]: unknown;
  };
  tiktok?: {
    spark_auth_code?: string;
    lead_form_id?: string;
    media_ref?: { image_id?: string; video_id?: string };
    [key: string]: unknown;
  };
  linkedin?: { lead_form_id?: string; [key: string]: unknown };
  pinterest?: { lead_form_id?: string; [key: string]: unknown };
  x?: { media_ref?: { media_key: string }; [key: string]: unknown };
  google?: {
    business_name?: string;
    logo?: { url: string; width?: number; height?: number };
    /** Search campaigns: 3 to 15 headlines, 2 to 4 descriptions. */
    responsive_search_ad?: {
      headlines?: string[];
      descriptions?: string[];
      path1?: string;
      path2?: string;
      final_url?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ─── Structure of an ad account ───────────────────────────────────────────────

/** One campaign, ad set or ad as the network has it. */
export interface AdTreeNode {
  level: AdObjectLevel;
  /** The network's own id. */
  external_id: string;
  name: string;
  status: AdObjectStatus | (string & {});
  budget: AdBudget | null;
  objective: string | null;
  start_at: string | null;
  end_at: string | null;
  metrics: AdMetrics | null;
  /** Ads only. */
  review?: { status: string; reasons: string[] };
  /** Ads only. */
  creative?: { title?: string; body?: string; thumbnail_url?: string; link?: string; [key: string]: unknown };
  /** `external` = made outside OmniSocials (campaigns). */
  source?: "omnisocials" | "external";
  /** The OmniSocials campaign id when `source` is `omnisocials`. */
  campaign_id?: AdId | null;
  children?: AdTreeNode[];
  [key: string]: unknown;
}

/** `ads.objects.tree()`. */
export interface AdTree {
  ad_account_id: AdId;
  platform: AdPlatform;
  currency: string | null;
  from: string;
  to: string;
  campaigns: AdTreeNode[];
  next_cursor: string | null;
  [key: string]: unknown;
}

export interface AdTreeParams extends AdDateRangeParams {
  /** Status filter, for example `["active", "paused"]` (sent as a comma list). */
  status?: string | string[];
  /** At most 100, default 25. */
  limit?: number;
  cursor?: string;
}

/** `ads.objects.update()`: a higher budget needs `confirm_budget_amount` = the new amount. */
export interface UpdateAdObjectParams {
  name?: string;
  budget?: AdBudget;
  /** `null` removes the end date. */
  end_at?: string | null;
  confirm_budget_amount?: number;
  [key: string]: unknown;
}

/** Pause, or switch on (needs `confirm_budget_amount` = the budget that pays). */
export interface SetAdStatusParams {
  status: AdSwitchStatus;
  confirm_budget_amount?: number;
}

export interface AdObjectStatusResult {
  level: AdObjectLevel;
  external_id: string;
  status: string;
  budget?: AdBudget;
  [key: string]: unknown;
}

export interface DuplicateAdObjectParams {
  /** Copy the children too (default `true`). */
  deep?: boolean;
  rename?: string;
}

/** `ads.objects.importStatus()` and `startImport()`. */
export interface AdImportState {
  ad_account_id: AdId;
  platform: AdPlatform;
  /** `not_started`, `pending`, `queued`, `done` or `failed`. */
  status: string;
  campaigns_imported?: number;
  first_import_at?: string | null;
  last_run_at?: string | null;
  [key: string]: unknown;
}

export interface ListExternalAdCampaignsParams {
  ad_account_id?: number | string;
  platform?: AdPlatform;
  status?: string;
  /** At most 200. */
  limit?: number;
  offset?: number;
}

/** A campaign made outside OmniSocials, stored by the import. */
export interface AdExternalCampaign {
  id: AdId;
  platform: AdPlatform;
  external_campaign_id: string;
  name: string | null;
  status: string | null;
  /** Only on `getExternal()`: the numbers per day. */
  daily?: AdsData[];
  [key: string]: unknown;
}

// ─── Campaign level ───────────────────────────────────────────────────────────

/** `ads.bulkStatus()`: resume needs `confirm_budget_amount` = every campaign's budget. */
export interface BulkAdCampaignStatusParams {
  /** At most 50. */
  campaign_ids: (number | string)[];
  status: AdSwitchStatus;
  confirm_budget_amount?: number;
}

export interface AdBulkStatusResult {
  campaign_id: AdId;
  ok: boolean;
  status?: string;
  code?: string;
  error?: string;
}

export interface DuplicateAdCampaignParams {
  name?: string;
}

/** One ad of an OmniSocials campaign. */
export interface AdCampaignAd {
  id: AdId;
  campaign_id?: AdId;
  kind: string;
  name: string | null;
  position: number | null;
  post_id: AdId | null;
  external_ad_id: string | null;
  status: string;
  review: { status: "in_review" | "approved" | "rejected" | null; reasons: string[] };
  errors: string | null;
  metrics: AdMetrics | null;
  creative: {
    headline: string | null;
    primary_text: string | null;
    link: string | null;
    media: unknown[];
    variant: string | null;
  } | null;
  created_at: string | null;
  [key: string]: unknown;
}

export interface AdCampaignAdsList {
  campaign_id: AdId;
  platform?: AdPlatform;
  ads: AdCampaignAd[];
  [key: string]: unknown;
}

/** An ad for `ads.campaignAds.add()`: the same shape as the ads of a draft. */
export interface NewCampaignAd {
  primary_text?: string;
  headline?: string;
  description?: string;
  media?: { url: string; type: "image" | "video"; [key: string]: unknown }[];
  cta?: string;
  link?: string;
  network?: AdNetworkAdFields;
  [key: string]: unknown;
}

export interface AdReview {
  status: "in_review" | "approved" | "rejected" | (string & {});
  reasons: string[];
  [key: string]: unknown;
}

// ─── Targeting search ─────────────────────────────────────────────────────────

export interface AdTargetingSearchParams {
  ad_account_id: number | string;
  /** One of the network's `targeting_types` (`ads.capabilities()`). */
  type: string;
  q: string;
  /** At most 100. */
  limit?: number;
  country?: string;
}

export interface AdTargetingBrowseParams {
  ad_account_id: number | string;
  type: string;
}

export interface AdTargetingOption {
  id: string;
  name: string;
  type?: string;
  path?: string[] | string;
  audience_size_lower?: number | null;
  audience_size_upper?: number | null;
  children?: AdTargetingOption[];
  [key: string]: unknown;
}

export interface AdTargetingResults {
  platform: AdPlatform;
  type: string;
  items: AdTargetingOption[];
  [key: string]: unknown;
}

/** The targeting a reach estimate or a bid suggestion reads. */
export interface AdTargetingSpec {
  countries?: string[];
  age_min?: number;
  age_max?: number;
  genders?: ("male" | "female")[];
  network?: AdNetworkTargeting;
  [key: string]: unknown;
}

export interface AdReachEstimateParams {
  ad_account_id: number | string;
  objective?: string;
  targeting: AdTargetingSpec;
}

export interface AdReachEstimate {
  platform: AdPlatform;
  objective: string;
  lower?: number | null;
  upper?: number | null;
  daily?: unknown;
  [key: string]: unknown;
}

export interface AdBidSuggestionParams extends AdReachEstimateParams {
  budget?: AdBudget;
}

export interface AdBidSuggestion {
  platform: AdPlatform;
  objective: string;
  bid?: { min?: number; suggested?: number; max?: number; [key: string]: unknown };
  daily_budget?: { min?: number; suggested?: number; [key: string]: unknown };
  [key: string]: unknown;
}

// ─── Custom audiences ─────────────────────────────────────────────────────────

export interface ListAdAudiencesParams {
  ad_account_id: number | string;
  cursor?: string;
}

export interface CreateAdAudienceParams {
  ad_account_id: number | string;
  name: string;
  description?: string;
  kind?: "customer_list" | "lookalike" | "company_list";
  /** A lookalike: a source audience, a country and a ratio (0.01 to 0.2). */
  lookalike?: { source_audience_id: string; country: string; ratio: number };
  /** Meta customer lists: where the people come from (the person says it). Without it Meta reads `user_provided`. */
  customer_file_source?: "user_provided" | "partner_provided" | "both";
  /**
   * Optional first members of a customer list (the same shape as
   * `ads.audiences.addMembers()`). Pinterest needs them: it makes a list
   * only together with its first people.
   */
  schema?: string[];
  rows?: string[][];
}

export interface UpdateAdAudienceParams {
  ad_account_id: number | string;
  name?: string;
  description?: string;
}

/**
 * People for a customer list. Send the raw values: OmniSocials normalizes
 * them and hashes them with SHA-256 before they leave (SHA-256 hex passes as
 * it is) and stores nothing. At most 10,000 rows per call. `schema` keys:
 * email, phone (with the country code), first_name, last_name, city, state,
 * zip, country, external_id, dob_year, gender, maid.
 */
export interface AdAudienceMembersParams {
  ad_account_id: number | string;
  schema: string[];
  rows: string[][];
}

export interface AdAudienceCompaniesParams {
  ad_account_id: number | string;
  companies: { name?: string; domain?: string; linkedin_url?: string }[];
}

export interface AdAudience {
  id?: string;
  external_id?: string;
  name: string;
  description?: string | null;
  kind?: string;
  size_lower?: number | null;
  size_upper?: number | null;
  [key: string]: unknown;
}

// ─── Lead forms and leads ─────────────────────────────────────────────────────

export interface AdLeadFormQuestion {
  type:
    | "email"
    | "full_name"
    | "first_name"
    | "last_name"
    | "phone"
    | "company"
    | "job_title"
    | "city"
    | "country"
    | "zip"
    | "custom";
  label?: string;
  options?: string[];
}

export interface CreateAdLeadFormParams {
  ad_account_id: number | string;
  name: string;
  privacy_policy_url: string;
  locale?: string;
  headline?: string;
  description?: string;
  questions: AdLeadFormQuestion[];
  thank_you: { title?: string; body?: string; button_text?: string; url?: string };
  /**
   * The person accepts the network's lead ad terms (Pinterest refuses a form
   * without it). Only send `true` after the person said yes.
   */
  accept_terms?: boolean;
  [key: string]: unknown;
}

export interface UpdateAdLeadFormParams {
  status?: "active" | "archived";
  sync_enabled?: boolean;
}

/** A lead form. `id` is the OmniSocials form id; `external_id` goes in `settings.lead_form_id`. */
export interface AdLeadForm {
  id: AdId;
  external_id: string;
  ad_account_id?: AdId;
  platform?: AdPlatform;
  name: string;
  status: string;
  sync_enabled?: boolean;
  [key: string]: unknown;
}

export type AdLeadStatus = "new" | "contacted" | "qualified" | "won" | "lost" | "spam";

export interface ListAdLeadsParams {
  form_id?: number | string;
  status?: AdLeadStatus;
  since?: string;
  until?: string;
  /** At most 200. */
  limit?: number;
  cursor?: string;
}

export interface UpdateAdLeadParams {
  status?: AdLeadStatus;
  note?: string;
}

/** A lead. `fields` holds the answers (personal data, stored encrypted). */
export interface AdLead {
  id: AdId;
  form_id: AdId;
  status: AdLeadStatus | (string & {});
  fields: Record<string, unknown>;
  is_test?: boolean;
  note?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

// ─── Conversions ──────────────────────────────────────────────────────────────

export interface CreateAdCustomConversionParams {
  ad_account_id: number | string;
  name: string;
  /** A pixel or dataset from `ads.conversions.destinations()`. */
  destination_id: string;
  event?: string;
  url_contains?: string;
}

/**
 * One conversion event. Send the raw email and phone: OmniSocials
 * normalizes and SHA-256 hashes them before they leave and stores nothing.
 */
export interface AdConversionEvent {
  event_name: string;
  /** An ISO date-time or unix seconds. */
  event_time?: string | number;
  event_id?: string;
  action_source?:
    | "website"
    | "app"
    | "offline"
    | "phone_call"
    | "chat"
    | "email"
    | "physical_store"
    | "system_generated"
    | "other";
  event_source_url?: string;
  value?: number;
  currency?: string;
  content_ids?: string[];
  order_id?: string;
  user?: {
    email?: string | string[];
    phone?: string | string[];
    external_id?: string;
    client_ip?: string;
    client_user_agent?: string;
    click_ids?: {
      fbc?: string;
      fbp?: string;
      ttclid?: string;
      epik?: string;
      twclid?: string;
      gclid?: string;
      li_fat_id?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SendAdConversionEventsParams {
  ad_account_id: number | string;
  destination_id: string;
  /** At most 1,000 per call. */
  events: AdConversionEvent[];
}

export interface AdConversionEventsResult {
  received: number;
  accepted: number;
  errors: unknown[];
  [key: string]: unknown;
}

// ─── Insights and reports ─────────────────────────────────────────────────────

export type AdBreakdown = "country" | "age" | "gender" | "placement" | "device" | "platform";

/** `ads.insights.query()` and `ads.reports.start()`. */
export interface AdInsightsQueryParams extends AdDateRangeParams {
  ad_account_id: number | string;
  level?: "account" | "campaign" | "ad_set" | "ad";
  /** The network's ids of that level. */
  ids?: string[];
  metrics?: AdMetricKey[];
  /** At most 2. */
  breakdowns?: AdBreakdown[];
  time_increment?: "day" | "all";
}

export interface AdInsightsRow {
  level: string;
  external_id: string | null;
  date: string | null;
  breakdown: Record<string, string> | null;
  metrics: AdMetrics;
  [key: string]: unknown;
}

export interface AdCampaignAnalyticsParams extends AdDateRangeParams {
  breakdown?: "ad" | AdBreakdown;
  time_increment?: "day" | "all";
  /** Sent as a comma list. */
  metrics?: string | AdMetricKey[];
}

export interface AdAdAnalyticsParams extends AdDateRangeParams {
  breakdown?: string;
}

export interface AdTimelineParams extends AdDateRangeParams {
  platform?: AdPlatform;
  source?: "all" | "omnisocials" | "external";
}

export interface AdPerformanceParams extends AdDateRangeParams {
  level?: "campaign" | "ad";
  metric?: "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "cpm" | "reach" | "conversions" | "leads";
  order?: "desc" | "asc";
  limit?: number;
  min_impressions?: number;
  platform?: AdPlatform;
}

export interface AdAlert {
  kind: string;
  severity: string;
  message: string;
  campaign_id?: AdId | null;
  ad_id?: AdId | null;
  ad_account_id?: AdId | null;
  [key: string]: unknown;
}

/** A background report: `status` is `running`, `done` (with `rows`) or `failed`. */
export interface AdReport {
  id: string;
  status: "running" | "done" | "failed" | (string & {});
  rows?: AdInsightsRow[];
  [key: string]: unknown;
}

// ─── Automated rules ──────────────────────────────────────────────────────────

export interface AdRuleCondition {
  /** spend, impressions, clicks, ctr, cpc, cpm, conversions, leads, reach, cost_per_conversion, cost_per_lead, results.<key>, formula.<key> */
  metric: string;
  op: "gt" | "gte" | "lt" | "lte";
  value: number;
  /** 1 to 30. */
  window_days?: number;
}

export interface AdRuleAction {
  type: "notify" | "pause" | "activate" | "adjust_budget";
  /** adjust_budget: the change in percent (negative lowers). */
  percent?: number;
  /** Needed for a rule that can raise spend (activate, a positive adjust_budget). */
  max_daily_budget?: number;
  min_daily_budget?: number;
  currency?: string;
}

/**
 * A rule checks campaigns on a schedule and acts on each one that meets
 * every condition. A rule that can raise spend needs
 * `action.max_daily_budget`, confirmed by the person as
 * `confirm_max_daily_budget`. A new rule is off until `enabled: true`.
 */
export interface CreateAdRuleParams {
  name: string;
  ad_account_id?: number | string;
  enabled?: boolean;
  scope?: {
    source?: "omnisocials" | "external" | "all";
    platforms?: AdPlatform[];
    campaign_ids?: (number | string)[];
    external_campaign_ids?: string[];
    statuses?: string[];
  };
  conditions: AdRuleCondition[];
  action: AdRuleAction;
  /** At least 15. */
  every_minutes?: number;
  cooldown_minutes?: number;
  max_actions_per_run?: number;
  confirm_max_daily_budget?: number;
  [key: string]: unknown;
}

export type UpdateAdRuleParams = Partial<CreateAdRuleParams>;

export interface AdRule {
  id: AdId;
  name: string;
  enabled: boolean;
  conditions: AdRuleCondition[];
  action: AdRuleAction;
  [key: string]: unknown;
}

export interface ListAdRuleActivityParams {
  rule_id?: number | string;
  limit?: number;
}

/** Undo of a pause or a budget cut restarts or raises spend: pass the amount. */
export interface UndoAdRuleActivityParams {
  confirm_budget_amount?: number;
}

// ─── Your own results ─────────────────────────────────────────────────────────

/** One day of your own numbers. Name the campaign by one of the id fields. */
export interface AdResultRow {
  /** `YYYY-MM-DD`. */
  day: string;
  metric: string;
  value: number;
  campaign_id?: number | string;
  external_campaign_id?: string;
  platform?: AdPlatform;
  utm_campaign?: string;
  campaign_name?: string;
}

export interface ListAdResultsParams extends AdDateRangeParams {
  campaign_id?: number | string;
  metric?: string;
}

export interface AdResultTotalsParams extends AdDateRangeParams {
  campaign_id?: number | string;
}

export interface PutAdResultMetricParams {
  label?: string;
  unit?: "number" | "money" | "percent";
  /** Numbers, + - * / ( ) and spend, impressions, clicks, conversions, leads, results_<key>. */
  formula?: string;
}

// ─── Creative tools ───────────────────────────────────────────────────────────

export interface ListAdMediaParams {
  ad_account_id: number | string;
  type?: "image" | "video";
  cursor?: string;
}

export interface UploadAdMediaParams {
  ad_account_id: number | string;
  type: "image" | "video";
  url: string;
  name?: string;
}

export interface AdMediaRefParams {
  ad_account_id: number | string;
  /** Required on `delete()`. */
  type?: "image" | "video";
}

export interface AdPreviewParams {
  ad_account_id: number | string;
  /** The ad, in the shape of a draft ad. */
  ad: NewCampaignAd;
  placements?: string[];
  objective?: string;
}

export interface AdPreview {
  placement: string;
  html?: string | null;
  url?: string | null;
  [key: string]: unknown;
}

export interface AdExistingPreviewParams {
  /** Sent as a comma list. */
  placements?: string | string[];
}

export interface SetAdPartnershipPermissionParams {
  ad_account_id: number | string;
  [key: string]: unknown;
}

// ─── Comments on ads ──────────────────────────────────────────────────────────

export interface AdComment {
  id: string;
  text: string;
  author?: Record<string, unknown> | null;
  created_at?: string;
  hidden?: boolean;
  [key: string]: unknown;
}

// ─── Ad account admin ─────────────────────────────────────────────────────────

export interface AdAccountHealth {
  /** `ok`, `warning`, `failed` or `unknown`. */
  status: string;
  /** Each check: `ok`, `failed` or `unknown`; failed checks carry a `fix_url`. */
  checks: { key: string; status: string; message?: string; fix_url?: string; [key: string]: unknown }[];
  [key: string]: unknown;
}

/**
 * `ads.accounts.updateSettings()`. A higher `spend_cap` needs
 * `confirm_budget_amount` = the new cap; removing the cap (`null`) needs
 * `confirm_budget_amount: "remove"`.
 */
export interface UpdateAdAccountSettingsParams {
  spend_cap?: number | null;
  dsa_beneficiary?: string;
  dsa_payor?: string;
  name?: string;
  confirm_budget_amount?: number | "remove";
}

export interface AddAdAccountUserParams {
  email?: string;
  member_id?: string;
  role: string;
}

export interface AdAccountActivityParams {
  since?: string;
  until?: string;
  cursor?: string;
}

// ─── Meta reach and frequency, studies, budget schedules ──────────────────────

/**
 * A reach and frequency prediction (Meta). It spends nothing; a reservation
 * does. Meta needs the reach and frequency capability on the ad account.
 * Exactly one country. Give `budget` (major units) or `reach`.
 */
export interface CreateAdReachFrequencyParams {
  ad_account_id: number | string;
  objective: "awareness" | "engagement" | "video_views";
  /** Exactly one country. */
  targeting: { countries: string[]; age_min?: number; age_max?: number; genders?: ("male" | "female")[] };
  start_at: string;
  end_at: string;
  budget?: AdBudget;
  /** People to reach, instead of a budget. */
  reach?: number;
  frequency_cap?: number;
  frequency_interval_days?: number;
}

/** A reservation commits the budget: `confirm_budget_amount` = the prediction's budget. */
export interface ReserveAdReachFrequencyParams {
  ad_account_id: number | string;
  confirm_budget_amount: number;
}

export interface CreateAdStudyParams {
  ad_account_id: number | string;
  [key: string]: unknown;
}

/**
 * A planned budget increase. New spend in that period: `confirm_budget_amount`
 * = the increase per day (absolute) or the campaign budget times the
 * multiplier.
 */
export interface CreateAdBudgetScheduleParams {
  start_at: string;
  end_at: string;
  budget_increase: { type: "absolute" | "multiplier"; value: number };
  confirm_budget_amount: number;
}

// ─── Google reports ───────────────────────────────────────────────────────────

export interface AdGoogleAccountParams {
  ad_account_id: number | string;
}

export interface AdGoogleSearchTermsParams extends AdGoogleAccountParams, AdDateRangeParams {
  campaign_id?: number | string;
  external_campaign_id?: string;
  limit?: number;
}

export interface AdGoogleRecommendationsParams extends AdGoogleAccountParams {
  /** Sent as a comma list. */
  types?: string | string[];
}

export interface AdGoogleKeywordsParams extends AdGoogleAccountParams {
  external_campaign_id?: string;
  external_ad_set_id?: string;
}

export interface AdGoogleAssetsParams extends AdGoogleAccountParams {
  type?: "sitelink" | "callout" | "structured_snippet";
}

export interface AdGoogleAdScheduleParams extends AdGoogleAccountParams {
  external_campaign_id: string;
}

export interface AdGoogleLocalServicesLeadsParams extends AdGoogleAccountParams {
  since?: string;
}

// ─── Capabilities and webhook events ──────────────────────────────────────────

/** The new parts of `ads.capabilities()`. */
export interface AdCapabilitiesParity {
  /** Per network, the feature keys its API offers through OmniSocials. */
  features?: Record<string, string[]>;
  /** A plain label per feature key. */
  feature_labels?: Record<string, string>;
  /** Per network, the types of `ads.targeting.search()` and the keys of `include` / `exclude`. */
  targeting_types?: Record<string, string[]>;
  /** Goals through the API and MCP only. */
  api_goals?: AdApiGoal[];
}

/** The ads webhook events (besides `ad.status_changed`). */
export type AdsWebhookEventType =
  | "ad.created"
  | "ad.updated"
  | "ad.review"
  | "ad.delivery_issue"
  | "campaign.created"
  | "campaign.updated"
  | "campaign.budget"
  | "lead.received"
  | "ads.sync_failed"
  | "ads.sync_recovered"
  | "ads.initial_sync_completed"
  | "ad_rule.triggered";
