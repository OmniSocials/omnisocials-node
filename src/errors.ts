/**
 * Error hierarchy for the OmniSocials SDK.
 *
 *   OmniSocialsError                (base for everything the SDK throws)
 *     APIError                      (non-2xx HTTP response; has status/code/body)
 *       AuthenticationError         (401)
 *       PermissionDeniedError       (403)
 *       NotFoundError               (404)
 *       ValidationError             (400 / 422)
 *       RateLimitError              (429; exposes `retryAfter` seconds)
 *       ServerError                 (>= 500)
 *     APIConnectionError            (network failure / timeout)
 *     WebhookVerificationError      (invalid webhook signature)
 *
 * `code` and `message` are taken from the API error body
 * `{ error: { code, message } }` when present.
 */

export class OmniSocialsError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export interface APIErrorOptions {
  status: number;
  code?: string;
  message: string;
  body?: unknown;
}

export class APIError extends OmniSocialsError {
  /** HTTP status code of the failed response. */
  readonly status: number;
  /** Machine-readable error code from the API body (e.g. "validation_error"). */
  readonly code?: string;
  /** The parsed response body, when the API returned JSON. */
  readonly body?: unknown;

  constructor(options: APIErrorOptions) {
    super(options.message);
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
  }
}

export class AuthenticationError extends APIError {}
export class PermissionDeniedError extends APIError {}
export class NotFoundError extends APIError {}
export class ValidationError extends APIError {}

export class RateLimitError extends APIError {
  /** Seconds to wait before retrying, from the `Retry-After` header (if present). */
  readonly retryAfter?: number;

  constructor(options: APIErrorOptions & { retryAfter?: number }) {
    super(options);
    this.retryAfter = options.retryAfter;
  }
}

export class ServerError extends APIError {}

export class APIConnectionError extends OmniSocialsError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class WebhookVerificationError extends OmniSocialsError {}

/**
 * Map an HTTP status to the most specific APIError subclass.
 */
export function createAPIError(
  options: APIErrorOptions & { retryAfter?: number }
): APIError {
  const { status } = options;
  if (status === 400 || status === 422) return new ValidationError(options);
  if (status === 401) return new AuthenticationError(options);
  if (status === 403) return new PermissionDeniedError(options);
  if (status === 404) return new NotFoundError(options);
  if (status === 429) return new RateLimitError(options);
  if (status >= 500) return new ServerError(options);
  return new APIError(options);
}
