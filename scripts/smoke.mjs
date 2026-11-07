/**
 * Smoke test for the built SDK. Run `npm run build` first, then:
 *   node scripts/smoke.mjs
 *
 * Verifies: ESM import, client construction, resource method surface,
 * webhook signature round-trip (same scheme as backend webhookDispatcher.js),
 * and that the CJS build loads via require().
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

// ─── ESM import ───────────────────────────────────────────────────────────────
const esm = await import("../dist/esm/index.js");
const {
  OmniSocials,
  verifyWebhookSignature,
  AuthenticationError,
  WebhookVerificationError,
  RateLimitError,
  APIError,
  OmniSocialsError,
  VERSION,
} = esm;

// Structural version check: the constant must match the manifest, so this
// script never needs stamping on release (scripts/set-version.mjs syncs both).
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
assert.equal(VERSION, pkg.version, "VERSION constant should match package.json");
assert.match(VERSION, /^\d+\.\d+\.\d+/, "VERSION should be semver");

// Missing key throws AuthenticationError at construction time.
const savedEnvKey = process.env.OMNISOCIALS_API_KEY;
delete process.env.OMNISOCIALS_API_KEY;
assert.throws(() => new OmniSocials(), AuthenticationError);
if (savedEnvKey !== undefined) process.env.OMNISOCIALS_API_KEY = savedEnvKey;

// Construct with a fake key.
const client = new OmniSocials({ apiKey: "omsk_test_fake", maxRetries: 0 });
assert.equal(client.baseUrl, "https://api.omnisocials.com/v1");
assert.equal(client.timeout, 30000);

// Resource method surface (every endpoint in the DESIGN.md inventory).
const surface = {
  posts: ["list", "get", "recentPlatform", "create", "createAndPublish", "update", "delete", "publish", "approve", "reject", "getApproval"],
  media: ["list", "get", "upload", "uploadFromUrl", "uploadFromBase64", "createUploadUrl", "check", "update", "delete"],
  folders: ["list", "create", "update", "delete"],
  hashtagSets: ["list", "get", "create", "update", "delete"],
  tags: ["list", "create", "update", "delete", "apply"],
  accounts: ["list", "get"],
  analytics: ["post", "posts", "overview", "accounts", "bestTimes", "tags"],
  locations: ["search", "validate"],
  pinterest: ["listProducts", "validateProduct"],
  automations: ["list", "get", "create", "update", "delete", "listEvents"],
  ads: ["listAccounts", "capabilities", "list", "get", "boost", "boostMulti", "update", "activate", "activateMulti", "pause", "resume", "delete", "overview", "suggestions", "researchKeywords", "keywordMetrics"],
  webhooks: ["list", "get", "create", "update", "delete", "rotateSecret"],
  limits: ["list"],
  featureRequests: ["create", "list", "get"],
};
for (const [resource, methods] of Object.entries(surface)) {
  assert.ok(client[resource], `client.${resource} missing`);
  for (const method of methods) {
    assert.equal(
      typeof client[resource][method],
      "function",
      `client.${resource}.${method} is not a function`
    );
  }
}
assert.equal(typeof client.health, "function", "client.health missing");
for (const method of ["defaults", "create", "get", "update", "delete", "attachAccount", "launch"]) {
  assert.equal(typeof client.ads.drafts[method], "function", `client.ads.drafts.${method} is not a function`);
}
// POST /ads/campaigns is gone (campaigns without ads could never start).
assert.equal(client.ads.create, undefined, "client.ads.create was removed");

// Ads API parity sub-resources (2026-11-05): one method per route of adsParity.js.
const adsSurface = {
  objects: ["tree", "get", "update", "setStatus", "duplicate", "importStatus", "startImport", "listExternal", "getExternal"],
  campaignAds: ["list", "add", "get", "setStatus", "review"],
  comments: ["list", "reply", "hide", "delete"],
  targeting: ["search", "browse", "reachEstimate", "bidSuggestions"],
  audiences: ["list", "create", "get", "update", "delete", "addMembers", "removeMembers", "addCompanies"],
  leadForms: ["list", "create", "get", "update", "delete", "sendTestLead"],
  leads: ["list", "counts", "update"],
  conversions: ["destinations", "goals", "createCustom", "sendEvents"],
  insights: ["query", "campaign", "ad", "timeline", "performance", "alerts"],
  reports: ["list", "start", "get"],
  rules: ["list", "create", "templates", "preview", "activity", "undo", "get", "update", "delete", "previewSaved", "runs"],
  results: ["list", "upload", "totals", "metrics", "putMetric"],
  media: ["list", "upload", "get", "delete"],
  previews: ["create", "forAd"],
  partnership: ["listContent", "listPermissions", "setPermission"],
  accounts: ["identities", "health", "finance", "updateSettings", "listUsers", "addUser", "removeUser", "activity", "businesses", "dsa", "hierarchy"],
  reachFrequency: ["create", "get", "cancel", "reserve"],
  studies: ["list", "create"],
  budgetSchedules: ["list", "create", "delete"],
  google: ["searchTerms", "recommendations", "keywords", "assets", "sharedBudgets", "bidStrategies", "adSchedule", "labels", "localServicesLeads"],
};
let adsMethodCount = 0;
for (const [sub, methods] of Object.entries(adsSurface)) {
  assert.ok(client.ads[sub], `client.ads.${sub} missing`);
  for (const method of methods) {
    assert.equal(typeof client.ads[sub][method], "function", `client.ads.${sub}.${method} is not a function`);
    adsMethodCount += 1;
  }
}
for (const method of ["bulkStatus", "duplicate"]) {
  assert.equal(typeof client.ads[method], "function", `client.ads.${method} is not a function`);
  adsMethodCount += 1;
}
assert.equal(adsMethodCount, 108, "every route of adsParity.js has one method");

// ─── Ads money calls are never sent twice ─────────────────────────────────────
// A launch or activation that answered 5xx may have started spend, so it is
// not retried; a plain read is. Uses a stub fetch, no network.
{
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method, body: init.body });
    return new Response(JSON.stringify({ error: { code: "bad_gateway", message: "upstream" } }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const money = new OmniSocials({ apiKey: "omsk_live_smoke", maxRetries: 2 });
    await assert.rejects(money.ads.drafts.launch("g-1", { confirm_budget_amount: 10 }));
    assert.equal(calls.length, 1, "a launch must not be retried after a 502");
    assert.equal(calls[0].method, "POST");
    assert.match(calls[0].url, /\/ads\/drafts\/g-1\/launch$/);
    assert.deepEqual(JSON.parse(calls[0].body), { confirm_budget_amount: 10 });

    calls.length = 0;
    await assert.rejects(money.ads.activate(7, 25));
    assert.equal(calls.length, 1, "an activation must not be retried after a 502");
    assert.deepEqual(JSON.parse(calls[0].body), { confirm_budget_amount: 25 });

    // Every parity call that can start or raise spend is sent once after a 502.
    const parityMoney = {
      "objects.update": [() => money.ads.objects.update(3, "ad_set", "238", { budget: { amount: 40, currency: "EUR" }, confirm_budget_amount: 40 }), "PATCH", /\/ads\/accounts\/3\/objects\/ad_set\/238$/],
      "objects.setStatus": [() => money.ads.objects.setStatus(3, "campaign", "120", { status: "active", confirm_budget_amount: 20 }), "PUT", /\/ads\/accounts\/3\/objects\/campaign\/120\/status$/],
      bulkStatus: [() => money.ads.bulkStatus({ campaign_ids: [7, 8], status: "active", confirm_budget_amount: 25 }), "POST", /\/ads\/campaigns\/bulk-status$/],
      "campaignAds.setStatus": [() => money.ads.campaignAds.setStatus(7, 51, { status: "active", confirm_budget_amount: 25 }), "PUT", /\/ads\/campaigns\/7\/ads\/51\/status$/],
      "rules.create": [() => money.ads.rules.create({ name: "Scale winners", conditions: [{ metric: "ctr", op: "gt", value: 2 }], action: { type: "adjust_budget", percent: 20, max_daily_budget: 50 }, confirm_max_daily_budget: 50 }), "POST", /\/ads\/rules$/],
      "rules.update": [() => money.ads.rules.update(4, { enabled: true }), "PATCH", /\/ads\/rules\/4$/],
      "rules.undo": [() => money.ads.rules.undo(9, { confirm_budget_amount: 25 }), "POST", /\/ads\/rules\/activity\/9\/undo$/],
      "accounts.updateSettings": [() => money.ads.accounts.updateSettings(3, { spend_cap: 500, confirm_budget_amount: 500 }), "PATCH", /\/ads\/accounts\/3\/settings$/],
      "reachFrequency.reserve": [() => money.ads.reachFrequency.reserve("rf 1", { ad_account_id: 3, confirm_budget_amount: 1000 }), "POST", /\/ads\/reach-frequency\/rf%201\/reserve$/],
      "budgetSchedules.create": [() => money.ads.budgetSchedules.create(7, { start_at: "2026-11-27T00:00:00Z", end_at: "2026-11-30T00:00:00Z", budget_increase: { type: "absolute", value: 30 }, confirm_budget_amount: 30 }), "POST", /\/ads\/campaigns\/7\/budget-schedules$/],
    };
    for (const [name, [call, method, path]] of Object.entries(parityMoney)) {
      calls.length = 0;
      await assert.rejects(call());
      assert.equal(calls.length, 1, `ads.${name} must not be retried after a 502`);
      assert.equal(calls[0].method, method, `ads.${name} sends ${method}`);
      assert.match(calls[0].url, path, `ads.${name} path`);
    }

    calls.length = 0;
    await assert.rejects(money.ads.drafts.update("g-1", { objective: "traffic", platforms: ["meta"], budget: { amount: 10, currency: "EUR" }, targeting: { countries: ["NL"] }, ads: [] }));
    assert.equal(calls[0].method, "PUT");

    calls.length = 0;
    const fast = new OmniSocials({ apiKey: "omsk_live_smoke", maxRetries: 1, timeout: 1000 });
    const origBackoff = fast.backoffMs;
    fast.backoffMs = () => 0;
    await assert.rejects(fast.ads.capabilities());
    assert.equal(calls.length, 2, "a read is retried after a 502");

    calls.length = 0;
    await assert.rejects(fast.ads.objects.tree(3, { status: ["active", "paused"], limit: 10 }));
    assert.equal(calls.length, 2, "a parity read is retried after a 502");
    assert.match(calls[0].url, /\/ads\/accounts\/3\/tree\?status=active%2Cpaused&limit=10$/);
    calls.length = 0;
    await assert.rejects(fast.ads.audiences.removeMembers("aud-1", { ad_account_id: 3, schema: ["email"], rows: [["fake-hash-1"]] }));
    assert.equal(calls[0].method, "DELETE");
    assert.deepEqual(JSON.parse(calls[0].body), { ad_account_id: 3, schema: ["email"], rows: [["fake-hash-1"]] });
    calls.length = 0;
    await assert.rejects(fast.ads.media.delete("v 9", { ad_account_id: 3, type: "video" }));
    assert.match(calls[0].url, /\/ads\/media\/v%209\?ad_account_id=3&type=video$/);
    assert.equal(calls[0].body, undefined);
    fast.backoffMs = origBackoff;
  } finally {
    globalThis.fetch = realFetch;
  }
}

// Error hierarchy sanity.
const rl = new RateLimitError({ status: 429, code: "rate_limit_exceeded", message: "slow down", retryAfter: 45 });
assert.ok(rl instanceof APIError && rl instanceof OmniSocialsError);
assert.equal(rl.retryAfter, 45);
assert.equal(rl.status, 429);

// ─── Post tags: method, path, query and body ──────────────────────────────────
{
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(String(url)), method: init.method, body: init.body });
    return new Response(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const tagged = new OmniSocials({ apiKey: "omsk_live_smoke", maxRetries: 0 });
    const last = () => calls[calls.length - 1];

    await tagged.tags.list();
    assert.equal(last().method, "GET");
    assert.equal(last().url.pathname, "/v1/tags");

    await tagged.tags.create({ name: "Question", color: "blue" });
    assert.equal(last().method, "POST");
    assert.equal(last().url.pathname, "/v1/tags");
    assert.deepEqual(JSON.parse(last().body), { name: "Question", color: "blue" });

    await tagged.tags.update(12, { name: "Questions" });
    assert.equal(last().method, "PATCH");
    assert.equal(last().url.pathname, "/v1/tags/12");
    assert.deepEqual(JSON.parse(last().body), { name: "Questions" });

    await tagged.tags.delete(12);
    assert.equal(last().method, "DELETE");
    assert.equal(last().url.pathname, "/v1/tags/12");

    await tagged.tags.apply({ post_ids: ["1024", "1025"], add: ["Question", 7], set: undefined });
    assert.equal(last().method, "POST");
    assert.equal(last().url.pathname, "/v1/tags/apply");
    assert.deepEqual(JSON.parse(last().body), { post_ids: ["1024", "1025"], add: ["Question", 7] });

    await tagged.analytics.tags({ start_date: "2026-08-01", platform: "tiktok", min_posts: 3 });
    assert.equal(last().url.pathname, "/v1/analytics/tags");
    assert.equal(last().url.searchParams.get("start_date"), "2026-08-01");
    assert.equal(last().url.searchParams.get("platform"), "tiktok");
    assert.equal(last().url.searchParams.get("min_posts"), "3");
    assert.equal(last().url.searchParams.has("end_date"), false);

    await tagged.posts.list({ tag: ["Question", 7] });
    assert.equal(last().url.pathname, "/v1/posts");
    assert.equal(last().url.searchParams.get("tag"), "Question,7");

    await tagged.analytics.overview({ period: "30d", tag: "Question" });
    assert.equal(last().url.pathname, "/v1/analytics/overview");
    assert.equal(last().url.searchParams.get("tag"), "Question");

    await tagged.posts.update("1024", { tags: null });
    assert.equal(last().method, "PATCH");
    assert.deepEqual(JSON.parse(last().body), { tags: null });

    await tagged.posts.create({ content: "Hi", channels: ["instagram"], tags: ["Question"] });
    assert.deepEqual(JSON.parse(last().body).tags, ["Question"]);
  } finally {
    globalThis.fetch = realFetch;
  }
}

// ─── Approve and reject: step_order only when given ───────────────────────────
{
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(String(url)), method: init.method, body: init.body });
    const body = init.body ? JSON.parse(init.body) : null;
    if (body?.step_order === 1) {
      return new Response(
        JSON.stringify({ error: { code: "step_changed", message: "The review is on step 2 now.", current_step_order: 2 } }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ data: { id: "1024" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const rv = new OmniSocials({ apiKey: "omsk_live_smoke", maxRetries: 0 });
    const last = () => calls[calls.length - 1];

    await rv.posts.approve("1024");
    assert.equal(last().method, "POST");
    assert.equal(last().url.pathname, "/v1/posts/1024/approve");
    assert.equal(last().body, undefined, "approve without step_order sends no body");

    await rv.posts.approve("1024", { step_order: 2 });
    assert.deepEqual(JSON.parse(last().body), { step_order: 2 });

    await rv.posts.reject("1024");
    assert.equal(last().url.pathname, "/v1/posts/1024/reject");
    assert.equal(last().body, undefined, "reject without options sends no body");

    await rv.posts.reject("1024", "Wrong CTA link");
    assert.deepEqual(JSON.parse(last().body), { comment: "Wrong CTA link" }, "reject(id, comment) still works");

    await rv.posts.reject("1024", { comment: "Wrong CTA link", step_order: 2 });
    assert.deepEqual(JSON.parse(last().body), { comment: "Wrong CTA link", step_order: 2 });

    await rv.posts.reject("1024", { step_order: 3 });
    assert.deepEqual(JSON.parse(last().body), { step_order: 3 });

    await assert.rejects(rv.posts.approve("1024", { step_order: 1 }), (err) => {
      assert.ok(err instanceof APIError);
      assert.equal(err.status, 409);
      assert.equal(err.code, "step_changed");
      assert.equal(err.body.error.current_step_order, 2);
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
}

// ─── Limits and feature requests: method, path, query, body, outcome ─────────
{
  const realFetch = globalThis.fetch;
  const calls = [];
  const limit = {
    id: "tiktok.delete",
    kind: "platform",
    kind_label: "The platform does not allow it",
    area: "posts",
    platforms: ["tiktok"],
    title: "Delete a TikTok video",
    says: "TikTok's API cannot delete a video.",
    instead: "Delete the video in the TikTok app.",
    requestable: false,
  };
  const request = {
    id: 412,
    title: "Post to a topic of a Telegram group",
    summary: "Post our daily update to the Announcements topic of our Telegram group.",
    status: "open",
    team_answer: null,
    team_replies: [],
    votes_count: 1,
    limit_id: "telegram.forum_topics",
    platform: "telegram",
    area: "posts",
    source: "api",
    created_at: "2026-11-04T10:00:00.000Z",
    updated_at: "2026-11-04T10:00:00.000Z",
    completed_at: null,
  };
  const json = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  globalThis.fetch = async (url, init) => {
    const call = { url: new URL(String(url)), method: init.method, body: init.body };
    calls.push(call);
    const body = init.body ? JSON.parse(init.body) : null;
    if (call.url.pathname === "/v1/limits") {
      return json(200, { data: [limit], kinds: { platform: "The platform does not allow it" } });
    }
    if (call.method === "POST" && body?.limit_id === "tiktok.delete") {
      return json(409, {
        error: { code: "not_requestable", message: "TikTok's API cannot delete a video. A request cannot change this, so nothing was sent.", limit },
      });
    }
    if (call.method === "POST" && body?.summary?.startsWith("Again")) {
      return json(200, { outcome: "already_requested", data: request });
    }
    if (call.method === "POST") return json(201, { outcome: "voted", data: request });
    if (call.url.pathname === "/v1/feature-requests") return json(200, { data: [request] });
    return json(200, { data: request });
  };
  try {
    const fr = new OmniSocials({ apiKey: "omsk_live_smoke", maxRetries: 0 });
    const last = () => calls[calls.length - 1];

    const limits = await fr.limits.list({ platform: "tiktok", area: "posts" });
    assert.equal(last().method, "GET");
    assert.equal(last().url.pathname, "/v1/limits");
    assert.equal(last().url.searchParams.get("platform"), "tiktok");
    assert.equal(last().url.searchParams.get("area"), "posts");
    assert.equal(limits.data[0].requestable, false);
    assert.equal(limits.kinds.platform, "The platform does not allow it");

    await fr.limits.list();
    assert.equal(last().url.search, "", "limits.list() without params sends no query");

    const voted = await fr.featureRequests.create({
      summary: "Post our daily update to the Announcements topic of our Telegram group.",
      platform: "telegram",
      limit_id: "telegram.forum_topics",
    });
    assert.equal(last().method, "POST");
    assert.equal(last().url.pathname, "/v1/feature-requests");
    assert.deepEqual(JSON.parse(last().body), {
      summary: "Post our daily update to the Announcements topic of our Telegram group.",
      platform: "telegram",
      limit_id: "telegram.forum_topics",
    });
    assert.equal("source" in JSON.parse(last().body), false, "the SDK never sets source");
    assert.equal(voted.outcome, "voted");
    assert.equal(voted.data.id, 412);

    const again = await fr.featureRequests.create({ summary: "Again: post to a Telegram topic, please." });
    assert.equal(again.outcome, "already_requested", "a 200 keeps the outcome");

    await assert.rejects(
      fr.featureRequests.create({ summary: "Delete my TikTok videos from OmniSocials.", limit_id: "tiktok.delete" }),
      (err) => {
        assert.ok(err instanceof APIError);
        assert.equal(err.status, 409);
        assert.equal(err.code, "not_requestable");
        assert.equal(err.body.error.limit.instead, "Delete the video in the TikTok app.");
        return true;
      }
    );

    const mine = await fr.featureRequests.list();
    assert.equal(last().method, "GET");
    assert.equal(last().url.pathname, "/v1/feature-requests");
    assert.equal(mine.data[0].status, "open");

    const one = await fr.featureRequests.get(412);
    assert.equal(last().url.pathname, "/v1/feature-requests/412");
    assert.equal(one.data.limit_id, "telegram.forum_topics");
  } finally {
    globalThis.fetch = realFetch;
  }
}

// ─── Webhook signature round-trip ─────────────────────────────────────────────
// Generate a signature exactly like backend/services/webhooks/webhookDispatcher.js:
// signed value `${timestamp}.${rawBody}`, HMAC-SHA256 hex, header `t=<ts>,v1=<hex>`.
const secret = "whsec_smoke_test_secret";
const eventObject = {
  id: "3f1c9a2e-0000-4000-8000-000000000000",
  type: "post.published",
  created_at: new Date().toISOString(),
  data: {
    post_id: "12345",
    workspace_id: 42,
    status: "posted",
    post_type: "post",
    scheduled_at: null,
    published_at: new Date().toISOString(),
    targets: [{ platform: "instagram", status: "success", native_post_id: "1789" }],
  },
};
const rawBody = JSON.stringify(eventObject);
const timestamp = Math.floor(Date.now() / 1000);

function sign(ts, body) {
  const hmac = createHmac("sha256", secret).update(`${ts}.${body}`, "utf8").digest("hex");
  return `t=${ts},v1=${hmac}`;
}

// 1. Valid signature is accepted and returns the parsed event.
const verified = verifyWebhookSignature({
  payload: rawBody,
  signature: sign(timestamp, rawBody),
  secret,
});
assert.deepEqual(verified, eventObject);
assert.equal(verified.data.targets[0].platform, "instagram");

// Also accepts the payload as bytes (raw Buffer, like express.raw()).
const verifiedFromBuffer = verifyWebhookSignature({
  payload: Buffer.from(rawBody, "utf8"),
  signature: sign(timestamp, rawBody),
  secret,
});
assert.deepEqual(verifiedFromBuffer, eventObject);

// 2. Tampered body is rejected.
const tampered = rawBody.replace("post.published", "post.failed");
assert.throws(
  () => verifyWebhookSignature({ payload: tampered, signature: sign(timestamp, rawBody), secret }),
  WebhookVerificationError,
  "tampered body must be rejected"
);

// 3. Stale timestamp is rejected (signature itself is valid).
const staleTs = timestamp - 3600; // 1 hour old, default tolerance is 300s
assert.throws(
  () => verifyWebhookSignature({ payload: rawBody, signature: sign(staleTs, rawBody), secret }),
  WebhookVerificationError,
  "stale timestamp must be rejected"
);

// ...but accepted when tolerance is widened.
const staleOk = verifyWebhookSignature({
  payload: rawBody,
  signature: sign(staleTs, rawBody),
  secret,
  tolerance: 7200,
});
assert.equal(staleOk.type, "post.published");

// A post.rejected delivery keeps its `approval` object.
const rejectedBody = JSON.stringify({
  id: "e7c9a1b2-3d4e-4f6a-8b8c-9d0e1f2a3b4c",
  type: "post.rejected",
  created_at: new Date().toISOString(),
  data: {
    post_id: "123456",
    workspace_id: 789,
    status: "rejected",
    post_type: "Post",
    scheduled_at: "2026-10-03T14:00:00.000Z",
    published_at: null,
    targets: [],
    approval: { status: "rejected", decided_by: "c4a09e1d", reason: "Wrong product photo" },
  },
});
const rejectedEvent = verifyWebhookSignature({
  payload: rejectedBody,
  signature: sign(timestamp, rejectedBody),
  secret,
});
assert.equal(rejectedEvent.type, "post.rejected");
assert.equal(rejectedEvent.data.approval.status, "rejected");
assert.equal(rejectedEvent.data.approval.reason, "Wrong product photo");
assert.deepEqual(rejectedEvent.data.targets, []);

// Secret rotation: for 24 hours a delivery also carries
// X-OmniSocials-Signature-Previous, the same scheme signed with the OLD secret.
// The new secret fails on it; the old secret verifies it.
{
  const oldSecret = "whsec_smoke_old_secret";
  const previousHeader = `t=${timestamp},v1=${createHmac("sha256", oldSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
  const currentHeader = sign(timestamp, rawBody); // signed with the new `secret`
  assert.throws(
    () => verifyWebhookSignature({ payload: rawBody, signature: currentHeader, secret: oldSecret }),
    WebhookVerificationError,
    "the old secret does not verify the new signature"
  );
  assert.throws(
    () => verifyWebhookSignature({ payload: rawBody, signature: previousHeader, secret }),
    WebhookVerificationError,
    "the new secret does not verify the Previous header"
  );
  const viaPrevious = verifyWebhookSignature({ payload: rawBody, signature: previousHeader, secret: oldSecret });
  assert.deepEqual(viaPrevious, eventObject, "the Previous header verifies with the old secret");
}

// 4. Wrong secret is rejected.
assert.throws(
  () => verifyWebhookSignature({ payload: rawBody, signature: sign(timestamp, rawBody), secret: "whsec_wrong" }),
  WebhookVerificationError
);

// 5. Malformed header is rejected.
assert.throws(
  () => verifyWebhookSignature({ payload: rawBody, signature: "not-a-signature", secret }),
  WebhookVerificationError
);

// ─── CJS build via require() ──────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const cjs = require("../dist/cjs/index.js");
assert.equal(typeof cjs.OmniSocials, "function", "CJS OmniSocials export missing");
assert.equal(typeof cjs.verifyWebhookSignature, "function", "CJS verifyWebhookSignature missing");
const cjsClient = new cjs.OmniSocials({ apiKey: "omsk_test_fake" });
assert.equal(typeof cjsClient.posts.create, "function");
const cjsVerified = cjs.verifyWebhookSignature({
  payload: rawBody,
  signature: sign(timestamp, rawBody),
  secret,
});
assert.equal(cjsVerified.id, eventObject.id);

console.log("All smoke tests passed.");
console.log("- ESM import OK, client + 11 resources expose all inventory methods, 108 ads parity methods (ads money calls not retried)");
console.log("- posts.approve / reject send step_order only when given; step_changed keeps current_step_order");
console.log("- Webhook signature: accepts valid, rejects tampered/stale/wrong-secret/malformed; Previous header verifies with the old secret");
console.log("- CJS require() OK (dual build works)");
