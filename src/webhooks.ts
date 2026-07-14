import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookVerificationError } from "./errors.js";
import type { WebhookEvent } from "./types.js";

const DEFAULT_TOLERANCE_SECONDS = 300;

export interface VerifyWebhookSignatureParams {
  /**
   * The RAW request body, exactly as received (string or bytes). Do not parse
   * and re-serialize it first: the signature is computed over the raw bytes.
   */
  payload: string | Uint8Array;
  /** Value of the `X-OmniSocials-Signature` header: `t=<unix>,v1=<hex>`. */
  signature: string;
  /** The webhook's signing secret (shown once on create / rotate-secret). */
  secret: string;
  /** Max allowed age of the timestamp, in seconds. Defaults to 300 (5 minutes). */
  tolerance?: number;
}

/**
 * Verify an OmniSocials webhook delivery (Stripe-style scheme).
 *
 * The signed value is `"{timestamp}.{rawBody}"`, HMAC-SHA256 with the webhook
 * secret, hex digest; the header is `t=<unix>,v1=<hex>`. Uses a constant-time
 * comparison and rejects timestamps older than `tolerance` seconds.
 *
 * @returns the parsed event object on success.
 * @throws {WebhookVerificationError} on any failure.
 */
export function verifyWebhookSignature(
  params: VerifyWebhookSignatureParams
): WebhookEvent {
  const { payload, signature, secret } = params;
  const tolerance = params.tolerance ?? DEFAULT_TOLERANCE_SECONDS;

  if (!secret || typeof secret !== "string") {
    throw new WebhookVerificationError("No webhook secret provided.");
  }
  if (!signature || typeof signature !== "string") {
    throw new WebhookVerificationError(
      "No signature header provided. Expected the X-OmniSocials-Signature header value."
    );
  }
  if (payload == null) {
    throw new WebhookVerificationError("No payload provided.");
  }

  // Parse `t=<unix>,v1=<hex>` (tolerate extra/unknown pairs and multiple v1).
  let timestampRaw: string | undefined;
  const candidateSignatures: string[] = [];
  for (const part of signature.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestampRaw = value;
    else if (key === "v1") candidateSignatures.push(value);
  }

  if (!timestampRaw || !/^-?\d+$/.test(timestampRaw)) {
    throw new WebhookVerificationError(
      "Unable to extract timestamp from signature header. Expected format: t=<unix>,v1=<hex>."
    );
  }
  if (candidateSignatures.length === 0) {
    throw new WebhookVerificationError(
      "Unable to extract v1 signature from signature header. Expected format: t=<unix>,v1=<hex>."
    );
  }

  const payloadString =
    typeof payload === "string" ? payload : new TextDecoder("utf-8").decode(payload);

  const expected = createHmac("sha256", secret)
    .update(`${timestampRaw}.${payloadString}`)
    .digest("hex");
  const expectedBytes = new TextEncoder().encode(expected);

  const matches = candidateSignatures.some((candidate) => {
    const candidateBytes = new TextEncoder().encode(candidate);
    return (
      candidateBytes.length === expectedBytes.length &&
      timingSafeEqual(candidateBytes, expectedBytes)
    );
  });

  if (!matches) {
    throw new WebhookVerificationError(
      "Webhook signature verification failed: no v1 signature matches the expected signature."
    );
  }

  const timestamp = parseInt(timestampRaw, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tolerance > 0 && nowSeconds - timestamp > tolerance) {
    throw new WebhookVerificationError(
      `Webhook timestamp is outside the allowed tolerance of ${tolerance}s ` +
        `(event is ${nowSeconds - timestamp}s old). Possible replay.`
    );
  }

  try {
    return JSON.parse(payloadString) as WebhookEvent;
  } catch {
    throw new WebhookVerificationError(
      "Webhook payload is not valid JSON (did you pass the raw request body?)."
    );
  }
}
