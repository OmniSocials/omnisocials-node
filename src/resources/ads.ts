import type { OmniSocials, QueryValue } from "../client.js";
import type {
  AdAccountActivityParams,
  AdAccountHealth,
  AdAdAnalyticsParams,
  AdAlert,
  AdAudience,
  AdAudienceCompaniesParams,
  AdAudienceMembersParams,
  AdBidSuggestion,
  AdBidSuggestionParams,
  AdBulkStatusResult,
  AdCampaignAd,
  AdCampaignAdsList,
  AdCampaignAnalyticsParams,
  AdComment,
  AdConversionEventsResult,
  AdDateRangeParams,
  AdExistingPreviewParams,
  AdExternalCampaign,
  AdGoogleAccountParams,
  AdGoogleAdScheduleParams,
  AdGoogleAssetsParams,
  AdGoogleKeywordsParams,
  AdGoogleLocalServicesLeadsParams,
  AdGoogleRecommendationsParams,
  AdGoogleSearchTermsParams,
  AdImportState,
  AdInsightsQueryParams,
  AdInsightsRow,
  AdLead,
  AdLeadForm,
  AdMediaRefParams,
  AdObjectLevel,
  AdObjectStatusResult,
  AdPerformanceParams,
  AdPreview,
  AdPreviewParams,
  AdReachEstimate,
  AdReachEstimateParams,
  AdReport,
  AdResultRow,
  AdResultTotalsParams,
  AdReview,
  AdRule,
  AdTargetingBrowseParams,
  AdTargetingResults,
  AdTargetingSearchParams,
  AdTimelineParams,
  AdTree,
  AdTreeNode,
  AdTreeParams,
  AddAdAccountUserParams,
  AdsData,
  BulkAdCampaignStatusParams,
  CreateAdAudienceParams,
  CreateAdBudgetScheduleParams,
  CreateAdCustomConversionParams,
  CreateAdLeadFormParams,
  CreateAdReachFrequencyParams,
  CreateAdRuleParams,
  CreateAdStudyParams,
  DuplicateAdCampaignParams,
  DuplicateAdObjectParams,
  ListAdAudiencesParams,
  ListAdLeadsParams,
  ListAdMediaParams,
  ListAdResultsParams,
  ListAdRuleActivityParams,
  ListExternalAdCampaignsParams,
  NewCampaignAd,
  PutAdResultMetricParams,
  ReserveAdReachFrequencyParams,
  SendAdConversionEventsParams,
  SetAdPartnershipPermissionParams,
  SetAdStatusParams,
  UndoAdRuleActivityParams,
  UpdateAdAccountSettingsParams,
  UpdateAdAudienceParams,
  UpdateAdLeadFormParams,
  UpdateAdLeadParams,
  UpdateAdObjectParams,
  UpdateAdRuleParams,
  UploadAdMediaParams,
} from "../ads-parity-types.js";
import type {
  AdAccountsResponse,
  AdCampaign,
  AdCapabilities,
  AdDraft,
  AdDraftDefaults,
  AdDraftParams,
  AdMultiActivateResult,
  AdMultiBoostResult,
  AdMultiResponse,
  AdsOverview,
  AttachAdDraftAccountParams,
  BoostPostMultiParams,
  BoostPostParams,
  BoostSuggestion,
  ItemResponse,
  KeywordMetricsParams,
  KeywordMetricsResult,
  KeywordResearchParams,
  KeywordResearchResult,
  LaunchAdDraftParams,
  LaunchAdDraftResult,
  ListAdCampaignsParams,
  ListResponse,
  UpdateAdCampaignParams,
} from "../types.js";

// A call that can start or raise ad spend is never sent again after a 5xx or
// a timeout: the first attempt may have gone through. Read the campaign or
// the draft instead. Only a 429 is retried.
const MONEY_CALL = { retry: "rate_limit" } as const;

// Starting or raising spend needs a key with the opt-in `ads:spend` scope
// ("Start ads"). Without it a start, a resume, a budget raise or a change of
// a campaign that reached the network answers `403 start_in_app`, and its
// message names the page in the app where a person does it: hand over the
// draft's `review_url`. On Google (`api_draft_only` of `ads.capabilities()`)
// every caller stops at the draft, also with `ads:spend`. Pause and delete
// stay open, except on the networks in `api_stop_in_app` (Google). Ads errors may carry `param` (the field at
// fault): read it from `error.body.error.param`.

/**
 * "Create an ad" drafts: one campaign per network in `platforms`, each with
 * the same ads. A draft never spends; `launch()` starts it (a key with
 * `ads:spend`), or a person does in the app from its `review_url`.
 */
export class AdDraftsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /ads/drafts/defaults` - suggested countries (where the Instagram
   * followers are), the currency and the workspace's ad account per
   * network. Requires `ads:read`.
   */
  defaults(): Promise<ItemResponse<AdDraftDefaults>> {
    return this.client.get("/ads/drafts/defaults");
  }

  /**
   * `POST /ads/drafts` - save a new ad as a draft group. It needs no ad
   * account and spends nothing. Read `ads.capabilities()` first for what
   * each network accepts. The answer carries `review_url` (the builder in
   * the dashboard, where the person checks and starts the ad: hand it over)
   * and per network `readiness`. A `budget.currency` other than the
   * attached ad account's currency answers `400 currency_mismatch` with
   * `param: "budget.currency"`. Requires `ads:write`.
   */
  create(params: AdDraftParams): Promise<ItemResponse<AdDraft>> {
    return this.client.post("/ads/drafts", params);
  }

  /** `GET /ads/drafts/{group_id}` - one draft group. Requires `ads:read`. */
  get(groupId: string): Promise<ItemResponse<AdDraft>> {
    return this.client.get(`/ads/drafts/${encodeURIComponent(groupId)}`);
  }

  /**
   * `PUT /ads/drafts/{group_id}` - replace the draft with the full body.
   * Networks that already started are left alone (`campaigns[].editable`).
   * A `budget.currency` other than the attached ad account's currency
   * answers `400 currency_mismatch` with `param: "budget.currency"`.
   * Requires `ads:write`.
   */
  update(groupId: string, params: AdDraftParams): Promise<ItemResponse<AdDraft>> {
    return this.client.put(`/ads/drafts/${encodeURIComponent(groupId)}`, params);
  }

  /**
   * `DELETE /ads/drafts/{group_id}` - delete a draft group that never
   * started. Requires `ads:write`.
   */
  delete(groupId: string): Promise<ItemResponse<{ deleted: boolean }>> {
    return this.client.delete(`/ads/drafts/${encodeURIComponent(groupId)}`);
  }

  /**
   * `POST /ads/drafts/{group_id}/account` - set the ad account of one
   * network in the draft (from `ads.listAccounts()`, same network).
   * Requires `ads:write`.
   */
  attachAccount(
    groupId: string,
    params: AttachAdDraftAccountParams
  ): Promise<ItemResponse<AdDraft>> {
    return this.client.post(`/ads/drafts/${encodeURIComponent(groupId)}/account`, params);
  }

  /**
   * `POST /ads/drafts/{group_id}/launch` - START REAL AD SPEND for every
   * network of the draft that never started. Needs a key with the opt-in
   * `ads:spend` scope; without it the call answers `403 start_in_app` with
   * the page where a person starts it (the draft's `review_url`), and a
   * network in `api_draft_only` (Google) is always skipped with code
   * `start_in_app`. Show the person the daily amount per network and get
   * their yes first,
   * then pass it as `confirm_budget_amount` (or per campaign as
   * `confirm_budget_amounts`). A wrong or missing amount answers
   * `400 budget_confirmation_required` and writes nothing. Per network
   * results (`campaign_id` is a string); one failed network never stops the
   * others. Not retried after a 5xx or a timeout: read the draft with
   * `get()` to see what started. Requires `ads:write`.
   */
  launch(
    groupId: string,
    params: LaunchAdDraftParams
  ): Promise<ItemResponse<LaunchAdDraftResult>> {
    return this.client.post(
      `/ads/drafts/${encodeURIComponent(groupId)}/launch`,
      params,
      MONEY_CALL
    );
  }
}

// ─── Ads API parity (2026-11-05) ──────────────────────────────────────────────

/** One path segment, encoded. */
const seg = (value: number | string): string => encodeURIComponent(String(value));

/** Query params: lists become a comma list, `undefined` and `null` are dropped. */
function query(params: object | undefined): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = Array.isArray(value) ? value.map(String).join(",") : (value as QueryValue);
  }
  return out;
}

/** The objects of an ad account path: `/ads/accounts/{id}/objects/{level}/{externalId}`. */
const objectPath = (accountId: number | string, level: AdObjectLevel, externalId: string): string =>
  `/ads/accounts/${seg(accountId)}/objects/${seg(level)}/${seg(externalId)}`;

const adPath = (campaignId: number | string, adId: number | string): string =>
  `/ads/campaigns/${seg(campaignId)}/ads/${seg(adId)}`;

/**
 * Campaigns, ad sets and ads of an ad account as the network has them, also
 * the ones made outside OmniSocials, and the import of those campaigns.
 * Objects of OmniSocials campaigns answer `409 use_campaign_routes`: change
 * those with the campaign methods.
 */
export class AdObjectsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /ads/accounts/{accountId}/tree` - campaigns, ad sets and ads with
   * the numbers of the date range (at most 90 days, default the last 30).
   * Each campaign says `source` (`omnisocials` or `external`). Requires
   * `ads:read`.
   */
  tree(accountId: number | string, params: AdTreeParams = {}): Promise<ItemResponse<AdTree>> {
    return this.client.get(`/ads/accounts/${seg(accountId)}/tree`, query(params));
  }

  /** `GET /ads/accounts/{accountId}/objects/{level}/{externalId}` - live details of one object. Requires `ads:read`. */
  get(accountId: number | string, level: AdObjectLevel, externalId: string): Promise<ItemResponse<AdTreeNode>> {
    return this.client.get(objectPath(accountId, level, externalId));
  }

  /**
   * `PATCH /ads/accounts/{accountId}/objects/{level}/{externalId}` - change
   * the name, budget or end date of a campaign or ad set made outside
   * OmniSocials. A higher budget RAISES REAL AD SPEND: show the person the
   * new amount, get their yes, and pass it as `confirm_budget_amount`. It
   * changes the campaign on the network: Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Not retried after
   * a 5xx or a timeout: read the object with `get()`. Requires `ads:write`.
   */
  update(
    accountId: number | string,
    level: Exclude<AdObjectLevel, "ad">,
    externalId: string,
    params: UpdateAdObjectParams
  ): Promise<ItemResponse<AdTreeNode>> {
    return this.client.patch(objectPath(accountId, level, externalId), params, MONEY_CALL);
  }

  /**
   * `PUT /ads/accounts/{accountId}/objects/{level}/{externalId}/status` -
   * pause, or switch on. Switching on STARTS REAL AD SPEND: pass the budget
   * that pays (the object's own or its parent's) as `confirm_budget_amount`
   * after the person agreed. Switching on: Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Pausing needs
   * nothing and stays open (Google: `start_in_app`). Not retried after a 5xx
   * or a timeout. Requires `ads:write`.
   */
  setStatus(
    accountId: number | string,
    level: AdObjectLevel,
    externalId: string,
    params: SetAdStatusParams
  ): Promise<ItemResponse<AdObjectStatusResult>> {
    return this.client.request("PUT", `${objectPath(accountId, level, externalId)}/status`, {
      body: params,
      ...MONEY_CALL,
    });
  }

  /**
   * `POST /ads/accounts/{accountId}/objects/{level}/{externalId}/duplicate` -
   * copy an object made outside OmniSocials; the copy is paused (Meta
   * today). It changes the ad account on the network: Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app.
   * Requires `ads:write`.
   */
  duplicate(
    accountId: number | string,
    level: AdObjectLevel,
    externalId: string,
    params: DuplicateAdObjectParams = {}
  ): Promise<ItemResponse<AdTreeNode>> {
    return this.client.post(`${objectPath(accountId, level, externalId)}/duplicate`, params);
  }

  /** `GET /ads/accounts/{accountId}/import` - the import state of the campaigns made outside OmniSocials. Requires `ads:read`. */
  importStatus(accountId: number | string): Promise<ItemResponse<AdImportState>> {
    return this.client.get(`/ads/accounts/${seg(accountId)}/import`);
  }

  /**
   * `POST /ads/accounts/{accountId}/import` - read the ad account again at
   * the next sync (within 15 minutes). The first import reads 90 days;
   * webhook `ads.initial_sync_completed` when it is done. Requires
   * `ads:write`.
   */
  startImport(accountId: number | string): Promise<ItemResponse<AdImportState>> {
    return this.client.post(`/ads/accounts/${seg(accountId)}/import`);
  }

  /** `GET /ads/external-campaigns` - the imported campaigns. Requires `ads:read`. */
  listExternal(
    params: ListExternalAdCampaignsParams = {}
  ): Promise<ItemResponse<{ campaigns: AdExternalCampaign[]; total: number; [key: string]: unknown }>> {
    return this.client.get("/ads/external-campaigns", query(params));
  }

  /** `GET /ads/external-campaigns/{id}` - one imported campaign with `daily[]`. Requires `ads:read`. */
  getExternal(id: number | string, params: AdDateRangeParams = {}): Promise<ItemResponse<AdExternalCampaign>> {
    return this.client.get(`/ads/external-campaigns/${seg(id)}`, query(params));
  }
}

/** The ads of an OmniSocials campaign. */
export class AdCampaignAdsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/campaigns/{id}/ads` - the ads with their status, review and latest numbers. Requires `ads:read`. */
  list(campaignId: number | string): Promise<ItemResponse<AdCampaignAdsList>> {
    return this.client.get(`/ads/campaigns/${seg(campaignId)}/ads`);
  }

  /**
   * `POST /ads/campaigns/{id}/ads` - add up to 6 ads to a campaign that
   * runs. The new ads are created PAUSED on the network; switch each one on
   * with `setStatus()`. It changes a campaign on the network: Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app.
   * Webhook `ad.created`. Requires `ads:write`.
   */
  add(campaignId: number | string, ads: NewCampaignAd[]): Promise<ItemResponse<AdCampaignAdsList>> {
    return this.client.post(`/ads/campaigns/${seg(campaignId)}/ads`, { ads });
  }

  /** `GET /ads/campaigns/{id}/ads/{adId}` - one ad. Requires `ads:read`. */
  get(campaignId: number | string, adId: number | string): Promise<ItemResponse<AdCampaignAd>> {
    return this.client.get(adPath(campaignId, adId));
  }

  /**
   * `PUT /ads/campaigns/{id}/ads/{adId}/status` - pause, or switch on one
   * ad. Switching on STARTS REAL AD SPEND: pass the campaign budget as
   * `confirm_budget_amount` after the person agreed. Switching on:
   * Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Pausing stays open (Google: `start_in_app`). Not
   * retried after a 5xx or a timeout. Webhook `ad.updated`. Requires
   * `ads:write`.
   */
  setStatus(
    campaignId: number | string,
    adId: number | string,
    params: SetAdStatusParams
  ): Promise<ItemResponse<AdCampaignAd>> {
    return this.client.request("PUT", `${adPath(campaignId, adId)}/status`, { body: params, ...MONEY_CALL });
  }

  /** `GET /ads/campaigns/{id}/ads/{adId}/review` - the network's review verdict. Requires `ads:read`. */
  review(campaignId: number | string, adId: number | string): Promise<ItemResponse<AdReview>> {
    return this.client.get(`${adPath(campaignId, adId)}/review`);
  }
}

/** Comments on an ad of an OmniSocials campaign. */
export class AdCommentsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/campaigns/{id}/ads/{adId}/comments`. Requires `ads:read`. */
  list(
    campaignId: number | string,
    adId: number | string,
    params: { cursor?: string } = {}
  ): Promise<ItemResponse<{ comments: AdComment[]; next_cursor?: string | null; [key: string]: unknown }>> {
    return this.client.get(`${adPath(campaignId, adId)}/comments`, query(params));
  }

  /** `POST /ads/campaigns/{id}/ads/{adId}/comments/{commentId}/reply` - answer a comment. Requires `ads:write`. */
  reply(
    campaignId: number | string,
    adId: number | string,
    commentId: string,
    text: string
  ): Promise<ItemResponse<AdComment>> {
    return this.client.post(`${adPath(campaignId, adId)}/comments/${seg(commentId)}/reply`, { text });
  }

  /** `POST /ads/campaigns/{id}/ads/{adId}/comments/{commentId}/hide` - hide (default) or show a comment. Requires `ads:write`. */
  hide(
    campaignId: number | string,
    adId: number | string,
    commentId: string,
    hidden = true
  ): Promise<ItemResponse<AdsData>> {
    return this.client.post(`${adPath(campaignId, adId)}/comments/${seg(commentId)}/hide`, { hidden });
  }

  /** `DELETE /ads/campaigns/{id}/ads/{adId}/comments/{commentId}`. Requires `ads:write`. */
  delete(campaignId: number | string, adId: number | string, commentId: string): Promise<ItemResponse<AdsData>> {
    return this.client.delete(`${adPath(campaignId, adId)}/comments/${seg(commentId)}`);
  }
}

/**
 * Targeting options of a network. The ids go in
 * `targeting.networks.<network>.include` of a draft (or `targeting.network`
 * of a campaign); the types per network are `ads.capabilities()`
 * `targeting_types`.
 */
export class AdTargetingResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/targeting/search` - interests, places, languages, job titles ... Requires `ads:read`. */
  search(params: AdTargetingSearchParams): Promise<ItemResponse<AdTargetingResults>> {
    return this.client.get("/ads/targeting/search", query(params));
  }

  /** `GET /ads/targeting/browse` - the categories as a tree. Requires `ads:read`. */
  browse(params: AdTargetingBrowseParams): Promise<ItemResponse<AdTargetingResults>> {
    return this.client.get("/ads/targeting/browse", query(params));
  }

  /** `POST /ads/targeting/reach-estimate` - the audience size of a targeting. Read-only. Requires `ads:read`. */
  reachEstimate(params: AdReachEstimateParams): Promise<ItemResponse<AdReachEstimate>> {
    return this.client.post("/ads/targeting/reach-estimate", params);
  }

  /** `POST /ads/targeting/bid-suggestions` - a suggested bid and daily budget. Read-only. Requires `ads:read`. */
  bidSuggestions(params: AdBidSuggestionParams): Promise<ItemResponse<AdBidSuggestion>> {
    return this.client.post("/ads/targeting/bid-suggestions", params);
  }
}

/** Custom audiences of an ad account: customer lists, lookalikes and company lists. */
export class AdAudiencesResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/audiences`. Requires `ads:read`. */
  list(params: ListAdAudiencesParams): Promise<ItemResponse<{ audiences: AdAudience[]; next_cursor?: string | null; [key: string]: unknown }>> {
    return this.client.get("/ads/audiences", query(params));
  }

  /**
   * `POST /ads/audiences` - a customer list (empty, or with its first
   * `schema` + `rows`), a lookalike or a company list. Requires `ads:write`.
   */
  create(params: CreateAdAudienceParams): Promise<ItemResponse<AdAudience>> {
    return this.client.post("/ads/audiences", params);
  }

  /** `GET /ads/audiences/{audienceId}` (the network's audience id). Requires `ads:read`. */
  get(audienceId: string, adAccountId: number | string): Promise<ItemResponse<AdAudience>> {
    return this.client.get(`/ads/audiences/${seg(audienceId)}`, { ad_account_id: String(adAccountId) });
  }

  /** `PATCH /ads/audiences/{audienceId}` - rename. Requires `ads:write`. */
  update(audienceId: string, params: UpdateAdAudienceParams): Promise<ItemResponse<AdAudience>> {
    return this.client.patch(`/ads/audiences/${seg(audienceId)}`, params);
  }

  /** `DELETE /ads/audiences/{audienceId}`. Requires `ads:write`. */
  delete(audienceId: string, adAccountId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.request("DELETE", `/ads/audiences/${seg(audienceId)}`, {
      query: { ad_account_id: String(adAccountId) },
    });
  }

  /**
   * `POST /ads/audiences/{audienceId}/members` - add people to a customer
   * list. Send the raw values: OmniSocials hashes them with SHA-256 before
   * they leave and stores nothing. At most 10,000 rows. Requires `ads:write`.
   */
  addMembers(audienceId: string, params: AdAudienceMembersParams): Promise<ItemResponse<AdsData>> {
    return this.client.post(`/ads/audiences/${seg(audienceId)}/members`, params);
  }

  /** `DELETE /ads/audiences/{audienceId}/members` - remove people (same body as `addMembers()`). Requires `ads:write`. */
  removeMembers(audienceId: string, params: AdAudienceMembersParams): Promise<ItemResponse<AdsData>> {
    return this.client.request("DELETE", `/ads/audiences/${seg(audienceId)}/members`, { body: params });
  }

  /** `POST /ads/audiences/{audienceId}/companies` - add companies to a company list (LinkedIn). Requires `ads:write`. */
  addCompanies(audienceId: string, params: AdAudienceCompaniesParams): Promise<ItemResponse<AdsData>> {
    return this.client.post(`/ads/audiences/${seg(audienceId)}/companies`, params);
  }
}

/** Lead forms (Meta: the workspace's Page). Use a form's `external_id` as `settings.lead_form_id`. */
export class AdLeadFormsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/lead-forms`. Requires `ads:read`. */
  list(adAccountId: number | string): Promise<ItemResponse<{ forms: AdLeadForm[]; [key: string]: unknown }>> {
    return this.client.get("/ads/lead-forms", { ad_account_id: String(adAccountId) });
  }

  /** `POST /ads/lead-forms`. Requires `ads:write`. */
  create(params: CreateAdLeadFormParams): Promise<ItemResponse<AdLeadForm>> {
    return this.client.post("/ads/lead-forms", params);
  }

  /** `GET /ads/lead-forms/{formId}` (the OmniSocials form id). Requires `ads:read`. */
  get(formId: number | string): Promise<ItemResponse<AdLeadForm>> {
    return this.client.get(`/ads/lead-forms/${seg(formId)}`);
  }

  /** `PATCH /ads/lead-forms/{formId}` - archive or open a form, or switch its lead sync. Requires `ads:write`. */
  update(formId: number | string, params: UpdateAdLeadFormParams): Promise<ItemResponse<AdLeadForm>> {
    return this.client.patch(`/ads/lead-forms/${seg(formId)}`, params);
  }

  /** `DELETE /ads/lead-forms/{formId}` - archive a form (the leads already copied stay). Requires `ads:write`. */
  delete(formId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.delete(`/ads/lead-forms/${seg(formId)}`);
  }

  /** `POST /ads/lead-forms/{formId}/test-leads` - a test lead (the next sync copies it, marked `is_test`). Requires `ads:write`. */
  sendTestLead(formId: number | string, params: { fields?: Record<string, unknown> } = {}): Promise<ItemResponse<AdsData>> {
    return this.client.post(`/ads/lead-forms/${seg(formId)}/test-leads`, params);
  }
}

/** Leads of the workspace, copied from the networks every 15 minutes (webhook `lead.received`). */
export class AdLeadsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/leads` - newest first. The answers are personal data. Requires `ads:read`. */
  list(params: ListAdLeadsParams = {}): Promise<ItemResponse<{ leads: AdLead[]; next_cursor: string | null; [key: string]: unknown }>> {
    return this.client.get("/ads/leads", query(params));
  }

  /** `GET /ads/leads/counts` - counts by status. Requires `ads:read`. */
  counts(params: { form_id?: number | string } = {}): Promise<ItemResponse<{ total: number; by_status: Record<string, number>; [key: string]: unknown }>> {
    return this.client.get("/ads/leads/counts", query(params));
  }

  /** `PATCH /ads/leads/{leadId}` - set a lead's status or note. Requires `ads:write`. */
  update(leadId: number | string, params: UpdateAdLeadParams): Promise<ItemResponse<AdLead>> {
    return this.client.patch(`/ads/leads/${seg(leadId)}`, params);
  }
}

/** Pixels, conversion goals, custom conversions and server-side conversion events. */
export class AdConversionsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/conversions/destinations` - pixels, datasets, conversion tags and actions. Requires `ads:read`. */
  destinations(adAccountId: number | string): Promise<ItemResponse<{ destinations: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/conversions/destinations", { ad_account_id: String(adAccountId) });
  }

  /** `GET /ads/conversions/goals` - the events a campaign can optimise for. Requires `ads:read`. */
  goals(adAccountId: number | string): Promise<ItemResponse<{ goals: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/conversions/goals", { ad_account_id: String(adAccountId) });
  }

  /** `POST /ads/conversions/custom` - a custom conversion (a URL rule and/or a pixel event). Requires `ads:write`. */
  createCustom(params: CreateAdCustomConversionParams): Promise<ItemResponse<AdsData>> {
    return this.client.post("/ads/conversions/custom", params);
  }

  /**
   * `POST /ads/conversions/events` - send up to 1,000 conversion events from
   * your server. Raw email and phone are hashed with SHA-256 before they
   * leave; nothing is stored. Requires `ads:write`.
   */
  sendEvents(params: SendAdConversionEventsParams): Promise<ItemResponse<AdConversionEventsResult>> {
    return this.client.post("/ads/conversions/events", params);
  }
}

/** Numbers: live from the network, per campaign or ad, over time, ranked, and what needs attention. */
export class AdInsightsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `POST /ads/insights` - live numbers from the network by day, ad,
   * country, age, gender, placement, device or platform. Read-only.
   * Requires `ads:read`.
   */
  query(params: AdInsightsQueryParams): Promise<ItemResponse<{ rows: AdInsightsRow[]; [key: string]: unknown }>> {
    return this.client.post("/ads/insights", params);
  }

  /** `GET /ads/campaigns/{id}/analytics` - numbers of an OmniSocials campaign (`breakdown: "ad"` = one row per ad). Requires `ads:read`. */
  campaign(campaignId: number | string, params: AdCampaignAnalyticsParams = {}): Promise<ItemResponse<{ rows: AdInsightsRow[]; [key: string]: unknown }>> {
    return this.client.get(`/ads/campaigns/${seg(campaignId)}/analytics`, query(params));
  }

  /** `GET /ads/campaigns/{id}/ads/{adId}/analytics` - numbers of one ad. Requires `ads:read`. */
  ad(
    campaignId: number | string,
    adId: number | string,
    params: AdAdAnalyticsParams = {}
  ): Promise<ItemResponse<{ rows: AdInsightsRow[]; [key: string]: unknown }>> {
    return this.client.get(`${adPath(campaignId, adId)}/analytics`, query(params));
  }

  /** `GET /ads/timeline` - daily totals of the workspace (OmniSocials and imported campaigns). Requires `ads:read`. */
  timeline(params: AdTimelineParams = {}): Promise<ItemResponse<{ series: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/timeline", query(params));
  }

  /** `GET /ads/performance` - campaigns or ads ranked by one metric. Requires `ads:read`. */
  performance(params: AdPerformanceParams = {}): Promise<ItemResponse<{ items: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/performance", query(params));
  }

  /** `GET /ads/alerts` - rejected ads, held campaigns, sign-in or payment problems, no delivery. Requires `ads:read`. */
  alerts(): Promise<ItemResponse<{ alerts: AdAlert[]; [key: string]: unknown }>> {
    return this.client.get("/ads/alerts");
  }
}

/** Long reports that run in the background (up to 730 days). */
export class AdReportsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/insights/reports` - the background reports of the workspace. Requires `ads:read`. */
  list(): Promise<ItemResponse<{ reports: AdReport[]; [key: string]: unknown }>> {
    return this.client.get("/ads/insights/reports");
  }

  /** `POST /ads/insights/reports` - start a report (the body of `ads.insights.query()`); poll `get()`. Requires `ads:read`. */
  start(params: AdInsightsQueryParams): Promise<ItemResponse<AdReport>> {
    return this.client.post("/ads/insights/reports", params);
  }

  /** `GET /ads/insights/reports/{reportId}` - `running`, `done` (with `rows`) or `failed`. Requires `ads:read`. */
  get(reportId: string): Promise<ItemResponse<AdReport>> {
    return this.client.get(`/ads/insights/reports/${seg(reportId)}`);
  }
}

/**
 * Automated rules: check campaigns on a schedule and notify, pause,
 * activate or adjust the budget. A rule that notifies, pauses or lowers a
 * budget works with `ads:write`. A rule that can raise spend (activate, a
 * positive adjust_budget) needs a key with `ads:spend` (else
 * `403 rule_raises_spend`) and `action.max_daily_budget`, confirmed by the
 * person as `confirm_max_daily_budget`; it never acts on Google. `create()`, `update()` and `undo()` are not
 * retried after a 5xx or a timeout: read the rule or the activity instead.
 */
export class AdRulesResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/rules`. Requires `ads:read`. */
  list(): Promise<ItemResponse<{ rules: AdRule[]; [key: string]: unknown }>> {
    return this.client.get("/ads/rules");
  }

  /**
   * `POST /ads/rules` - a new rule, off until `enabled: true`. A rule that
   * can RAISE REAL AD SPEND (activate, a positive adjust_budget) needs the
   * person's own ceiling as `confirm_max_daily_budget` and a key with
   * `ads:spend` (else `403 rule_raises_spend`). Preview it first with
   * `preview()`. Requires `ads:write`.
   */
  create(params: CreateAdRuleParams): Promise<ItemResponse<AdRule>> {
    return this.client.post("/ads/rules", params, MONEY_CALL);
  }

  /** `GET /ads/rules/templates` - ready-made rules. Requires `ads:read`. */
  templates(): Promise<ItemResponse<{ templates: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/rules/templates");
  }

  /** `POST /ads/rules/preview` - what an unsaved rule would match and do now. Requires `ads:read`. */
  preview(params: CreateAdRuleParams): Promise<ItemResponse<{ results: AdsData[]; [key: string]: unknown }>> {
    return this.client.post("/ads/rules/preview", params);
  }

  /** `GET /ads/rules/activity` - every change the rules made, with before and after. Requires `ads:read`. */
  activity(params: ListAdRuleActivityParams = {}): Promise<ItemResponse<{ activity: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/rules/activity", query(params));
  }

  /**
   * `POST /ads/rules/activity/{activityId}/undo` - undo a change a rule
   * made. Undo of a pause or of a budget cut RESTARTS or RAISES REAL AD
   * SPEND and needs `confirm_budget_amount` after the person agreed, and a
   * key with `ads:spend` (else, and on Google always, `403 start_in_app`).
   * Requires `ads:write`.
   */
  undo(activityId: number | string, params: UndoAdRuleActivityParams = {}): Promise<ItemResponse<AdsData>> {
    return this.client.post(`/ads/rules/activity/${seg(activityId)}/undo`, params, MONEY_CALL);
  }

  /** `GET /ads/rules/{ruleId}`. Requires `ads:read`. */
  get(ruleId: number | string): Promise<ItemResponse<AdRule>> {
    return this.client.get(`/ads/rules/${seg(ruleId)}`);
  }

  /**
   * `PATCH /ads/rules/{ruleId}` - change a rule (also `enabled`). A changed
   * action that can raise spend needs `confirm_max_daily_budget` again and a
   * key with `ads:spend` (else `403 rule_raises_spend`). Requires
   * `ads:write`.
   */
  update(ruleId: number | string, params: UpdateAdRuleParams): Promise<ItemResponse<AdRule>> {
    return this.client.patch(`/ads/rules/${seg(ruleId)}`, params, MONEY_CALL);
  }

  /** `DELETE /ads/rules/{ruleId}`. Requires `ads:write`. */
  delete(ruleId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.delete(`/ads/rules/${seg(ruleId)}`);
  }

  /** `POST /ads/rules/{ruleId}/preview` - what a saved rule would match and do now. Requires `ads:read`. */
  previewSaved(ruleId: number | string): Promise<ItemResponse<{ results: AdsData[]; [key: string]: unknown }>> {
    return this.client.post(`/ads/rules/${seg(ruleId)}/preview`);
  }

  /** `GET /ads/rules/{ruleId}/runs`. Requires `ads:read`. */
  runs(ruleId: number | string, params: { limit?: number } = {}): Promise<ItemResponse<{ runs: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(`/ads/rules/${seg(ruleId)}/runs`, query(params));
  }
}

/** Your own numbers per campaign and day (qualified leads, sales, revenue); rules read them as `results.<metric>`. */
export class AdResultsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/campaign-results`. Requires `ads:read`. */
  list(params: ListAdResultsParams = {}): Promise<ItemResponse<{ results: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/campaign-results", query(params));
  }

  /** `POST /ads/campaign-results` - up to 5,000 rows; sending a day again replaces it. Requires `ads:write`. */
  upload(rows: AdResultRow[]): Promise<ItemResponse<AdsData>> {
    return this.client.post("/ads/campaign-results", { rows });
  }

  /** `GET /ads/campaign-results/totals` - totals over a period, with the formulas. Requires `ads:read`. */
  totals(params: AdResultTotalsParams = {}): Promise<ItemResponse<AdsData>> {
    return this.client.get("/ads/campaign-results/totals", query(params));
  }

  /** `GET /ads/campaign-results/metrics` - your metric names and formulas. Requires `ads:read`. */
  metrics(): Promise<ItemResponse<{ metrics: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/campaign-results/metrics");
  }

  /** `PUT /ads/campaign-results/metrics/{key}` - name a metric or define a formula. Requires `ads:write`. */
  putMetric(key: string, params: PutAdResultMetricParams): Promise<ItemResponse<AdsData>> {
    return this.client.put(`/ads/campaign-results/metrics/${seg(key)}`, params);
  }
}

/** The network's own image and video library of an ad account. Use an id as `network.<network>.media_ref`. */
export class AdMediaResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/media`. Requires `ads:read`. */
  list(params: ListAdMediaParams): Promise<ItemResponse<{ items: AdsData[]; next_cursor?: string | null; [key: string]: unknown }>> {
    return this.client.get("/ads/media", query(params));
  }

  /** `POST /ads/media` - upload an image or video to the network ahead of an ad. Requires `ads:write`. */
  upload(params: UploadAdMediaParams): Promise<ItemResponse<AdsData>> {
    return this.client.post("/ads/media", params);
  }

  /** `GET /ads/media/{mediaId}` - the processing status of an upload. Requires `ads:read`. */
  get(mediaId: string, params: AdMediaRefParams): Promise<ItemResponse<AdsData>> {
    return this.client.get(`/ads/media/${seg(mediaId)}`, query(params));
  }

  /** `DELETE /ads/media/{mediaId}` (`type` is required). Requires `ads:write`. */
  delete(mediaId: string, params: Required<AdMediaRefParams>): Promise<ItemResponse<AdsData>> {
    return this.client.request("DELETE", `/ads/media/${seg(mediaId)}`, { query: query(params) });
  }
}

/** Previews drawn by the network. */
export class AdPreviewsResource {
  constructor(private readonly client: OmniSocials) {}

  /** `POST /ads/previews` - previews of a new ad. Read-only. Requires `ads:read`. */
  create(params: AdPreviewParams): Promise<ItemResponse<{ previews: AdPreview[]; [key: string]: unknown }>> {
    return this.client.post("/ads/previews", params);
  }

  /** `GET /ads/campaigns/{id}/ads/{adId}/previews` - previews of an existing ad. Requires `ads:read`. */
  forAd(
    campaignId: number | string,
    adId: number | string,
    params: AdExistingPreviewParams = {}
  ): Promise<ItemResponse<{ previews: AdPreview[]; [key: string]: unknown }>> {
    return this.client.get(`${adPath(campaignId, adId)}/previews`, query(params));
  }
}

/** Partnership ads with creators (Meta). */
export class AdPartnershipResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/partnership/content` - creator posts you may run as partnership ads. Requires `ads:read`. */
  listContent(adAccountId: number | string): Promise<ItemResponse<{ content: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/partnership/content", { ad_account_id: String(adAccountId) });
  }

  /** `GET /ads/partnership/permissions`. Requires `ads:read`. */
  listPermissions(adAccountId: number | string): Promise<ItemResponse<{ permissions: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/partnership/permissions", { ad_account_id: String(adAccountId) });
  }

  /** `POST /ads/partnership/permissions` - ask for or set a permission (Meta's fields pass through). Requires `ads:write`. */
  setPermission(params: SetAdPartnershipPermissionParams): Promise<ItemResponse<AdsData>> {
    return this.client.post("/ads/partnership/permissions", params);
  }
}

/** Ad account admin: health, finance, settings, people, change log, businesses, DSA, hierarchy, identities. */
export class AdAccountsResource {
  constructor(private readonly client: OmniSocials) {}

  private path(accountId: number | string, rest: string): string {
    return `/ads/accounts/${seg(accountId)}/${rest}`;
  }

  /** `GET /ads/accounts/{accountId}/identities` - Pages, profiles and identities an ad can run as. Requires `ads:read`. */
  identities(accountId: number | string): Promise<ItemResponse<{ identities: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(this.path(accountId, "identities"));
  }

  /**
   * `GET /ads/accounts/{accountId}/health` - status, payment, spend limit,
   * Page and pixel before an ad starts. A check that cannot be read is
   * `unknown`; failed checks carry a `fix_url`. Requires `ads:read`.
   */
  health(accountId: number | string): Promise<ItemResponse<{ health: AdAccountHealth; [key: string]: unknown }>> {
    return this.client.get(this.path(accountId, "health"));
  }

  /** `GET /ads/accounts/{accountId}/finance` - spend limit, amount spent, balance, payment method. Requires `ads:read`. */
  finance(accountId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.get(this.path(accountId, "finance"));
  }

  /**
   * `PATCH /ads/accounts/{accountId}/settings` - spend cap, DSA payer and
   * beneficiary, name. A higher spend cap ALLOWS MORE REAL AD SPEND: pass
   * the new cap as `confirm_budget_amount` (removing the cap:
   * `confirm_budget_amount: "remove"`) after the person agreed. A spend cap
   * change: Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. The name and the DSA names stay open. Not
   * retried after a 5xx or a timeout. Requires `ads:write`.
   */
  updateSettings(accountId: number | string, params: UpdateAdAccountSettingsParams): Promise<ItemResponse<AdsData>> {
    return this.client.patch(this.path(accountId, "settings"), params, MONEY_CALL);
  }

  /** `GET /ads/accounts/{accountId}/users` - people with access. Requires `ads:read`. */
  listUsers(accountId: number | string): Promise<ItemResponse<{ users: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(this.path(accountId, "users"));
  }

  /** `POST /ads/accounts/{accountId}/users` - give a person access (LinkedIn). Requires `ads:write`. */
  addUser(accountId: number | string, params: AddAdAccountUserParams): Promise<ItemResponse<AdsData>> {
    return this.client.post(this.path(accountId, "users"), params);
  }

  /** `DELETE /ads/accounts/{accountId}/users/{userId}` - remove a person's access. Requires `ads:write`. */
  removeUser(accountId: number | string, userId: string): Promise<ItemResponse<AdsData>> {
    return this.client.delete(this.path(accountId, `users/${seg(userId)}`));
  }

  /** `GET /ads/accounts/{accountId}/activity` - the change log of the ad account. Requires `ads:read`. */
  activity(accountId: number | string, params: AdAccountActivityParams = {}): Promise<ItemResponse<{ events: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(this.path(accountId, "activity"), query(params));
  }

  /** `GET /ads/accounts/{accountId}/businesses` - Meta business portfolios, TikTok Business Centers. Requires `ads:read`. */
  businesses(accountId: number | string): Promise<ItemResponse<{ businesses: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(this.path(accountId, "businesses"));
  }

  /** `GET /ads/accounts/{accountId}/dsa` - the EU DSA payer and beneficiary (Meta). Requires `ads:read`. */
  dsa(accountId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.get(this.path(accountId, "dsa"));
  }

  /** `GET /ads/accounts/{accountId}/hierarchy` - the manager account hierarchy (Google). Requires `ads:read`. */
  hierarchy(accountId: number | string): Promise<ItemResponse<{ accounts: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(this.path(accountId, "hierarchy"));
  }
}

/** Meta reach and frequency buying. A prediction spends nothing; a reservation does. */
export class AdReachFrequencyResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `POST /ads/reach-frequency` - a prediction: one country, `budget` or
   * `reach`, start and end. It spends nothing. Requires `ads:write`.
   */
  create(params: CreateAdReachFrequencyParams): Promise<ItemResponse<AdsData>> {
    return this.client.post("/ads/reach-frequency", params);
  }

  /** `GET /ads/reach-frequency/{predictionId}`. Requires `ads:read`. */
  get(predictionId: string, adAccountId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.get(`/ads/reach-frequency/${seg(predictionId)}`, { ad_account_id: String(adAccountId) });
  }

  /** `DELETE /ads/reach-frequency/{predictionId}` - cancel a prediction or a reservation. Requires `ads:write`. */
  cancel(predictionId: string, adAccountId: number | string): Promise<ItemResponse<AdsData>> {
    return this.client.request("DELETE", `/ads/reach-frequency/${seg(predictionId)}`, {
      query: { ad_account_id: String(adAccountId) },
    });
  }

  /**
   * `POST /ads/reach-frequency/{predictionId}/reserve` - COMMITS REAL AD
   * SPEND: pass the prediction's budget as `confirm_budget_amount` after the
   * person agreed. Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Not retried after a 5xx or a timeout:
   * read the prediction with `get()`. Requires `ads:write`.
   */
  reserve(predictionId: string, params: ReserveAdReachFrequencyParams): Promise<ItemResponse<AdsData>> {
    return this.client.post(`/ads/reach-frequency/${seg(predictionId)}/reserve`, params, MONEY_CALL);
  }
}

/** A/B tests and lift studies (Meta). */
export class AdStudiesResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/studies`. Requires `ads:read`. */
  list(adAccountId: number | string): Promise<ItemResponse<{ studies: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/studies", { ad_account_id: String(adAccountId) });
  }

  /**
   * `POST /ads/studies` - an A/B test between existing campaigns or ad sets.
   * Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Requires `ads:write`.
   */
  create(params: CreateAdStudyParams): Promise<ItemResponse<AdsData>> {
    return this.client.post("/ads/studies", params);
  }
}

/** Planned budget increases of a campaign for high-demand periods (Meta). */
export class AdBudgetSchedulesResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/campaigns/{id}/budget-schedules`. Requires `ads:read`. */
  list(campaignId: number | string): Promise<ItemResponse<{ schedules: AdsData[]; [key: string]: unknown }>> {
    return this.client.get(`/ads/campaigns/${seg(campaignId)}/budget-schedules`);
  }

  /**
   * `POST /ads/campaigns/{id}/budget-schedules` - plan a budget increase:
   * NEW REAL AD SPEND in that period. Pass the increase per day (absolute)
   * or the campaign budget times the multiplier as `confirm_budget_amount`
   * after the person agreed. Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Not retried after a 5xx or a
   * timeout: read the schedules with `list()`. Requires `ads:write`.
   */
  create(campaignId: number | string, params: CreateAdBudgetScheduleParams): Promise<ItemResponse<AdsData>> {
    return this.client.post(`/ads/campaigns/${seg(campaignId)}/budget-schedules`, params, MONEY_CALL);
  }

  /** `DELETE /ads/campaigns/{id}/budget-schedules/{scheduleId}`. Requires `ads:write`. */
  delete(campaignId: number | string, scheduleId: string): Promise<ItemResponse<AdsData>> {
    return this.client.delete(`/ads/campaigns/${seg(campaignId)}/budget-schedules/${seg(scheduleId)}`);
  }
}

/** Google reports (read-only; every API caller stops at the draft on Google). */
export class AdGoogleResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /ads/google/search-terms`. Requires `ads:read`. */
  searchTerms(params: AdGoogleSearchTermsParams): Promise<ItemResponse<{ search_terms: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/search-terms", query(params));
  }

  /** `GET /ads/google/recommendations`. Requires `ads:read`. */
  recommendations(params: AdGoogleRecommendationsParams): Promise<ItemResponse<{ recommendations: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/recommendations", query(params));
  }

  /** `GET /ads/google/keywords` - search keywords and negative keywords. Requires `ads:read`. */
  keywords(params: AdGoogleKeywordsParams): Promise<ItemResponse<{ keywords: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/keywords", query(params));
  }

  /** `GET /ads/google/assets` - sitelinks, callouts and structured snippets. Requires `ads:read`. */
  assets(params: AdGoogleAssetsParams): Promise<ItemResponse<{ assets: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/assets", query(params));
  }

  /** `GET /ads/google/shared-budgets`. Requires `ads:read`. */
  sharedBudgets(params: AdGoogleAccountParams): Promise<ItemResponse<{ shared_budgets: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/shared-budgets", query(params));
  }

  /** `GET /ads/google/bid-strategies` - portfolio bid strategies. Requires `ads:read`. */
  bidStrategies(params: AdGoogleAccountParams): Promise<ItemResponse<{ bid_strategies: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/bid-strategies", query(params));
  }

  /** `GET /ads/google/ad-schedule` - the days and hours of a Google campaign. Requires `ads:read`. */
  adSchedule(params: AdGoogleAdScheduleParams): Promise<ItemResponse<{ schedule: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/ad-schedule", query(params));
  }

  /** `GET /ads/google/labels`. Requires `ads:read`. */
  labels(params: AdGoogleAccountParams): Promise<ItemResponse<{ labels: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/labels", query(params));
  }

  /** `GET /ads/google/local-services-leads`. Requires `ads:read`. */
  localServicesLeads(params: AdGoogleLocalServicesLeadsParams): Promise<ItemResponse<{ leads: AdsData[]; [key: string]: unknown }>> {
    return this.client.get("/ads/google/local-services-leads", query(params));
  }
}

export class AdsResource {
  /** "Create an ad" drafts. */
  readonly drafts: AdDraftsResource;
  /** Campaigns, ad sets and ads of an ad account, also the ones made outside OmniSocials, and their import. */
  readonly objects: AdObjectsResource;
  /** The ads of an OmniSocials campaign. */
  readonly campaignAds: AdCampaignAdsResource;
  /** Comments on ads. */
  readonly comments: AdCommentsResource;
  /** Targeting search, browse, reach estimate and bid suggestions. */
  readonly targeting: AdTargetingResource;
  /** Custom audiences: customer lists, lookalikes, company lists. */
  readonly audiences: AdAudiencesResource;
  /** Lead forms. */
  readonly leadForms: AdLeadFormsResource;
  /** Leads copied from the lead forms. */
  readonly leads: AdLeadsResource;
  /** Pixels, conversion goals, custom conversions, server-side events. */
  readonly conversions: AdConversionsResource;
  /** Live numbers, campaign and ad analytics, timeline, ranking, alerts. */
  readonly insights: AdInsightsResource;
  /** Background reports. */
  readonly reports: AdReportsResource;
  /** Automated rules. */
  readonly rules: AdRulesResource;
  /** Your own numbers per campaign and day. */
  readonly results: AdResultsResource;
  /** The network's own image and video library. */
  readonly media: AdMediaResource;
  /** Previews drawn by the network. */
  readonly previews: AdPreviewsResource;
  /** Partnership ads (Meta). */
  readonly partnership: AdPartnershipResource;
  /** Ad account admin (health, finance, settings, people, change log ...). */
  readonly accounts: AdAccountsResource;
  /** Meta reach and frequency. */
  readonly reachFrequency: AdReachFrequencyResource;
  /** A/B tests and lift studies (Meta). */
  readonly studies: AdStudiesResource;
  /** Planned budget increases (Meta). */
  readonly budgetSchedules: AdBudgetSchedulesResource;
  /** Google reports. */
  readonly google: AdGoogleResource;

  constructor(private readonly client: OmniSocials) {
    this.drafts = new AdDraftsResource(client);
    this.objects = new AdObjectsResource(client);
    this.campaignAds = new AdCampaignAdsResource(client);
    this.comments = new AdCommentsResource(client);
    this.targeting = new AdTargetingResource(client);
    this.audiences = new AdAudiencesResource(client);
    this.leadForms = new AdLeadFormsResource(client);
    this.leads = new AdLeadsResource(client);
    this.conversions = new AdConversionsResource(client);
    this.insights = new AdInsightsResource(client);
    this.reports = new AdReportsResource(client);
    this.rules = new AdRulesResource(client);
    this.results = new AdResultsResource(client);
    this.media = new AdMediaResource(client);
    this.previews = new AdPreviewsResource(client);
    this.partnership = new AdPartnershipResource(client);
    this.accounts = new AdAccountsResource(client);
    this.reachFrequency = new AdReachFrequencyResource(client);
    this.studies = new AdStudiesResource(client);
    this.budgetSchedules = new AdBudgetSchedulesResource(client);
    this.google = new AdGoogleResource(client);
  }

  /**
   * `GET /ads/accounts` - the connected ad accounts. Accounts are connected
   * and picked in the dashboard; only `is_selected` accounts can run
   * campaigns. Requires `ads:read` (opt-in on the API key).
   */
  listAccounts(): Promise<AdAccountsResponse> {
    return this.client.get("/ads/accounts");
  }

  /**
   * `GET /ads/capabilities` - what each network accepts for a new ad
   * (goals, media, text limits, buttons, minimum daily budget),
   * `create_networks` and `network_states` (`live`, `preview` or
   * `coming_soon`), plus per network the `features` its API offers,
   * `targeting_types`, `bid_strategies`, `settings` and `ad_fields`, the
   * API-only goals (`api_goals`), `api_draft_only` (networks where every API
   * caller stops at the draft, also a key with `ads:spend`: Google) and
   * `api_stop_in_app` (networks where the API may not even pause or delete:
   * Google). Requires `ads:read`.
   */
  capabilities(): Promise<ItemResponse<AdCapabilities>> {
    return this.client.get("/ads/capabilities");
  }

  /** `GET /ads/campaigns` - list campaigns and boosts. Requires `ads:read`. */
  list(params: ListAdCampaignsParams = {}): Promise<ListResponse<AdCampaign>> {
    return this.client.get("/ads/campaigns", {
      status: params.status,
      platform: params.platform,
      campaign_type: params.campaign_type,
      limit: params.limit,
      offset: params.offset,
    });
  }

  /** `GET /ads/campaigns/{id}` - one campaign with its latest numbers. Requires `ads:read`. */
  get(id: number | string): Promise<ItemResponse<AdCampaign>> {
    return this.client.get(`/ads/campaigns/${encodeURIComponent(String(id))}`);
  }

  /**
   * `POST /ads/boost` - boost a published post. Creates a DRAFT boost that
   * spends nothing; the person starts it in the app. TikTok needs
   * `creative.spark_auth_code`, Google needs `headlines`, `descriptions` and
   * `logo_url`. Requires `ads:write`.
   */
  boost(params: BoostPostParams): Promise<ItemResponse<AdCampaign>> {
    return this.client.post("/ads/boost", params);
  }

  /**
   * `POST /ads/boost-multi` - one DRAFT boost per ad account (up to 10),
   * each with the same budget, so the total is amount x accounts. Answers
   * `{ results }`; one failed account never stops the others. Requires
   * `ads:write`.
   */
  boostMulti(params: BoostPostMultiParams): Promise<AdMultiResponse<AdMultiBoostResult>> {
    return this.client.post("/ads/boost-multi", params);
  }

  /**
   * `PATCH /ads/campaigns/{id}` - change the name, budget, targeting or
   * schedule of a draft. A campaign that reached the network changes only
   * with a key that has `ads:spend`; without it, and on Google always, the
   * call answers `403 start_in_app` and a person changes it in the app.
   * `confirm_budget_amount` (the new amount again) is for a budget raise of
   * a running campaign. Not retried after a 5xx or a timeout. Requires
   * `ads:write`.
   */
  update(id: number | string, params: UpdateAdCampaignParams): Promise<ItemResponse<AdCampaign>> {
    return this.client.patch(
      `/ads/campaigns/${encodeURIComponent(String(id))}`,
      params,
      MONEY_CALL
    );
  }

  /**
   * `POST /ads/campaigns/{id}/activate` - START REAL AD SPEND.
   * Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Show the person the budget (amount, currency, daily or
   * lifetime) and get their yes first;
   * `confirmBudgetAmount` must equal the campaign's budget amount. A
   * campaign of a draft group answers `409 use_draft_launch`: use
   * `ads.drafts.launch()`. Not retried after a 5xx or a timeout: read the
   * campaign with `get()`. Requires `ads:write`.
   */
  activate(id: number | string, confirmBudgetAmount: number): Promise<ItemResponse<AdCampaign>> {
    return this.client.post(
      `/ads/campaigns/${encodeURIComponent(String(id))}/activate`,
      { confirm_budget_amount: confirmBudgetAmount },
      MONEY_CALL
    );
  }

  /**
   * `POST /ads/campaigns/activate-multi` - START REAL AD SPEND on up to 10
   * campaigns. Needs a key with `ads:spend`: without it, and on Google
   * always, a result answers `ok: false` with `code` `start_in_app` and the
   * page where a person starts it. Every campaign's budget must equal
   * `confirmBudgetAmount`; show the person the total (amount x campaigns)
   * first. Answers `{ results }`. Not
   * retried after a 5xx or a timeout. Requires `ads:write`.
   */
  activateMulti(
    campaignIds: (number | string)[],
    confirmBudgetAmount: number
  ): Promise<AdMultiResponse<AdMultiActivateResult>> {
    return this.client.post(
      "/ads/campaigns/activate-multi",
      { campaign_ids: campaignIds, confirm_budget_amount: confirmBudgetAmount },
      MONEY_CALL
    );
  }

  /**
   * `POST /ads/campaigns/{id}/pause` - pause a campaign (also while in
   * review). Open through the API, except on the networks in
   * `api_stop_in_app` (Google): there a campaign that reached the network
   * answers `403 start_in_app`. Requires `ads:write`.
   */
  pause(id: number | string): Promise<ItemResponse<AdCampaign>> {
    return this.client.post(`/ads/campaigns/${encodeURIComponent(String(id))}/pause`);
  }

  /**
   * `POST /ads/campaigns/{id}/resume` - resume a paused campaign; it spends
   * again. Needs a key with the opt-in `ads:spend` scope ("Start ads"); without it,
   * and on Google (`api_draft_only`) always, the call answers
   * `403 start_in_app` with the page where a person does it in the app. Only a paused campaign resumes
   * (`409 not_paused`). Not retried after a 5xx or a
   * timeout. Requires `ads:write`.
   */
  resume(id: number | string): Promise<ItemResponse<AdCampaign>> {
    return this.client.post(
      `/ads/campaigns/${encodeURIComponent(String(id))}/resume`,
      undefined,
      MONEY_CALL
    );
  }

  /**
   * `POST /ads/campaigns/bulk-status` - pause or resume up to 50 campaigns.
   * Pausing needs nothing. Resuming RESTARTS REAL AD SPEND: every
   * campaign's budget must equal `confirm_budget_amount` (one amount for
   * all), checked before any change; show the person the total first.
   * Resuming needs a key with `ads:spend`: without it, and on Google always,
   * a result answers `start_in_app`. Answers `{ data: { results } }`. Not retried after a 5xx or a timeout.
   * Requires `ads:write`.
   */
  bulkStatus(params: BulkAdCampaignStatusParams): Promise<ItemResponse<{ results: AdBulkStatusResult[] }>> {
    return this.client.post("/ads/campaigns/bulk-status", params, MONEY_CALL);
  }

  /**
   * `POST /ads/campaigns/{id}/duplicate` - copy a campaign as a new draft
   * (same ad account, goal, budget, targeting, settings and ads). A draft
   * never spends. Requires `ads:write`.
   */
  duplicate(id: number | string, params: DuplicateAdCampaignParams = {}): Promise<ItemResponse<AdCampaign>> {
    return this.client.post(`/ads/campaigns/${encodeURIComponent(String(id))}/duplicate`, params);
  }

  /**
   * `DELETE /ads/campaigns/{id}` - delete a campaign on the network too. A
   * campaign that spent is archived: its spend stays in the totals. Open
   * through the API, except a campaign that reached the network on a
   * network in `api_stop_in_app` (Google): `403 start_in_app`. Requires
   * `ads:write`.
   */
  delete(id: number | string): Promise<ItemResponse<{ deleted: boolean }>> {
    return this.client.delete(`/ads/campaigns/${encodeURIComponent(String(id))}`);
  }

  /**
   * `GET /ads/overview` - accounts, campaigns per status and the totals.
   * `totals.spend` is `null` when the campaigns use more than one currency:
   * read `totals_by_currency` then (spend is never added across
   * currencies). Requires `ads:read`.
   */
  overview(): Promise<ItemResponse<AdsOverview>> {
    return this.client.get("/ads/overview");
  }

  /**
   * `GET /ads/suggestions` - organic posts that do better than the
   * workspace median: boost candidates. Read-only. Requires `ads:read`.
   */
  suggestions(): Promise<ListResponse<BoostSuggestion>> {
    return this.client.get("/ads/suggestions");
  }

  /**
   * `POST /ads/research/keywords` - keyword ideas from seed keywords or a
   * URL, through the connected Google Ads account. Read-only and free.
   * Requires `ads:read`.
   */
  researchKeywords(params: KeywordResearchParams): Promise<ItemResponse<KeywordResearchResult>> {
    return this.client.post("/ads/research/keywords", params);
  }

  /**
   * `POST /ads/research/keywords/metrics` - search numbers for an exact
   * keyword list. Read-only. Requires `ads:read`.
   */
  keywordMetrics(params: KeywordMetricsParams): Promise<ItemResponse<KeywordMetricsResult>> {
    return this.client.post("/ads/research/keywords/metrics", params);
  }
}
