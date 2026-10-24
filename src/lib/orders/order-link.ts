/**
 * Links to an online order page (`/orders/[reference]`).
 *
 * A guest's link carries the tracking token in the URL fragment, as in
 * `/orders/BNC-7K2Q9F#token=…`. Browsers never send the fragment to a server,
 * so the token stays out of server logs and the Referer header, and the link
 * still works after a reload or from a bookmark (FR-026, FR-045).
 */

import { isOrderReference, isTrackingToken } from "@/lib/orders/types";

/** Name of the fragment parameter that holds the tracking token. */
export const TRACKING_TOKEN_FRAGMENT_KEY = "token";

export class InvalidOrderLinkError extends Error {
  constructor() {
    super("The order link is not valid.");
    this.name = "InvalidOrderLinkError";
  }
}

/**
 * Path to an order page. Pass the tracking token for a guest order. A
 * signed-in customer's own order needs only the reference.
 */
export function buildOrderPath(
  reference: string,
  trackingToken?: string | null,
): string {
  if (!isOrderReference(reference)) {
    throw new InvalidOrderLinkError();
  }

  const path = `/orders/${reference}`;
  if (trackingToken === undefined || trackingToken === null) {
    return path;
  }

  if (!isTrackingToken(trackingToken)) {
    throw new InvalidOrderLinkError();
  }

  return `${path}#${TRACKING_TOKEN_FRAGMENT_KEY}=${trackingToken}`;
}

/**
 * Read the tracking token from `window.location.hash`, with or without the
 * leading `#`. Returns `null` when it is missing or malformed, so the page can
 * show its not-found state without sending a request.
 */
export function readTrackingTokenFromHash(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const token = new URLSearchParams(fragment).get(TRACKING_TOKEN_FRAGMENT_KEY);
  return isTrackingToken(token) ? token : null;
}
