import type { OmniSocials } from "../client.js";
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
  CreateAdCampaignParams,
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

/**
 * "Create an ad" drafts: one campaign per network in `platforms`, each with
 * the same ads. A draft never spends; `launch()` starts it.
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
   * the dashboard) and per network `readiness`. Requires `ads:write`.
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
   * network of the draft that never started. Show the person the daily
   * amount per network and get their yes first, then pass it as
   * `confirm_budget_amount` (or per campaign as `confirm_budget_amounts`).
   * A wrong or missing amount answers `400 budget_confirmation_required`
   * and writes nothing. Per network results; one failed network never stops
   * the others. Not retried after a 5xx or a timeout: read the draft with
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

export class AdsResource {
  /** "Create an ad" drafts. */
  readonly drafts: AdDraftsResource;

  constructor(private readonly client: OmniSocials) {
    this.drafts = new AdDraftsResource(client);
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
   * `coming_soon`). Requires `ads:read`.
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
   * `POST /ads/boost` - boost a published post. Creates a DRAFT boost: no
   * spend until `activate()`. TikTok needs `creative.spark_auth_code`,
   * Google needs `headlines`, `descriptions` and `logo_url`. Requires
   * `ads:write`.
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
   * `POST /ads/campaigns` - a DRAFT campaign without ads. It cannot start
   * (`campaign_has_no_ads`): use `ads.drafts.create()` for a new ad.
   * Requires `ads:write`.
   */
  create(params: CreateAdCampaignParams): Promise<ItemResponse<AdCampaign>> {
    return this.client.post("/ads/campaigns", params);
  }

  /**
   * `PATCH /ads/campaigns/{id}` - change the name, budget, targeting or
   * schedule. To RAISE the budget of a running campaign, pass the new amount
   * again as `confirm_budget_amount` after the person agreed to it. Not
   * retried after a 5xx or a timeout. Requires `ads:write`.
   */
  update(id: number | string, params: UpdateAdCampaignParams): Promise<ItemResponse<AdCampaign>> {
    return this.client.patch(
      `/ads/campaigns/${encodeURIComponent(String(id))}`,
      params,
      MONEY_CALL
    );
  }

  /**
   * `POST /ads/campaigns/{id}/activate` - START REAL AD SPEND. Show the
   * person the budget (amount, currency, daily or lifetime) and get their
   * yes first; `confirmBudgetAmount` must equal the campaign's budget
   * amount. A campaign of a draft group answers `409 use_draft_launch`: use
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
   * campaigns. Every campaign's budget must equal `confirmBudgetAmount`;
   * show the person the total (amount x campaigns) first. Answers
   * `{ results }`. Not retried after a 5xx or a timeout. Requires
   * `ads:write`.
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

  /** `POST /ads/campaigns/{id}/pause` - pause a campaign (also while in review). Requires `ads:write`. */
  pause(id: number | string): Promise<ItemResponse<AdCampaign>> {
    return this.client.post(`/ads/campaigns/${encodeURIComponent(String(id))}/pause`);
  }

  /**
   * `POST /ads/campaigns/{id}/resume` - resume a paused campaign; it spends
   * again. Not retried after a 5xx or a timeout. Requires `ads:write`.
   */
  resume(id: number | string): Promise<ItemResponse<AdCampaign>> {
    return this.client.post(
      `/ads/campaigns/${encodeURIComponent(String(id))}/resume`,
      undefined,
      MONEY_CALL
    );
  }

  /**
   * `DELETE /ads/campaigns/{id}` - delete a campaign on the network too. A
   * campaign that spent is archived: its spend stays in the totals.
   * Requires `ads:write`.
   */
  delete(id: number | string): Promise<ItemResponse<{ deleted: boolean }>> {
    return this.client.delete(`/ads/campaigns/${encodeURIComponent(String(id))}`);
  }

  /** `GET /ads/overview` - accounts, campaigns per status and total spend. Requires `ads:read`. */
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
