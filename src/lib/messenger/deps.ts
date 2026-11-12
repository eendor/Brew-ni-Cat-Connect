/**
 * The live services behind the Messenger assistant: the saved site content
 * and the menu the website shows, the order lookup the order page uses, and
 * Meta's Send API with the Page access token.
 */

import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { loadMenuFacts } from "@/lib/menu/load-menu-facts";
import { fetchOrder } from "@/lib/orders/fetch-order";
import { isOnlineOrderingEnabled } from "@/lib/orders/online-ordering";
import { toPlaceOrderResponse } from "@/lib/orders/place-order-server";
import {
  isOrderReference,
  type OrderView,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from "@/lib/orders/types";
import { loadSiteContent } from "@/lib/site-content/load";
import {
  getPublicSupabaseClient,
  PublicSupabaseConfigurationError,
} from "@/lib/supabase/public-client";
import type { MenuCatalog } from "@/types/menu";

import type { MessengerDeps } from "./events";
import { deriveOrderIds, deriveTrackingToken } from "./order-ids";
import type { PlaceOrderInput } from "./order-flow";
import { createGraphClient } from "./send";

/** A slow database must not hold up the replies after it. */
const READ_TIMEOUT_MS = 5000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timed out.")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The menu as the website's Menu page loads it (FR-060): the same query,
 * mapping and shop-only filter, read fresh. null when it can't be read, so a
 * reply never shows a guessed price.
 */
export async function readWebsiteMenu(): Promise<MenuCatalog | null> {
  try {
    return await fetchPublicMenu(AbortSignal.timeout(READ_TIMEOUT_MS));
  } catch {
    return null;
  }
}

/** The take-out box price the order summary says is not in the total. */
async function readTakeoutBoxPrice(): Promise<number | null> {
  try {
    return (await loadMenuFacts()).takeoutBoxPrice;
  } catch {
    return null;
  }
}

/** Placing an order may take longer than a read. */
const PLACE_TIMEOUT_MS = 10_000;

/** Logs carry the correlation id and an error code, never the order. */
function logPlaceFailure(correlationId: string, code: string): void {
  console.error(
    JSON.stringify({
      event: "messenger-place-order-failed",
      correlationId,
      code,
    }),
  );
}

/**
 * Places a Messenger order with the website's database function (FR-107).
 * The idempotency key and tracking token come from the app secret, the
 * customer and the summary's number, so a repeated tap or a retry gets the
 * order that was saved and never a second one. null when the outcome is
 * unknown.
 */
export async function placeMessengerOrder(
  appSecret: string,
  sender: string,
  nonce: string,
  order: PlaceOrderInput,
): Promise<PlaceOrderResult | null> {
  const correlationId = crypto.randomUUID();
  const { idempotencyKey, trackingToken } = deriveOrderIds(
    appSecret,
    sender,
    nonce,
  );
  const request: PlaceOrderRequest = {
    idempotencyKey,
    trackingToken,
    fulfillment: "pickup",
    customer: order.customer,
    lines: order.lines,
    expectedSubtotal: order.expectedSubtotal,
  };

  let supabase: ReturnType<typeof getPublicSupabaseClient>;
  try {
    supabase = getPublicSupabaseClient(null);
  } catch (error) {
    if (!(error instanceof PublicSupabaseConfigurationError)) throw error;
    logPlaceFailure(correlationId, "not-configured");
    return null;
  }
  try {
    const answer = await supabase
      .rpc("place_online_order", {
        p_request: request,
        p_correlation_id: correlationId,
      })
      .abortSignal(AbortSignal.timeout(PLACE_TIMEOUT_MS));
    if (answer.error) {
      logPlaceFailure(correlationId, answer.error.code || "rpc-error");
      return null;
    }
    const response = toPlaceOrderResponse(answer.data, trackingToken);
    if (response === null)
      logPlaceFailure(correlationId, "unexpected-response");
    return response?.result ?? null;
  } catch {
    logPlaceFailure(correlationId, "rpc-unreachable");
    return null;
  }
}

/** The most orders the status reply lists. */
export const MY_ORDERS_LIMIT = 3;

const isListedOrder = (value: unknown): value is OrderView => {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    isOrderReference(order.reference) &&
    typeof order.status === "string" &&
    Array.isArray(order.items) &&
    typeof order.subtotal === "number"
  );
};

/**
 * The orders this customer placed in the chat (FR-110). The database finds
 * them by the customer's tracking token, which only the app secret and their
 * Messenger ID can make, so no order number or link is needed. null when
 * they can't be read, so a reply never says there are none. Only a code is
 * logged, never the token or the customer's ID.
 */
export async function listMessengerOrders(
  appSecret: string,
  sender: string,
): Promise<OrderView[] | null> {
  try {
    const answer = await getPublicSupabaseClient(null)
      .rpc("list_online_orders_by_token", {
        p_tracking_token: deriveTrackingToken(appSecret, sender),
        p_limit: MY_ORDERS_LIMIT,
      })
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
    if (answer.error || !Array.isArray(answer.data)) {
      console.error(
        "Messenger order list failed:",
        answer.error?.code || "unexpected-response",
      );
      return null;
    }
    return answer.data.filter(isListedOrder);
  } catch {
    console.error("Messenger order list failed:", "rpc-unreachable");
    return null;
  }
}

const NONCE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 16 random letters and digits: one order summary's number. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => NONCE_ALPHABET[byte % 62]).join("");
}

export function createMessengerDeps(
  origin: string,
  pageToken: string,
  appSecret: string,
): MessengerDeps {
  const graph = createGraphClient(pageToken);
  return {
    origin,
    now: () => Date.now(),
    onlineOrdering: isOnlineOrderingEnabled,
    readContent: async () => (await loadSiteContent()).content,
    readMenu: readWebsiteMenu,
    lookupOrder: (reference, token) =>
      withTimeout(fetchOrder(reference, token), READ_TIMEOUT_MS),
    lookupMyOrders: (sender) => listMessengerOrders(appSecret, sender),
    send: graph.send,
    readCustomerName: graph.customerName,
    readTakeoutBoxPrice,
    newNonce,
    placeOrder: (sender, nonce, order) =>
      placeMessengerOrder(appSecret, sender, nonce, order),
  };
}
