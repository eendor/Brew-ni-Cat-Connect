/**
 * `POST /api/orders`: Place order for an online pickup order (FR-021,
 * FR-022, FR-024, FR-025).
 *
 * The database function `public.place_online_order` does the work in one
 * transaction: it checks the details, prices every line from the live menu,
 * returns the saved order for a retry with the same idempotency key, and
 * saves the order, its lines, the first status history entry and the
 * tracking token's hash. This route calls it with the publishable key only
 * (FR-037), so it runs as the `anon` role.
 *
 * Logs carry the correlation id and an error code, never the request body,
 * the tracking token, or the customer's name or phone number.
 */

import { isOnlineOrderingEnabled } from "@/lib/orders/online-ordering";
import {
  ORDERING_UNAVAILABLE_MESSAGE,
  placeOrderFailure,
} from "@/lib/orders/place-order";
import {
  readPlaceOrderBody,
  toPlaceOrderResponse,
} from "@/lib/orders/place-order-server";
import type { PlaceOrderResult } from "@/lib/orders/types";
import {
  getPublicSupabaseClient,
  PublicSupabaseConfigurationError,
} from "@/lib/supabase/public-client";

function logFailure(correlationId: string, code: string): void {
  console.error(
    JSON.stringify({ event: "place-order-failed", correlationId, code }),
  );
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const respond = (result: PlaceOrderResult, status: number) =>
    Response.json(result, {
      status,
      headers: {
        "cache-control": "no-store",
        "x-correlation-id": correlationId,
      },
    });

  if (!isOnlineOrderingEnabled()) {
    return respond(
      placeOrderFailure("server-error", ORDERING_UNAVAILABLE_MESSAGE),
      503,
    );
  }

  const body = await readPlaceOrderBody(request);
  if (!body.ok) {
    return respond(placeOrderFailure("invalid-request"), body.status);
  }

  let supabase: ReturnType<typeof getPublicSupabaseClient>;
  try {
    supabase = getPublicSupabaseClient();
  } catch (error) {
    if (!(error instanceof PublicSupabaseConfigurationError)) throw error;
    logFailure(correlationId, "not-configured");
    return respond(
      placeOrderFailure("server-error", ORDERING_UNAVAILABLE_MESSAGE),
      503,
    );
  }

  let data: unknown;
  try {
    const answer = await supabase.rpc("place_online_order", {
      p_request: body.request,
      p_correlation_id: correlationId,
    });
    if (answer.error) {
      logFailure(correlationId, answer.error.code || "rpc-error");
      return respond(placeOrderFailure("server-error"), 502);
    }
    data = answer.data;
  } catch {
    logFailure(correlationId, "rpc-unreachable");
    return respond(placeOrderFailure("server-error"), 502);
  }

  const response = toPlaceOrderResponse(data, body.trackingToken);
  if (response === null) {
    logFailure(correlationId, "unexpected-response");
    return respond(placeOrderFailure("server-error"), 502);
  }

  return respond(response.result, response.status);
}
