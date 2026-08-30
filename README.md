# OmniSocials Node.js SDK

The official Node.js / TypeScript client for the [OmniSocials API](https://docs.omnisocials.com). Schedule and publish posts to Instagram, Facebook, LinkedIn, YouTube, TikTok, X, Pinterest, Bluesky, Threads, Mastodon, and Google Business from one API.

- Zero runtime dependencies, built on native `fetch` (Node >= 18)
- Full TypeScript types for every request and response
- Automatic retries with exponential backoff, configurable timeouts
- Rich error classes and a webhook signature verification helper
- Ships both ESM and CommonJS builds

## Installation

```bash
npm install @omnisocials/sdk
```

## Quickstart

```ts
import { OmniSocials } from "@omnisocials/sdk";

const client = new OmniSocials(); // reads OMNISOCIALS_API_KEY from env
const post = await client.posts.create({
  content: "Hello from the SDK",
  channels: ["instagram", "linkedin"],
  scheduled_at: "2026-08-01T09:00:00Z",
});
```

## Authentication

Create an API key in the OmniSocials app under **Settings -> API Keys**. Keys look like `omsk_live_...` (or `omsk_test_...`).

The client reads `OMNISOCIALS_API_KEY` from the environment, or you can pass it explicitly:

```ts
const client = new OmniSocials({ apiKey: "omsk_live_..." });
```

Constructing a client without a key throws an `AuthenticationError` right away.

## Configuration

```ts
const client = new OmniSocials({
  apiKey: "omsk_live_...",
  baseUrl: "https://api.omnisocials.com/v1", // default
  timeout: 30_000,   // per-request timeout in ms (default 30s)
  maxRetries: 2,     // automatic retries on 429 / 5xx / network errors (default 2)
});
```

Retries use exponential backoff (0.5s, 1s, 2s, ...) with jitter and honor the `Retry-After` header. Other 4xx responses are never retried.

## Rate limits

The API allows **100 requests per minute** per API key. When you exceed it, the SDK retries automatically (respecting `Retry-After`); if retries are exhausted it throws a `RateLimitError` whose `retryAfter` property holds the seconds to wait.

## Return values

Methods return the parsed response body as-is: single items come back as `{ data: {...} }`, lists as `{ data: [...], pagination: {...} }`, and some responses carry extra sibling keys (media uploads include `compatibility`, PDF uploads include `slides` and `media_ids`, post creates targeting X with a URL in the text include `warnings`). Endpoints that respond `204 No Content` (deletes) resolve to `null`.

## Posts

### Schedule a post

```ts
const { data: post } = await client.posts.create({
  content: "New drop this Friday",
  channels: ["instagram", "facebook", "linkedin"],
  scheduled_at: "2026-08-01T09:00:00Z",
  media_urls: ["https://example.com/teaser.jpg"],
});
console.log(post.id, post.status);
```

Omit `scheduled_at` to create a draft. Use `content` as an object for per-platform captions:

```ts
await client.posts.create({
  content: {
    default: "New drop this Friday",
    x: "New drop this Friday. RT to spread the word",
  },
  channels: ["instagram", "x"],
  scheduled_at: "2026-08-01T09:00:00Z",
});
```

### Publish immediately

```ts
await client.posts.createAndPublish({
  content: "Going live right now",
  channels: ["x", "bluesky"],
});
```

### Per-media alt text

Every `media_urls` / `media_ids` entry accepts either a plain string or an object with an `alt` accessibility description (max 1500 chars). Alt text is delivered to Mastodon (media description), Bluesky (embed alt), X (photos and GIFs), Pinterest (pin alt text), Instagram (images), and LinkedIn (images). Strings and objects can be mixed, and the same shape works in per-platform maps and `thread_parts` media.

```ts
await client.posts.create({
  content: "Sunrise over the harbor",
  channels: ["mastodon", "bluesky"],
  scheduled_at: "2026-08-01T09:00:00Z",
  media_urls: [
    {
      url: "https://example.com/harbor.jpg",
      alt: "A small sailboat crossing a calm harbor at sunrise, sky in deep orange",
    },
  ],
});
```

### Post with platform-specific options

```ts
await client.posts.create({
  content: "Behind the scenes of our summer shoot",
  channels: ["instagram", "youtube", "x"],
  scheduled_at: "2026-08-01T09:00:00Z",
  media_urls: ["https://example.com/bts.mp4"],
  instagram: { share_to_feed: true },
  youtube: { title: "Summer shoot BTS", privacy: "public" },
  x: { reply_settings: "following", made_with_ai: false },
});
```

### Chained threads (X, Bluesky, Mastodon, Threads)

Provide 2 to 25 `thread_parts` to publish a chained thread instead of a single tweet. Each part is capped at 280 characters and can carry its own media. The same `thread_parts` shape works for `bluesky` (300 chars per part), `mastodon` (500 chars per part) and `threads` (Meta Threads: 2 to 25 parts, 500 characters per part, up to 10 media per part; parts after the first publish as replies to the previous part, and the Threads caption is taken from part 1).

```ts
await client.posts.create({
  content: "How we grew to 10k followers in 90 days",
  channels: ["x"],
  scheduled_at: "2026-08-01T09:00:00Z",
  x: {
    thread_parts: [
      { text: "How we grew to 10k followers in 90 days. A thread:" },
      { text: "1. We posted every single day, even when it felt pointless." },
      { text: "2. We replied to every comment within an hour." },
      { text: "3. Full breakdown on our blog. Link in bio." },
    ],
  },
});
```

```ts
// Meta Threads chain with a carousel on the first part
await client.posts.create({
  content: "Behind the scenes of our summer shoot",
  channels: ["threads"],
  threads: {
    thread_parts: [
      { text: "Behind the scenes of our summer shoot. A few highlights:", media_urls: ["https://example.com/shoot-1.jpg", "https://example.com/shoot-2.jpg"] },
      { text: "Day one: scouting locations at sunrise." },
      { text: "Day two: the full crew, 14 hours, zero regrets." },
    ],
  },
});
```

On update, pass `thread_parts: null` to clear thread mode (revert to a single post); omit it to leave the existing thread untouched.

Threads posts can also carry a location tag: pass `threads.location_id`, a Threads location id from `client.locations.search({ platform: "threads", q: "..." })` (Instagram Place ids are not interchangeable). On a multi-part thread the tag lands on part 1; on update, `location_id: null` clears it. Threads location tagging is currently rolling out; until Meta approves the permissions it is disabled on production and calls return a clear error.

### X link posts use credits

X bills API posts whose text contains a URL at a premium, and OmniSocials passes that fee through as prepaid credits (20 credits per URL-containing tweet; threads billed per part with a link). When a create targets X and the text contains a URL, the response carries an optional top-level `warnings` array (a sibling of `data`, typed as `PostWarning[]`):

```ts
const res = await client.posts.create({
  content: "Read the full story: https://example.com/post",
  channels: ["x"],
});
const creditWarning = res.warnings?.find((w) => w.code === "x_url_post_credits");
if (creditWarning) {
  console.log(creditWarning.credits_required, creditWarning.credits_balance);
}
```

From `enforce_from` (2026-08-14) the balance is checked at publish time, but credits are only deducted after the post successfully publishes (a failed publish is never charged). If the balance can't cover it, only the X target fails (other platforms publish normally); top up in the dashboard under Settings -> Organisation -> Billing -> Credits, then `posts.retry(id)`. Posts without links, analytics, and media on X stay free. There is no API endpoint for credits — they are managed in the dashboard.

Scheduling is also gated up front: every scheduled X link post reserves its cost until it publishes (shown as an orange "reserved" slice on the dashboard's credits page). `posts.create` / `update` / `publish` refuse the whole request, before it's accepted, with `402 { error: { code: "x_credits_insufficient", details: { credits_required, credits_balance, credits_reserved } } }` when reserving this post's cost would push the company's total reserved credits past its balance. Drafts are never gated, and posts publishing before `enforce_from` are never gated.

### List, get, update, publish, retry, delete

```ts
const { data: posts, pagination } = await client.posts.list({ status: "scheduled", limit: 50 });
const { data: one } = await client.posts.get(posts[0].id);
await client.posts.update(one.id, { scheduled_at: "2026-08-02T10:00:00Z" });
await client.posts.publish(one.id); // publish a draft/scheduled post now
await client.posts.retry(one.id);   // retry only the failed platforms of a failed/warning post
await client.posts.delete(one.id);  // resolves to null (204)
```

`retry` re-publishes only the platforms that failed, on the same post; platforms that already succeeded are never posted again. It is asynchronous: a 200 means the retry is queued, so poll `get` for the outcome. Max 3 retries per platform.

### Approve or reject a post

```ts
await client.posts.approve(one.id);                              // approve the current approval-workflow step
await client.posts.reject(one.id, "Wrong CTA link, please fix."); // reject and stop the workflow (comment optional)
```

Only works on a post with `approval_status: "pending"` (`status: "in_approval"`). Both act on behalf of the user who owns the API key, who must be a listed approver for the workflow's CURRENT step — steps approve in order, so being an approver on a later step is not enough yet (returns a `403 forbidden` `APIError`). Approving the last step finalizes the post (`scheduled` or `posting`); rejecting stops the whole workflow immediately, not just the current step.

### Recent platform posts

Fetch recent posts live from the connected platform APIs, including content published outside OmniSocials. Useful for brand-new workspaces where `list()` is empty. Requires the `analytics:read` scope. Each record includes `duration_seconds` (integer, nullable): the video length in whole seconds where the platform reports it — currently TikTok and YouTube; `null` for images and for platforms that don't expose it.

```ts
const recent = await client.posts.recentPlatform({ limit: 10, platforms: ["instagram", "x"] });
```

## Media

### Upload from a URL (recommended, up to 1GB)

```ts
const upload = await client.media.uploadFromUrl({
  url: "https://example.com/launch-video.mp4",
  name: "launch-video-v2",
  folder: "Campaigns",
});
console.log(upload.data.id, upload.compatibility);
```

Videos over 100MB are processed in the background and come back with status `"processing"`. Every upload response includes a `compatibility` block listing connected platforms that would reject the file.

### Upload a local file (multipart)

```ts
// From a path
const res = await client.media.upload({ file: "./photos/product.jpg", name: "product-hero" });

// Or from bytes / a Blob
import { readFile } from "node:fs/promises";
const bytes = await readFile("./photos/product.jpg");
await client.media.upload({ file: bytes, filename: "product.jpg" });
```

Direct multipart uploads are capped at 100MB by the CDN; use `uploadFromUrl` or the presigned flow below for bigger files.

### Upload from base64

```ts
await client.media.uploadFromBase64({
  data: base64String, // no data URI prefix
  mime_type: "image/png",
  filename: "chart.png",
});
```

### PDF carousels

Uploading a PDF rasterizes it into one image slide per page (max 20). The response carries `slides` and `media_ids` alongside `data` (the first slide). Pass ALL of `media_ids`, in order, to `posts.create` to post the deck as a carousel (a native swipeable document on LinkedIn, an image carousel elsewhere).

```ts
const pdf = await client.media.uploadFromUrl({ url: "https://example.com/deck.pdf" });
await client.posts.create({
  content: "Our Q3 strategy deck",
  channels: ["linkedin"],
  media_ids: pdf.media_ids!,
  scheduled_at: "2026-08-01T09:00:00Z",
});
```

### Presigned uploads for large files (up to 1GB)

`createUploadUrl` mints a one-time upload URL. POST the file to it as multipart form data (field name `file`) within `expires_in_seconds` (600s); the second request needs no auth headers because the single-use token is in the URL. The response of that second request is the created media item (or `media_ids` for a PDF).

```ts
const { upload_url } = await client.media.createUploadUrl();

const form = new FormData();
form.append("file", new Blob([await readFile("./big-video.mp4")]), "big-video.mp4");
const uploaded = await fetch(upload_url, { method: "POST", body: form }).then((r) => r.json());
console.log(uploaded.data.id);
```

### Preflight compatibility check

Check a file against the workspace's connected platforms before uploading. Provide one of `url`, `media_id`, or `size_bytes` + `mime`.

```ts
await client.media.check({ url: "https://example.com/huge.mov" });
await client.media.check({ size_bytes: 300_000_000, mime: "video/quicktime" });
```

### List, get, rename, move, delete

```ts
const { data: items } = await client.media.list({ search: "hero", limit: 20 });
await client.media.update(items[0].id, { name: "hero-v2", folder_id: "12" });
await client.media.get(items[0].id);
await client.media.delete(items[0].id); // 409 media_in_use if attached to a scheduled post
```

## Folders

```ts
const { data: folders } = await client.folders.list(); // flat; build the tree via parent_id
const { data: folder } = await client.folders.create({ name: "Campaigns" });
await client.folders.update(folder.id, { name: "Campaigns 2026" });
await client.folders.delete(folder.id); // files move to root, subfolders move up
```

## Hashtag Sets

Save reusable hashtag groups and apply them to posts at create time. Uses the `posts:read` / `posts:write` scopes.

```ts
const { data: set } = await client.hashtagSets.create({
  name: "Launch",
  hashtags: ["saas", "buildinpublic", "startup"], // or one string: "#saas #buildinpublic #startup"
});
console.log(set.preview); // "#saas #buildinpublic #startup"

await client.hashtagSets.list();
await client.hashtagSets.get(set.id);
await client.hashtagSets.update(set.id, { hashtags: ["saas", "founder"] }); // replaces the full list
await client.hashtagSets.delete(set.id); // resolves to null (204)
```

Apply a set when creating a post with `hashtag_set` (the set name, case-insensitive) or `hashtag_set_id`. The set is applied once at create time and tags already in the caption are skipped. `hashtag_placement` is `"caption_append"` (default) or `"first_comment"`, and `hashtag_platforms` restricts the hashtags to a subset of the post's channels. Instagram's 30-hashtag cap returns error code `hashtag_limit_exceeded`.

```ts
await client.posts.create({
  content: "Launch day!",
  channels: ["instagram", "x"],
  scheduled_at: "2026-08-01T09:00:00Z",
  hashtag_set: "Launch",
  hashtag_placement: "first_comment",
  hashtag_platforms: ["instagram"],
});
```

## Accounts

```ts
const { data: accounts } = await client.accounts.list();
for (const account of accounts) {
  console.log(account.platform, account.username, account.status);
  if (account.needs_reconnect) {
    console.warn(`${account.platform} needs a reconnect: ${account.reauth_reason}`);
  }
}
const { data: ig } = await client.accounts.get(accounts[0].id);
```

## Analytics

```ts
// One post's latest per-platform metrics
const { data: stats } = await client.analytics.post("post_id");
console.log(stats.platforms.instagram?.metrics);

// Batch: up to 100 posts in one call
const batch = await client.analytics.posts(["id1", "id2", "id3"]);

// Workspace-wide overview
const { data: overview } = await client.analytics.overview({ period: "30d" });
console.log(overview.total_impressions, overview.total_engagements);

// Account-level stats (followers etc)
const accounts = await client.analytics.accounts({ platform: "instagram" });
```

### Best times to post

```ts
const best = await client.analytics.bestTimes({
  platform: "instagram",
  timezone: "Europe/Amsterdam",
});
```

## Locations (Instagram and Threads location tagging)

```ts
const results = await client.locations.search("Griffith Observatory");
const place = results.data[0];

const check = await client.locations.validate(place.id);
if (check.valid) {
  await client.posts.create({
    content: "Golden hour at the observatory",
    channels: ["instagram"],
    media_urls: ["https://example.com/observatory.jpg"],
    location_id: place.id,
    scheduled_at: "2026-08-01T18:30:00Z",
  });
}
```

Threads locations use their own ids (a Facebook Place id is not a Threads location id) and a different response shape. Search by text, or by coordinates instead of `q`, and pass a result's `id` as `threads.location_id` on the post. Threads location tagging is currently rolling out; until Meta approves the permissions it is disabled on production and calls return a clear error.

```ts
const spots = await client.locations.search({ platform: "threads", q: "Griffith Observatory" });
// or around a point: { platform: "threads", latitude: 34.1184, longitude: -118.3004 }

if (spots.locations?.length) {
  await client.posts.create({
    content: "Golden hour at the observatory",
    channels: ["threads"],
    media_urls: ["https://example.com/observatory.jpg"],
    threads: { location_id: spots.locations[0].id },
  });
}
```

## Webhooks

### Manage endpoints

```ts
const { data: webhook } = await client.webhooks.create({
  url: "https://example.com/omnisocials/webhook",
  events: ["post.published", "post.failed"],
});
console.log(webhook.secret); // save it, it is only shown once

await client.webhooks.list();
await client.webhooks.get(webhook.id);
await client.webhooks.update(webhook.id, { is_active: false });
const rotated = await client.webhooks.rotateSecret(webhook.id);
console.log(rotated.data.secret); // the old secret stops working
await client.webhooks.delete(webhook.id);
```

### Verify deliveries (Express example)

Every delivery is signed with your webhook secret. The `X-OmniSocials-Signature` header has the form `t=<unix>,v1=<hex>` where the hex value is an HMAC-SHA256 of `"{timestamp}.{rawBody}"`. Always verify against the RAW request body:

```ts
import express from "express";
import { verifyWebhookSignature, WebhookVerificationError } from "@omnisocials/sdk";

const app = express();

app.post(
  "/omnisocials/webhook",
  express.raw({ type: "application/json" }), // keep the raw body!
  (req, res) => {
    try {
      const event = verifyWebhookSignature({
        payload: req.body, // Buffer of the raw body
        signature: req.get("X-OmniSocials-Signature") ?? "",
        secret: process.env.OMNISOCIALS_WEBHOOK_SECRET!,
        tolerance: 300, // seconds (default)
      });

      switch (event.type) {
        case "post.published":
          console.log("Published:", event.data.post_id, event.data.targets);
          break;
        case "post.failed":
          console.error("Failed:", event.data.post_id);
          break;
      }
      res.sendStatus(200);
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return res.sendStatus(400);
      }
      throw err;
    }
  }
);
```

`verifyWebhookSignature` uses a constant-time comparison, rejects timestamps older than `tolerance` seconds (replay protection), throws `WebhookVerificationError` on any failure, and returns the parsed event on success.

## Inbox

Read and reply to your Instagram, Facebook, and LinkedIn Page DMs, comments, and mentions, plus TikTok and YouTube video comments (TikTok needs the TikTok comments authorization on the channel), X (Twitter) DMs once a workspace opts in, and Threads replies and mentions (no Threads DMs). TikTok and YouTube replies are comments only; TikTok replies are capped at 150 characters. List and message endpoints use cursor pagination (`cursor` in, `pagination.next_cursor` out) instead of offset. Threads inbox is currently rolling out; until Meta approves the permissions it is disabled on production, and it needs a Threads connection with the reply permission.

```ts
const { data: conversations } = await client.inbox.listConversations({
  platform: "instagram",
  unread: true,
  limit: 25,
});

const { data: messages } = await client.inbox.getMessages(conversations[0].conversation_id);
await client.inbox.markRead(conversations[0].conversation_id);

await client.inbox.reply(conversations[0].conversation_id, {
  text: "Yes, we ship worldwide!",
});

// Threads only: hide a reply someone left on one of your posts
// (pass { hide: false } to unhide; only top-level replies can be hidden)
await client.inbox.hide(messages[0].id);
```

### X DM reply credits

X DM replies cost 2 prepaid credits per send (X's per-request send fee, passed through at cost), debited from the company balance before the send and auto-refunded if the send fails. On an X conversation, `inbox.reply()` can throw two new 402 codes: `insufficient_credits` (the balance can't cover the 2 credits) and `x_inbox_suspended` (the workspace's X inbox auto-suspended at zero balance; top up and re-enable it in the dashboard to resume — DMs that arrive while suspended are not recovered).

```ts
import { APIError } from "@omnisocials/sdk";

try {
  await client.inbox.reply(conversationId, { text: "Thanks for reaching out!" });
} catch (err) {
  if (err instanceof APIError && err.status === 402) {
    console.error(`Credits issue (${err.code}): ${err.message}`);
  } else {
    throw err;
  }
}
```

## Health

```ts
const health = await client.health(); // { status: "ok", version: "1.0.0", timestamp: "..." }
```

## Error handling

All errors thrown by the SDK extend `OmniSocialsError`. Non-2xx API responses throw an `APIError` subclass with `status`, `code`, `message`, and the parsed `body`:

| Class | Status | Typical API codes |
|---|---|---|
| `ValidationError` | 400 / 422 | `validation_error`, `platform_not_connected`, `invalid_file_type` |
| `AuthenticationError` | 401 | `unauthorized`, `invalid_api_key` |
| `PermissionDeniedError` | 403 | `forbidden`, `insufficient_scope` |
| `NotFoundError` | 404 | `not_found` |
| `RateLimitError` | 429 | `rate_limit_exceeded` (exposes `retryAfter` seconds) |
| `ServerError` | >= 500 | `internal_error` |
| `APIConnectionError` | n/a | network failure or timeout |
| `WebhookVerificationError` | n/a | invalid webhook signature |

```ts
import {
  APIError,
  RateLimitError,
  ValidationError,
  APIConnectionError,
} from "@omnisocials/sdk";

try {
  await client.posts.create({ content: "Hi", channels: ["instagram"] });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.warn(`Rate limited, retry in ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    console.error(`Bad request (${err.code}): ${err.message}`, err.body);
  } else if (err instanceof APIConnectionError) {
    console.error("Network problem:", err.message);
  } else if (err instanceof APIError) {
    console.error(`API error ${err.status} (${err.code}): ${err.message}`);
  } else {
    throw err;
  }
}
```

## CommonJS

The package ships a CommonJS build as well:

```js
const { OmniSocials, verifyWebhookSignature } = require("@omnisocials/sdk");
```

## API scopes

Each API key carries scopes: `posts:read`, `posts:write`, `media:write`, `accounts:read`, `analytics:read`, `webhooks:manage`. A call with a missing scope throws `PermissionDeniedError` with code `insufficient_scope`.

## Documentation

Full API reference and guides: [https://docs.omnisocials.com](https://docs.omnisocials.com)

## License

MIT
