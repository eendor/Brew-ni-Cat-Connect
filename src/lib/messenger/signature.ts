/**
 * Checks that a Messenger webhook request really comes from Meta (FR-058,
 * NFR-022).
 *
 * - Subscription check: Meta sends a GET with `hub.mode=subscribe`,
 *   `hub.verify_token` and `hub.challenge`. The webhook echoes the challenge
 *   only when the verify token matches the one saved in the server settings.
 * - Events: Meta signs every POST body with the app secret. The
 *   `X-Hub-Signature-256` header is `sha256=` and the HMAC-SHA256 of the raw
 *   body in hex. The webhook checks it against the exact bytes it received,
 *   before it parses anything.
 *
 * Both comparisons take the same time whether or not the values match.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/i;

/** Meta's event batches are small; a larger body is refused unread. */
export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

/** Meta sends a number; anything else is refused, so nothing odd is echoed. */
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** True only for a body signed with the app secret. */
export function isValidSignature(
  body: Uint8Array,
  header: string | null,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || !header) return false;
  const hex = SIGNATURE_PATTERN.exec(header.trim())?.[1];
  if (!hex) return false;
  const expected = createHmac("sha256", appSecret).update(body).digest();
  return timingSafeEqual(Buffer.from(hex, "hex"), expected);
}

/** Equal strings, compared as hashes so their lengths don't show either. */
function sameSecret(given: string, expected: string): boolean {
  const left = createHash("sha256").update(given).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export type SubscriptionCheck =
  Readonly<{ ok: true; challenge: string }> | Readonly<{ ok: false }>;

/** Meta's subscription check: the challenge to echo, or a refusal. */
export function checkSubscription(
  params: URLSearchParams,
  verifyToken: string | undefined,
): SubscriptionCheck {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (!verifyToken || mode !== "subscribe" || token === null) {
    return { ok: false };
  }
  if (challenge === null || !CHALLENGE_PATTERN.test(challenge)) {
    return { ok: false };
  }
  return sameSecret(token, verifyToken)
    ? { ok: true, challenge }
    : { ok: false };
}
