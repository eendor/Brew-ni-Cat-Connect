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

export type PlaceOrderOptions = Readonly<{
  fetchImpl?: typeof fetch;
  sessionToken?: string | null;
}>;

export type PlaceOrder = (
  request: PlaceOrderRequest,
  fetchImplOrOptions?: typeof fetch | PlaceOrderOptions,
  sessionToken?: string | null,
) => Promise<PlaceOrderResult>;

export async function placeOrder(
  request: PlaceOrderRequest,
  fetchImplOrOptions?: typeof fetch | PlaceOrderOptions,
  sessionToken?: string | null,
): Promise<PlaceOrderResult> {
  let fetchImpl: typeof fetch | undefined =
    typeof fetch !== "undefined" ? fetch : undefined;
  let token = sessionToken;

  if (typeof fetchImplOrOptions === "function") {
    fetchImpl = fetchImplOrOptions;
  } else if (fetchImplOrOptions && typeof fetchImplOrOptions === "object") {
    if (fetchImplOrOptions.fetchImpl) fetchImpl = fetchImplOrOptions.fetchImpl;
    if (fetchImplOrOptions.sessionToken !== undefined) {
      token = fetchImplOrOptions.sessionToken;
    }
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  let body: unknown;
  try {
    const response = await (fetchImpl ?? fetch)(PLACE_ORDER_PATH, {
      method: "POST",
      headers,
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
