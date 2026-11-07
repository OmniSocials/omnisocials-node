# OmniSocials Node.js SDK

The official Node.js and TypeScript SDK for OmniSocials: post, schedule, reply and report on 13 social platforms (Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Threads, Pinterest, Bluesky, Mastodon, Google Business, Telegram and Discord) from one API. Guide: [omnisocials.com/sdk/nodejs](https://omnisocials.com/sdk/nodejs)

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

Create an API key in the OmniSocials app under **Settings -> API Keys**. Keys start with `omsk_live_`. There are no test keys and no test mode: every key works on your real connected accounts. To try things safely, leave out `scheduled_at` so the post stays a draft (a draft never publishes on its own), or use a separate workspace with test accounts.

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

### Planned drafts

Pass `draft: true` with `scheduled_at` to store the post as a draft that keeps its time. It shows on the dashboard calendar at that slot with a dashed outline and the scheduler never publishes it: a person schedules it from the composer, or you do with `update` and `draft: false`. Use it when an agent proposes a slot that a human should confirm. `draft: true` is not allowed with `publish_now` or `approval_workflow_id` (`400 validation_error`). On `update`, `draft: false` without `scheduled_at` is a `400 validation_error` when the draft has no time or its time is in the past (pass a new `scheduled_at` then), and `draft: true` on a scheduled post unschedules it while keeping the time.

```ts
const { data: proposal } = await client.posts.create({
  content: "Proposed for Friday morning",
  channels: ["instagram", "linkedin"],
  scheduled_at: "2026-08-01T09:00:00Z",
  draft: true,
});
console.log(proposal.status, proposal.schedule_at); // "draft", the time is kept

// The human agrees: schedule it at the time it already carries
await client.posts.update(proposal.id, { draft: false });
```

### Comment-to-DM automations

Answer a keyword in an Instagram comment with a DM, once per person, with an optional public reply under the comment. Pass `comment_dm_automation` on `create` (Instagram must be in `channels`) and the automation is bound to that post; it starts listening once the post is live. Needs the opt-in `automations:write` scope on the key. `client.automations` manages the automations themselves (`list`, `get`, `create`, `update`, `delete`) and reads their activity (`listEvents`, `automations:read`). On `update`, `comment_dm_automation` as an object replaces the post's automation and `null` removes it. Instagram rules: one private reply per comment, within 7 days; OmniSocials caps sends at 180 DMs an hour per account.

```ts
const { data: post } = await client.posts.create({
  content: "Comment GUIDE and I will send you the link",
  channels: ["instagram"],
  scheduled_at: "2026-08-01T09:00:00Z",
  media_urls: ["https://example.com/guide-cover.jpg"],
  comment_dm_automation: {
    trigger: { keywords: ["guide"], match: "word" },
    actions: {
      dm: { text: "Here is the guide: https://example.com/guide" },
      public_reply: { enabled: true, variations: ["Sent you a DM!", "Check your inbox"] },
      // Optional: send the link only to people who follow the account
      follow_gate: { enabled: true },
    },
    limits: { max_sends: 500 },
  },
});
const automationId = post.comment_dm_automation!.id;

// Later: who was answered, and why someone was skipped
const events = await client.automations.listEvents(automationId, { outcome: "sent" });
console.log(events.counts); // { sent: 12, skipped: 3 }
for (const event of events.data) {
  console.log(event.person?.username, event.outcome, event.reason_label);
}
```

The events response is `{ data, counts, pagination }`, not the plain list: `counts` is the number of events per outcome (`sent`, `skipped`, `failed`, `pending`, `queued`, `opted_out`, `waiting`). An automation can also listen on a post published outside OmniSocials (`client.automations.create({ instagram_media_id, ... })`), on the next post the workspace publishes (`trigger: { scope: "next_post" }`) or on every post (`scope: "any"`), and on DMs and story replies (`trigger: { kinds: ["dm", "story_reply"] }`).

Follow first (`actions.follow_gate`, Instagram only) sends the link only to people who follow the account. On a comment the private reply is a first message with one button ("Send me the link"); a tap makes OmniSocials ask Instagram whether the person follows. A follower gets `actions.dm.text`, anyone else gets the `not_following` message with its button ("I follow now"), and every later tap checks again. A DM or a story reply is checked at once. When Instagram gives no answer the link goes out anyway. Texts hold 640 characters, buttons 20; leave them out for the defaults. A person who has not followed yet is an event with outcome `waiting` and `event.follow_gate` (`state`, `taps`, `followed`, `checked`, `after_ask`); `automation.stats.followed` counts the people who followed after the ask. `enabled: true` on a Facebook or X automation is a `400 follow_gate_instagram_only`.

```ts
await client.automations.update(automationId, {
  actions: {
    dm: { text: "Here is the guide: https://example.com/guide" },
    follow_gate: {
      enabled: true,
      first_message: { text: "Tap the button and I'll send you the link 👇", button: "Send me the link" },
      not_following: { text: "Almost there! Follow @yourbrand first, then tap the button again.", button: "I follow now" },
    },
  },
});
```

A Facebook Page works the same way, and the DM lands in Messenger: pass `platform: "facebook"` to `client.automations.create()`, or `facebook_post_id` for a Page post published outside OmniSocials. On a post, `comment_dm_automation: { platforms: ["instagram", "facebook"], ... }` makes one automation per channel with the same keywords and DM. Facebook has no story replies.

On X, pass `platform: "x"` with `trigger: { kinds: ["dm"], keywords: ["guide"] }`: the X account answers a keyword in a DM, once per person, and every answer ends with "Reply STOP to stop automatic messages." An active X automation needs X DMs on for the workspace (`409 x_dms_off`; `status: "paused"` always saves). An answer over the send cap waits in a queue (`queued`) for up to an hour.

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
  // A poll on X (the text is the question); also `threads.poll` and `mastodon.poll`.
  // x: { poll: { options: ["Polls", "Reports"], duration_minutes: 1440 } },
});
```

### Telegram channels and groups

`telegram` is a channel or group the workspace connected in OmniSocials; the OmniSocials bot posts to it. The `telegram` options: `silent`, `link_preview`, `pin`, `protect_content`, `spoiler` and `caption_above_media` (booleans), up to 3 `buttons` (`{ text, url }`, not on an album or a poll), a native `poll` (2 to 12 options of up to 100 characters, `open_period` 5 to 2628000 seconds, `multiple`; the post text is the question, max 300 characters, no media) and `first_comment` (a reply under the post). Text up to 4,096 characters; with media, text over 1,024 characters is sent as a reply under the media. Albums hold up to 10 photos and videos, files up to 50 MB, no Stories. Once sent, the post's `telegram.result` carries the message ids and the link. Telegram gives bots no view counts: analytics carry the reactions and the poll votes.

```ts
await client.posts.create({
  content: "The new collection is live. Tap the button to shop.",
  channels: ["telegram"],
  scheduled_at: "2026-11-02T09:00:00Z",
  media_urls: ["https://example.com/collection.jpg"],
  telegram: {
    silent: true,
    pin: true,
    buttons: [{ text: "Shop now", url: "https://example.com/shop" }],
    first_comment: "Questions? Reply to this message.",
  },
});

// A native poll: the text is the question.
await client.posts.create({
  content: "Which day suits the live Q&A?",
  channels: ["telegram"],
  telegram: { poll: { options: ["Tuesday", "Thursday", "Saturday"], open_period: 86400 } },
});
```

### Discord channels

`discord` is one Discord channel the workspace connected in OmniSocials; the post goes out through the channel's incoming webhook and shows the webhook's name and picture. The `discord` options: `silent`, `link_preview` (default on), `allow_mentions` (default off, so @everyone, @here, role and user mentions show as text and ping nobody) and `spoiler` (booleans), `thread_name` (the post title in a forum or media channel, 1 to 100 characters), up to 5 `buttons` (`{ text, url }`, one row, not with a poll) and a native `poll` (2 to 10 options of up to 55 characters, `duration_hours` 1 to 768, default 24, `multiple`; the post text is the question, max 300 characters, no media). Text up to 2,000 characters. Up to 10 images, GIFs and videos per message; a video or GIF over Discord's 20 MB attachment limit is sent as a link in the text. No Stories. Once sent, the post's `discord.result` carries the message id and the link. Discord gives webhooks no view counts: analytics carry the reactions and the poll votes.

```ts
await client.posts.create({
  content: "Patch 2.4 is out. Read the notes below.",
  channels: ["discord"],
  scheduled_at: "2026-11-02T09:00:00Z",
  media_urls: ["https://example.com/patch-notes.png"],
  discord: {
    silent: true,
    buttons: [{ text: "Patch notes", url: "https://example.com/patch-2-4" }],
  },
});

// A native poll: the text is the question.
await client.posts.create({
  content: "Which mode do we test next?",
  channels: ["discord"],
  discord: { poll: { options: ["Ranked", "Co-op", "Arena"], duration_hours: 48 } },
});
```

### Chained threads (X, Bluesky, Mastodon, Threads)

Provide 2 to 25 `thread_parts` to publish a chained thread instead of a single tweet. Each part is capped at 280 characters (25,000 for X Premium/Premium+ accounts) and can carry its own media. The same `thread_parts` shape works for `bluesky` (300 chars per part), `mastodon` (500 chars per part) and `threads` (Meta Threads: 2 to 25 parts, 500 characters per part, up to 10 media per part; parts after the first publish as replies to the previous part, and the Threads caption is taken from part 1).

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

Threads posts can carry a topic too: pass `threads.topic_tag`, for example `"Build in public"`. Unlike a #tag in the text, a topic can hold spaces. 1 to 50 characters, no period and no ampersand; a leading `#` is dropped. On a multi-part thread the topic lands on part 1; on update, `topic_tag: null` removes it.

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

These calls answer `409` and change nothing when the post is not in a state for them:

- `post_publishing`: `update` or `delete` while the post is publishing (status `posting`) or a retry publishes one of its channels. Poll `get` until the status is `published`, `warning` or `failed`. An `update` with only `tags` still works.
- `review_required`: changes were requested on the post (`approval_status` `rejected`), so `publish`, or an `update` that would schedule it, is refused. It needs a new review: create it again with `approval_workflow_id`. Saving it as a draft works.
- `retry_in_progress`: `retry` while another retry of the post runs.
- `media_processing`: a media id in `create`, `createAndPublish` or `update` is still processing. Wait until `client.media.get(id)` says `ready`, then send the same request again. A file whose processing failed answers `400 invalid_media`: upload it again.

### Approve or reject a post

```ts
import { APIError } from "@omnisocials/sdk";

// Read the step you review first, then name it on the decision.
const { data: review } = await client.posts.getApproval(one.id);
const step_order = review.current_step ?? undefined;

try {
  await client.posts.approve(one.id, { step_order }); // approve the step you reviewed
  // or: reject and stop the workflow (comment optional)
  // await client.posts.reject(one.id, { comment: "Wrong CTA link, please fix.", step_order });
} catch (err) {
  if (err instanceof APIError && err.code === "step_changed") {
    // Somebody decided since you read it: nothing was decided. Read the approval again.
    const { current_step_order } = (err.body as { error: { current_step_order: number } }).error;
    console.log("The review is on step", current_step_order);
  } else {
    throw err;
  }
}
```

Only works on a post with `approval_status: "pending"` (`status: "in_approval"`). Both act on behalf of the user who owns the API key, who must be a listed approver for the workflow's CURRENT step. Steps approve in order, so being an approver on a later step is not enough yet (returns a `403 forbidden` `APIError`). Approving the last step finalizes the post (`scheduled` or `posting`); rejecting stops the whole workflow immediately, not just the current step.

`step_order` is optional: the `current_step` of `getApproval`. When the review is on another step now (somebody decided since you read it, or a retried call already went through), nothing is decided and the call throws a `409` `step_changed` `APIError` with `error.current_step_order`, the step the review is on now. Without `step_order` the call acts on whatever step is current, so a retry after a timeout could approve the next step too. `client.posts.approve(id)` and `client.posts.reject(id, "comment")` still work.

### Read the approval review

```ts
const { data: review } = await client.posts.getApproval(one.id);
if (review.status === "rejected" && review.rejection) {
  console.log(`Rejected by ${review.rejection.by.name}: ${review.rejection.reason}`);
}
for (const step of review.steps) {
  console.log(step.order, step.name, step.status, step.approvers.map((a) => `${a.name}: ${a.status}`));
}
```

`getApproval` returns the review of a post that went through an approval workflow: `status` (`none`, `pending`, `approved`, `rejected`), the `workflow`, who requested it and when, `current_step` (the step the post waits on, `null` when the review ended), every step with its approvers and their decisions, the `rejection` (`by`, `reason`, `at`, `step`; `null` when nobody rejected) and the `comments` thread, oldest first. A post without an approval workflow returns `status: "none"` with empty `steps` and `comments`. Read-only; needs the `posts:read` scope.

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

Videos over 100MB are processed in the background and come back with status `"processing"`; when such a file cannot be queued, the call answers `503 processing_unavailable` (send the same request again in a minute). Every upload response includes a `compatibility` block listing connected platforms that would reject the file.

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

Uploading a PDF rasterizes it into one image slide per page (max 20). The response carries `slides` and `media_ids` alongside `data` (the first slide). Pass ALL of `media_ids`, in order, to `posts.create` to post the deck as a carousel (on LinkedIn a native swipeable document made from the original PDF file, which is kept so text and links stay intact; an image carousel elsewhere). To keep the PDF as ONE library item instead of one item per page, pass `pdf_mode` = `"document"`: the response then has a single `data` item of type `document` (its page images in `pdf.pages`) and `media_ids` holds that one id, which expands into every page at post time.

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

## Post tags

Tags are your workspace's own labels for posts (a hook style, a format, a campaign), to filter posts and compare how each tag did in Analytics. Tags never go to a platform. Uses the `posts:read` / `posts:write` scopes; `analytics.tags()` uses `analytics:read`.

```ts
const { data: tag } = await client.tags.create({ name: "Question", color: "blue" }); // color optional
await client.tags.list();
await client.tags.update(tag.id, { name: "Question hook" });
const { data: removed } = await client.tags.delete(tag.id); // { tag, posts_untagged }, the posts stay

// Tag a post when you make it (ids or names; a new name becomes a tag, 20 at most)
await client.posts.create({
  content: "What would you build with an extra hour a day?",
  channels: ["instagram", "tiktok"],
  tags: ["Question", "Talking head"],
});
await client.posts.update(postId, { tags: ["Question"] }); // replaces; null or [] removes them all

// Add, remove or replace tags on up to 500 posts at once, published ones included
const { data: result } = await client.tags.apply({
  post_ids: ["1024", "1025"],
  add: ["Question"],
  remove: [12],
}); // { updated, posts: [{ id, tags }], not_found }

// Filter by tag (an id or name; several = any of them)
const { data: questions } = await client.posts.list({ tag: "Question" });
const { data: overview } = await client.analytics.overview({ period: "30d", tag: ["Question", "Poll"] });

// Compare tags against your normal
const { data: compare } = await client.analytics.tags({ start_date: "2026-08-01", platform: "tiktok" });
for (const row of compare.tags) {
  console.log(row.tag.name, row.vs_normal, row.enough_posts ? "" : "(few posts)");
}
```

`analytics.tags()` returns `{ period, platform, min_posts, tags, untagged, normals }`. Each row in `tags` has the `tag`, `posts`, `measured`, `median_impressions`, `engagement_rate` (percent), `vs_normal` (a fraction: `0.38` = 38% above your normal, where each post is measured against the median impressions of its own channel), `best_channel` and `enough_posts` (false below `min_posts` measured posts, default 5: read `vs_normal` then as a hint only). Comparable tags come first, best first; `untagged` covers the posts without a tag. The default period is the last 90 days.

Every post carries `tags` and `trial_reel` (`{ strategy: "MANUAL" | "SS_PERFORMANCE" }` for an Instagram Trial Reel, else `null`), and so does each item of `analytics.posts(ids)`. Errors: `404 tag_not_found`, `409 tag_exists` (the existing tag is in `error.body.error.tag`), `409 tag_limit_reached` (200 per workspace), `400 invalid_tag_name` / `invalid_tag_color` / `invalid_tags` / `invalid_post_ids` / `too_many_posts` / `too_many_tags`.

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

`status` is `active` or `needs_reconnect` (the token was revoked or expired; Bluesky also when its sign-in could not be renewed). Posts to a `needs_reconnect` account fail until it is reconnected in the OmniSocials app. OmniSocials Connect customer workspaces can also show `pick_pending` (Facebook, Connect customers only: no Page chosen yet).

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

The response is not wrapped in `data`. `platform`, `timezone`, `basis`, `grid` and `recommendations` sit at the top level.

```ts
const best = await client.analytics.bestTimes({
  platform: "instagram",
  timezone: "Europe/Amsterdam",
});
for (const slot of best.recommendations) console.log(slot.day, slot.time, slot.score);
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

## Pinterest product tags

Tag products on a Pin so people can shop the items in the image. `client.pinterest.listProducts()` returns the product Pins of the connected Pinterest account; pass their `pin_id` values (max 24) as `pinterest.product_tags` on the post. Only product Pins of your own account can be tagged; products of other merchants cannot. The tags are added right after the Pin is published. A product that Pinterest refuses never fails the post: the outcome is on the post as `pinterest.product_tags_result` (`requested`, `tagged`, `skipped`, `error`).

```ts
const list = await client.pinterest.listProducts();

if (list.error) {
  // HTTP 200 without `products`: pinterest_not_connected,
  // pinterest_catalog_access_required or platform_error
  console.warn(list.error.code, list.error.message);
} else {
  const productTags = (list.products ?? []).slice(0, 3).map((product) => product.pin_id);

  await client.posts.create({
    content: "Our summer picks",
    channels: ["pinterest"],
    media_urls: ["https://example.com/summer-look.jpg"],
    scheduled_at: "2026-08-01T09:00:00Z",
    pinterest: { board_id: "1234567890", title: "Summer picks", product_tags: productTags },
  });
}
```

Without `source` the list reads the Pinterest catalog (with `price`, `currency`, `availability` and `item_id`) when the connection has catalog access, else the account's own Pins. Catalog access is given one time in the OmniSocials composer: Pinterest options, Add products, Connect catalog. `source: "pins"` scans up to 250 Pins per call, so `products` can be empty while `bookmark` is set; call again with `{ bookmark: list.bookmark }`. To check one Pin id or Pin link before you post, call `client.pinterest.validateProduct("813744226420795884")`. On `posts.update()` the `pinterest` object replaces the stored one, so leave `product_tags` out to remove the tags.

## Ads

Boost a published post or create a new ad on Meta, Pinterest, TikTok, LinkedIn, X and Google. Boosts and new ads are drafts: your code writes the draft, and the person who pays sees the amount and starts the ad in OmniSocials from the draft's `review_url`. A key starts and raises spend itself only with the opt-in **Start ads** switch (scope `ads:spend`). Without it `ads.activate()`, `ads.activateMulti()`, `ads.resume()`, `ads.drafts.launch()`, a budget raise or any change of a campaign that reached the network through `ads.update()`, and the parity calls that switch something on or raise a budget answer `403 start_in_app`, and the error message names the page where the person does it. Google (`api_draft_only` of `ads.capabilities()`) always stops at the draft, also with `ads:spend`. `ads.pause()` and `ads.delete()` stay open, except on the networks in `api_stop_in_app` (Google), where a campaign that reached the network also answers `403 start_in_app`. Only a paused campaign resumes (`409 not_paused`). The calls that start or raise spend repeat the amount (`confirm_budget_amount`) and are not retried after a 5xx or a timeout, only after a 429.

The `ads:read` and `ads:write` scopes are opt-in: create the API key with **Ads** switched on (Settings, API). `ads:spend` is the **Start ads** switch under it, offered only to a person with `manage_ads`. A key without `ads:read` / `ads:write` gets `403 insufficient_scope`; a key without `ads:spend` gets `403 start_in_app` on the calls that start or raise spend. Ad accounts are connected and picked in the OmniSocials dashboard. Budgets are in major units (10 = 10 EUR) in the ad account's currency: a draft whose `budget.currency` differs from the attached ad account's currency answers `400 currency_mismatch`. Ads errors may carry `param`, the field at fault: read it from `error.body.error.param` on the thrown `APIError`.

### Create an ad (a draft the person starts)

```ts
const caps = await client.ads.capabilities();
console.log(caps.data.create_networks, caps.data.network_states);

const { data: draft } = await client.ads.drafts.create({
  name: "Autumn sale",
  objective: "traffic",
  platforms: ["meta", "linkedin"],
  budget: { amount: 10, currency: "EUR" },
  schedule: { duration_days: 7 },
  targeting: { countries: ["NL", "BE"], automatic_audience: true },
  ads: [
    {
      media: [{ url: "https://example.com/sale.jpg", type: "image", width: 1080, height: 1350 }],
      primary_text: "30% off everything this week",
      headline: "Autumn sale",
      cta: "shop_now",
      link: "https://example.com/sale",
    },
  ],
});

// A draft spends nothing. The person checks it and starts it in OmniSocials:
console.log(`Check and start your ad: ${draft.review_url}`);
```

With a key that has `ads:spend`, `client.ads.drafts.launch(draft.group_id, { confirm_budget_amount: 10 })` starts the draft after the person agreed to the amount; Google is skipped with code `start_in_app`. Without `ads:spend` the call answers `403 start_in_app`.

A draft needs no ad account; `client.ads.drafts.attachAccount(groupId, { platform, ad_account_id })` sets one, and `campaigns[].readiness` says what still stops a network. On Meta an ad can carry a second upright 9:16 file for Stories and Reels: `placement_media: { stories_reels: { url, type } }`.

### Boost a post

```ts
const { data: accounts } = await client.ads.listAccounts();
const meta = accounts.find((a) => a.platform === "meta" && a.is_selected);

const { data: boost } = await client.ads.boost({
  post_id: 12345,
  ad_account_id: meta!.id,
  budget: { type: "daily", amount: 5, currency: meta!.account_info?.currency ?? "EUR" },
  targeting: { countries: ["NL"] },
});

// The boost is a draft: the person starts it in OmniSocials.
console.log(boost.status); // "draft"
```

`client.ads.boostMulti()` makes one draft boost per ad account (up to 10, the same budget each). `client.ads.suggestions()` lists posts that do better than your median, `client.ads.overview()` the totals (`totals.spend` is `null` when the campaigns use more than one currency: read `totals_by_currency`), and `client.ads.list()`, `get()`, `pause()` and `delete()` manage campaigns. Keyword ideas through the connected Google Ads account: `client.ads.researchKeywords({ keywords: ["running shoes"], country: "NL" })` and `client.ads.keywordMetrics({ keywords: [...] })`.

## Webhooks

Events: `post.scheduled`, `post.published`, `post.failed`, `post.approved` (the last step of a post's approval workflow is approved) and `post.rejected` (an approver rejects the post; it will not publish). The two approval events carry `data.approval` with `status`, `decided_by` (the approver's user id) and `reason` (`null` on `post.approved`), and an empty `data.targets`. `ad.status_changed` fires when an ad campaign changes status (for example `pending_review` to `active` or `rejected`); its `data` is the campaign, typed as `AdStatusChangedEventData` (`campaign_id`, `name`, `platform`, `campaign_type`, `status`, `previous_status`, `external_campaign_id`, `budget`). Subscribing to `ad.status_changed` or any other Ads event (`ad.*`, `campaign.*`, `lead.*`, `ads.*`, `ad_rule.*`) needs the `ads:read` scope on the key and `access_ads` for its person (`403 insufficient_scope` / `insufficient_permission`).

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
console.log(rotated.data.secret); // the old secret keeps signing for 24 hours
await client.webhooks.delete(webhook.id);
```

Every webhook carries `workspace_id`. `list()` and `get()` also return the organisation-wide webhooks of the key's organisation (`workspace_id: null`, made in the OmniSocials dashboard; they receive the events of every workspace), and `update()`, `delete()` and `rotateSecret()` work on them too. Webhooks you create through the API belong to the key's workspace. When the person behind a webhook loses access to the organisation or workspace, OmniSocials switches the webhook off: `is_active` is `false` and `last_failure.error` says why. `update(id, { is_active: true })` switches it on again.

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
        case "post.rejected":
          console.warn("Rejected:", event.data.post_id, event.data.approval?.reason);
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

### Rotate the secret without missing deliveries

For 24 hours after `rotateSecret()`, every delivery carries two headers: `X-OmniSocials-Signature`, signed with the new secret, and `X-OmniSocials-Signature-Previous`, signed with the old secret (same format, same timestamp and body). Verify the first with the new secret and, when that fails, the second with the old one:

```ts
function verifyDelivery(req: express.Request) {
  try {
    return verifyWebhookSignature({
      payload: req.body,
      signature: req.get("X-OmniSocials-Signature") ?? "",
      secret: process.env.OMNISOCIALS_WEBHOOK_SECRET!, // the new secret
    });
  } catch (err) {
    const previous = req.get("X-OmniSocials-Signature-Previous");
    if (!(err instanceof WebhookVerificationError) || !previous) throw err;
    return verifyWebhookSignature({
      payload: req.body,
      signature: previous,
      secret: process.env.OMNISOCIALS_WEBHOOK_SECRET_OLD!, // the old secret
    });
  }
}
```

Rotating again within the 24 hours replaces the previous secret with the one you just rotated out.

## Inbox

Read and reply to your Instagram, Facebook, and LinkedIn Page DMs, comments, and mentions, plus TikTok and YouTube video comments (TikTok needs the TikTok comments authorization on the channel), X (Twitter) DMs once a workspace opts in, and Threads replies and mentions (no Threads DMs). TikTok and YouTube replies are comments only; TikTok replies are capped at 150 characters. List and message endpoints use cursor pagination (`cursor` in, `pagination.next_cursor` out) instead of offset. The Threads inbox needs a Threads connection with the reply permission: a Threads account connected before 2026-09-14 needs a one-time reconnect in the dashboard (until then replies and hides answer 401 `reauth_required`).

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

// Hide a comment someone left on one of your posts (Facebook, Instagram,
// TikTok, YouTube, Threads). Pass { hide: false } to unhide.
await client.inbox.hide(messages[0].id);

// Like a comment as the Page or account (Facebook, LinkedIn Page, TikTok).
// Pass { like: false } to unlike. The returned message carries liked.
const { data: liked } = await client.inbox.like(messages[0].id);
console.log(liked.liked); // true

// Delete a comment outright, or one of your own replies (Facebook, Instagram,
// TikTok; YouTube: hide instead). Replies under it go with it; their ids come
// back as removed_reply_ids.
await client.inbox.deleteMessage(messages[0].id);
```

### Work queue: what needs an answer

`inbox.next()` hands out the next conversation that still needs a reply (the customer's latest DM with no reply after it, or an unreplied comment/mention that is not hidden), with the whole thread and the post it belongs to (`post.url`, `post.media_type`), so a reply can be drafted from one call. DMs that can still be answered come first, then Instagram/Facebook DMs whose 24-hour window has closed (`reply_window.open` is `false`: answer those from the native app or mark them read), then comments and mentions, oldest first. Replies typed in the native apps count as answers. Only unread items are served by default, so `markRead` is the durable way to skip one; `exclude` skips conversation ids for the current session only. Always pass `message_id: item.message.id` to `reply()` on comment threads: every comment on a post shares one conversation, and without it the reply goes under the newest comment on the post. Pass `include_next: true` to `reply()` to get the following item in the same response. `listConversations({ unanswered: true })` gives the same set as a plain list.

```ts
let { data: item, remaining } = await client.inbox.next({ platform: "instagram" });
while (item) {
  console.log(`${remaining} left. ${item.message.sender.username}: ${item.message.text}`);
  console.log("post:", item.conversation.post?.url, item.conversation.post?.media_type);

  if (!item.reply_window.open) {
    // An Instagram/Facebook DM past Meta's 24-hour window: reply() would
    // answer 422 outside_messaging_window. Answer it in the app, or skip it.
    await client.inbox.markRead(item.message.conversation_id);
    ({ data: item, remaining } = await client.inbox.next({ platform: "instagram" }));
    continue;
  }

  const reply = await client.inbox.reply(item.message.conversation_id, {
    text: "Thanks! DM sent.",
    message_id: item.message.id, // the comment being answered, not the newest one
    include_next: true,
  });
  item = reply.next ?? null;
  remaining = reply.remaining ?? 0;
}
```

### X DM reply credits

X DM replies cost 2 prepaid credits per send (X's per-request send fee, passed through at cost), debited from the company balance before the send and auto-refunded if the send fails. On an X conversation, `inbox.reply()` can throw two new 402 codes: `insufficient_credits` (the balance can't cover the 2 credits) and `x_inbox_suspended` (the workspace's X inbox auto-suspended at zero balance; a top-up turns it back on by itself, but DMs that arrive while suspended are not recovered).

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

## Limits and feature requests

`client.limits.list()` lists what OmniSocials cannot do, why (`says`) and what to do instead (`instead`): platform rules, features not built yet, features that work in the OmniSocials app only. Read it before you tell a person that something is not possible. When the person still wants a `requestable` entry, send a feature request with its `limit_id`. The request is stored for the person who owns the key; they see it in OmniSocials (Settings, Request a feature) and get an email when its status changes. Works with every key, no scope needed.

```ts
import { APIError, type Limit } from "@omnisocials/sdk";

const { data: limits } = await client.limits.list({ platform: "telegram" }); // area: "posts" | "inbox" | ...
const topics = limits.find((l) => l.id === "telegram.forum_topics");
console.log(topics?.says, topics?.instead, topics?.requestable);

try {
  const { outcome, data: request } = await client.featureRequests.create({
    summary: "Post our daily update to the Announcements topic of our Telegram group, not to the whole group.",
    platform: "telegram",
    limit_id: "telegram.forum_topics",
  });
  // outcome: "created" (new), "voted" (added a vote to your organisation's open request)
  // or "already_requested" (you asked before; request is that one)
  console.log(outcome, request.id, request.status);
} catch (err) {
  if (err instanceof APIError && err.code === "not_requestable") {
    // A platform rule or a choice of OmniSocials: nothing was stored.
    const { limit } = (err.body as { error: { limit: Limit } }).error;
    console.log(limit.says, limit.instead);
  } else {
    throw err;
  }
}

const { data: mine } = await client.featureRequests.list(); // newest first, at most 50
const { data: one } = await client.featureRequests.get(mine[0].id); // status, team_answer, team_replies
```

A `Limit` is `{ id, kind, kind_label, area, platforms, title, says, instead, requestable }`; `kind` is `platform`, `by_design`, `not_built`, `beta`, `dashboard_only` or `needs_setup`, and `requestable` is false for `platform` and `by_design`. `limits.list()` also returns `kinds` (a label per kind). A `FeatureRequest` carries `status` (`open`, `in_progress`, `completed`, `declined`), `votes_count`, `team_answer` and `team_replies`. `summary` is 10 to 1000 characters (what the person wants to do and why), `title` at most 120 (made from the summary when left out). Errors: `400 invalid_summary` / `invalid_title` / `invalid_platform` / `invalid_area` / `unknown_limit`, `409 not_requestable` (the entry is in `err.body.error.limit`), `429 too_many_requests` (10 an hour per person), and `400 invalid_id` / `404 not_found` on `get`.

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

Each API key carries scopes: `posts:read`, `posts:write`, `media:write`, `accounts:read`, `analytics:read`, `webhooks:manage`, plus the opt-in `automations:read` / `automations:write` for comment-to-DM automations. A call with a missing scope throws `PermissionDeniedError` with code `insufficient_scope`.

## Documentation

Full API reference and guides: [https://docs.omnisocials.com](https://docs.omnisocials.com)

## License

MIT
