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

Methods return the parsed response body as-is: single items come back as `{ data: {...} }`, lists as `{ data: [...], pagination: {...} }`, and some responses carry extra sibling keys (media uploads include `compatibility`, PDF uploads include `slides` and `media_ids`). Endpoints that respond `204 No Content` (deletes) resolve to `null`.

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

Every `media_urls` / `media_ids` entry accepts either a plain string or an object with an `alt` accessibility description (max 1500 chars). Alt text is delivered to Mastodon (media description), Bluesky (embed alt), X (photos and GIFs), and Pinterest (pin alt text). Strings and objects can be mixed, and the same shape works in per-platform maps and `thread_parts` media.

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

### X thread

Provide 2 to 25 `thread_parts` to publish a chained thread instead of a single tweet. Each part is capped at 280 characters and can carry its own media. The same `thread_parts` shape works for `bluesky` (300 chars per part) and `mastodon` (500 chars per part).

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

On update, pass `thread_parts: null` to clear thread mode (revert to a single post); omit it to leave the existing thread untouched.

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

### Recent platform posts

Fetch recent posts live from the connected platform APIs, including content published outside OmniSocials. Useful for brand-new workspaces where `list()` is empty. Requires the `analytics:read` scope.

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

## Locations (Instagram place tagging)

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
