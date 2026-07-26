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
  posts: ["list", "get", "recentPlatform", "create", "createAndPublish", "update", "delete", "publish"],
  media: ["list", "get", "upload", "uploadFromUrl", "uploadFromBase64", "createUploadUrl", "check", "update", "delete"],
  folders: ["list", "create", "update", "delete"],
  hashtagSets: ["list", "get", "create", "update", "delete"],
  accounts: ["list", "get"],
  analytics: ["post", "posts", "overview", "accounts", "bestTimes"],
  locations: ["search", "validate"],
  webhooks: ["list", "get", "create", "update", "delete", "rotateSecret"],
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

// Error hierarchy sanity.
const rl = new RateLimitError({ status: 429, code: "rate_limit_exceeded", message: "slow down", retryAfter: 45 });
assert.ok(rl instanceof APIError && rl instanceof OmniSocialsError);
assert.equal(rl.retryAfter, 45);
assert.equal(rl.status, 429);

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
console.log("- ESM import OK, client + 8 resources expose all inventory methods");
console.log("- Webhook signature: accepts valid, rejects tampered/stale/wrong-secret/malformed");
console.log("- CJS require() OK (dual build works)");
