/**
 * The idempotency key and tracking token of a Messenger order (FR-107).
 *
 * The website makes them in the browser with a random source. In Messenger
 * the webhook may run twice for one tap, so the idempotency key is derived
 * from the customer's Page-scoped ID and the number made when the order
 * summary was shown, with the Meta app secret as the key. The same summary
 * always gets the same key, so a double tap or a repeated delivery returns
 * the saved order (`created: false`) instead of a second one. Another
 * summary gets a new key.
 *
 * The tracking token is the customer's own and the same for every order they
 * place in the chat (FR-110). It lets the assistant list their orders from
 * who is asking, so nobody has to type an order number or open a link.
 * Nobody without the app secret can make a customer's token.
 */

import { createHmac } from "node:crypto";

export type OrderIds = Readonly<{
  /** A UUID, as the order function expects. */
  idempotencyKey: string;
  /** 43 URL-safe characters (256 bits). */
  trackingToken: string;
}>;

function mac(secret: string, label: string, ...parts: string[]) {
  return createHmac("sha256", secret)
    .update(`messenger-order:${label}:${parts.join(":")}`)
    .digest();
}

/** The customer's tracking token, the same for all their Messenger orders. */
export function deriveTrackingToken(secret: string, sender: string): string {
  return mac(secret, "token", sender).toString("base64url");
}

export function deriveOrderIds(
  secret: string,
  sender: string,
  nonce: string,
): OrderIds {
  const bytes = Array.from(mac(secret, "key", sender, nonce).subarray(0, 16));
  // Version 4 and the RFC 4122 variant, so it reads as an ordinary UUID.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    idempotencyKey: [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-"),
    trackingToken: deriveTrackingToken(secret, sender),
  };
}
