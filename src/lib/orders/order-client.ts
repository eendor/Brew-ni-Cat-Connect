/**
 * The browser side of Place order: sends the request to `POST /api/orders`
 * and checks what comes back.
 *
 * Anything that is not a well-formed answer (no network, a proxy error page,
 * a token that does not match) becomes a `server-error`. The order may still
 * have been saved, so the checkout retries with the same idempotency key and
 * tracking token, which returns that order instead of saving a second one.
 */

import {
  isPlaceOrderResult,
  PLACE_ORDER_PATH,
  placeOrderFailure,
} from "@/lib/orders/place-order";
import type { PlaceOrderRequest, PlaceOrderResult } from "@/lib/orders/types";

export type PlaceOrder = (
  request: PlaceOrderRequest,
) => Promise<PlaceOrderResult>;

export async function placeOrder(
  request: PlaceOrderRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceOrderResult> {
  let body: unknown;
  try {
    const response = await fetchImpl(PLACE_ORDER_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
      credentials: "same-origin",
    });
    body = await response.json();
  } catch {
    return placeOrderFailure("server-error");
  }

  if (!isPlaceOrderResult(body)) {
    return placeOrderFailure("server-error");
  }
  if (body.ok && body.trackingToken !== request.trackingToken) {
    return placeOrderFailure("server-error");
  }
  return body;
}
