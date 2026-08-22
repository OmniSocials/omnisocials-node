import {
  APIConnectionError,
  AuthenticationError,
  createAPIError,
} from "./errors.js";
import type { HealthResponse } from "./types.js";
import { PostsResource } from "./resources/posts.js";
import { MediaResource } from "./resources/media.js";
import { FoldersResource } from "./resources/folders.js";
import { HashtagSetsResource } from "./resources/hashtag-sets.js";
import { AccountsResource } from "./resources/accounts.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { LocationsResource } from "./resources/locations.js";
import { AudioResource } from "./resources/audio.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { InboxResource } from "./resources/inbox.js";

export const VERSION = "0.4.0";

const DEFAULT_BASE_URL = "https://api.omnisocials.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const USER_AGENT = `omnisocials-node/${VERSION}`;

export interface OmniSocialsOptions {
  /** API key (`omsk_live_*` / `omsk_test_*`). Defaults to `process.env.OMNISOCIALS_API_KEY`. */
  apiKey?: string;
  /** API base URL. Defaults to `https://api.omnisocials.com/v1`. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 30000 (30s). */
  timeout?: number;
  /** Automatic retries on 429 / 5xx / connection errors. Defaults to 2. */
  maxRetries?: number;
}

export type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  /** Query string parameters. `undefined` values are dropped; numbers/booleans serialized. */
  query?: Record<string, QueryValue>;
  /** JSON request body. */
  body?: unknown;
  /** Multipart form body (mutually exclusive with `body`). */
  formData?: FormData;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a Retry-After header value (delta-seconds or HTTP-date) to seconds. */
function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    const diff = Math.ceil((dateMs - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }
  return undefined;
}

export class OmniSocials {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  private readonly apiKey: string;

  readonly posts: PostsResource;
  readonly media: MediaResource;
  readonly folders: FoldersResource;
  readonly hashtagSets: HashtagSetsResource;
  readonly accounts: AccountsResource;
  readonly analytics: AnalyticsResource;
  readonly locations: LocationsResource;
  readonly audio: AudioResource;
  readonly webhooks: WebhooksResource;
  readonly inbox: InboxResource;

  constructor(options: OmniSocialsOptions = {}) {
    const apiKey =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env.OMNISOCIALS_API_KEY : undefined);

    if (!apiKey) {
      throw new AuthenticationError({
        status: 401,
        code: "missing_api_key",
        message:
          "No API key provided. Pass one with `new OmniSocials({ apiKey: 'omsk_live_...' })` " +
          "or set the OMNISOCIALS_API_KEY environment variable. Create a key in the " +
          "OmniSocials app under Settings -> API Keys.",
      });
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    this.posts = new PostsResource(this);
    this.media = new MediaResource(this);
    this.folders = new FoldersResource(this);
    this.hashtagSets = new HashtagSetsResource(this);
    this.accounts = new AccountsResource(this);
    this.analytics = new AnalyticsResource(this);
    this.locations = new LocationsResource(this);
    this.audio = new AudioResource(this);
    this.webhooks = new WebhooksResource(this);
    this.inbox = new InboxResource(this);
  }

  /** `GET /health` (no scopes required). */
  health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  // ─── HTTP verb helpers used by resources ───────────────────────────────────

  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body === undefined ? {} : { body });
  }

  postForm<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>("POST", path, { formData });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  /**
   * Core request loop: builds the URL, sends the request with a timeout via
   * AbortController, and retries 429 / 5xx / connection errors with
   * exponential backoff + jitter (honoring Retry-After when present).
   * Returns the parsed response body as-is; 204 returns null.
   */
  async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    };

    let body: BodyInit | undefined;
    if (options.formData !== undefined) {
      // Let fetch set the multipart boundary Content-Type itself.
      body = options.formData;
    } else if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let attempt = 0;
    for (;;) {
      let response: Response;
      try {
        response = await this.fetchWithTimeout(url, { method, headers, body });
      } catch (err) {
        // Network failure or timeout: retryable.
        if (attempt < this.maxRetries) {
          await sleep(this.backoffMs(attempt));
          attempt += 1;
          continue;
        }
        const isAbort = err instanceof Error && err.name === "AbortError";
        throw new APIConnectionError(
          isAbort
            ? `Request timed out after ${this.timeout}ms (${method} ${url}).`
            : `Connection error (${method} ${url}): ${
                err instanceof Error ? err.message : String(err)
              }`,
          { cause: err }
        );
      }

      if (response.ok) {
        if (response.status === 204) return null as T;
        const text = await response.text();
        if (!text) return null as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }

      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        await sleep(this.backoffMs(attempt, retryAfter));
        attempt += 1;
        continue;
      }

      throw await this.responseToError(response, retryAfter);
    }
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    let url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        params.append(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private async fetchWithTimeout(
    url: string,
    init: { method: string; headers: Record<string, string>; body?: BodyInit }
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Exponential backoff (0.5s, 1s, 2s, ...) with jitter; Retry-After wins. */
  private backoffMs(attempt: number, retryAfterSeconds?: number): number {
    if (retryAfterSeconds !== undefined) {
      return Math.min(retryAfterSeconds, 60) * 1000;
    }
    const base = 500 * 2 ** attempt;
    const jitter = 0.75 + Math.random() * 0.5; // 75% - 125%
    return Math.min(base * jitter, 30_000);
  }

  private async responseToError(response: Response, retryAfter?: number) {
    let parsedBody: unknown;
    let code: string | undefined;
    let message = `Request failed with status ${response.status}.`;
    try {
      parsedBody = await response.json();
      const errorField = (parsedBody as { error?: unknown })?.error;
      if (errorField && typeof errorField === "object") {
        const err = errorField as { code?: unknown; message?: unknown };
        if (typeof err.code === "string") code = err.code;
        if (typeof err.message === "string") message = err.message;
      } else if (typeof errorField === "string") {
        message = errorField;
      }
    } catch {
      // Non-JSON error body (e.g. an HTML 413 page from the CDN).
    }
    return createAPIError({
      status: response.status,
      code,
      message,
      body: parsedBody,
      retryAfter,
    });
  }
}
