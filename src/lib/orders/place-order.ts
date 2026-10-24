/**
 * Place order (`POST /api/orders`): the parts the browser and the server
 * share.
 *
 * - The browser makes an idempotency key and a tracking token for each order
 *   it tries to place, and sends the same pair again on a retry (FR-024).
 * - The request names what the customer picked, never a price to charge
 *   (FR-021). The database prices every line from the live menu.
 * - Every message here is safe to show a customer.
 */

import { DETAILS_ERROR_MESSAGES } from "@/lib/ordering/validation";
import {
  isOrderReference,
  isOrderStatus,
  isTrackingToken,
  type OrderCustomer,
  type PlaceOrderFailure,
  type PlaceOrderFailureReason,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from "@/lib/orders/types";
import type { AddCartItemFailureReason, CartItem } from "@/types/ordering";

/** Where the browser sends Place order. */
export const PLACE_ORDER_PATH = "/api/orders";

/** Longest name the database keeps for an order, after trimming. */
export const MAX_CUSTOMER_NAME_LENGTH = 100;

/** Longest order notes the database keeps, after trimming. */
export const MAX_ORDER_NOTES_LENGTH = 500;

export const PLACE_ORDER_MESSAGES: Readonly<
  Record<PlaceOrderFailureReason, string>
> = {
  "invalid-request":
    "We couldn't read your order. Please refresh the page and try again.",
  "empty-cart": "Your cart is empty. Add items before placing an order.",
  "invalid-details": "Please check your details, then place your order again.",
  "line-unavailable":
    "Some items in your cart can't be ordered right now. Check your cart, then place your order again.",
  "price-changed":
    "Prices changed since you added these items. Check the new subtotal, then place your order again.",
  "server-error": "We couldn't place your order. Please try again.",
};

/** When online ordering is off or the order service is not set up. */
export const ORDERING_UNAVAILABLE_MESSAGE =
  "Online ordering isn't available right now. Please message the shop on Facebook or call to order.";

/** Message for each field problem the database reports. */
export const FIELD_ERROR_MESSAGES = {
  name: {
    required: DETAILS_ERROR_MESSAGES.nameRequired,
    "too-long": `Please keep your name to ${MAX_CUSTOMER_NAME_LENGTH} characters or fewer.`,
  },
  phone: {
    required: DETAILS_ERROR_MESSAGES.phoneRequired,
    invalid: DETAILS_ERROR_MESSAGES.phoneInvalid,
  },
  notes: {
    "too-long": `Please keep your notes to ${MAX_ORDER_NOTES_LENGTH} characters or fewer.`,
  },
} as const;

const LINE_PROBLEM_REASONS: Readonly<Record<AddCartItemFailureReason, true>> = {
  "unknown-item": true,
  "unknown-variant": true,
  "unknown-flavor": true,
  "item-unavailable": true,
  "availability-unknown": true,
  "missing-price": true,
  "invalid-quantity": true,
};

export function isLineProblemReason(
  value: unknown,
): value is AddCartItemFailureReason {
  return (
    typeof value === "string" && Object.hasOwn(LINE_PROBLEM_REASONS, value)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A failure with its customer-safe message. */
export function placeOrderFailure(
  reason: "invalid-request" | "empty-cart" | "server-error",
  message: string = PLACE_ORDER_MESSAGES[reason],
): PlaceOrderFailure {
  return { ok: false, reason, message };
}

// ---------------------------------------------------------------------------
// Keys and tokens

type RandomSource = Pick<Crypto, "getRandomValues">;

/**
 * A random UUID (version 4) for one order. Made from `getRandomValues`
 * because `crypto.randomUUID` is missing on plain-HTTP pages, such as a phone
 * testing the site over the local network.
 */
export function createIdempotencyKey(
  random: RandomSource = globalThis.crypto,
): string {
  const bytes = random.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/** A tracking token: 32 random bytes as base64url without padding. */
export function createTrackingToken(
  random: RandomSource = globalThis.crypto,
): string {
  const bytes = random.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Request

/** A Place order request without its idempotency key and tracking token. */
export type OrderDraft = Omit<
  PlaceOrderRequest,
  "idempotencyKey" | "trackingToken"
>;

/**
 * What the customer is ordering: their details, what they picked, and the
 * subtotal they were shown. Two drafts with the same JSON are the same order,
 * so a retry can reuse the first try's key and token.
 */
export function buildOrderDraft(
  customer: OrderCustomer,
  lines: readonly CartItem[],
  expectedSubtotal: number,
): OrderDraft {
  return {
    fulfillment: "pickup",
    customer: {
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
      paymentPreference: customer.paymentPreference,
    },
    lines: lines.map((line) => ({
      itemId: line.itemId,
      variantId: line.variantId,
      flavor: line.flavor,
      quantity: line.quantity,
    })),
    expectedSubtotal,
  };
}

// ---------------------------------------------------------------------------
// Response

function isFieldErrors(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(
      ([field, message]) =>
        (field === "name" || field === "phone" || field === "notes") &&
        typeof message === "string",
    )
  );
}

function isLineProblem(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.index) &&
    (value.index as number) >= 0 &&
    isLineProblemReason(value.reason)
  );
}

/** True for a response body the order API sends. */
export function isPlaceOrderResult(value: unknown): value is PlaceOrderResult {
  if (!isRecord(value)) return false;

  if (value.ok === true) {
    return (
      isOrderReference(value.reference) &&
      isTrackingToken(value.trackingToken) &&
      isOrderStatus(value.status) &&
      typeof value.createdAt === "string"
    );
  }

  if (
    value.ok !== false ||
    typeof value.message !== "string" ||
    typeof value.reason !== "string" ||
    !Object.hasOwn(PLACE_ORDER_MESSAGES, value.reason)
  ) {
    return false;
  }

  switch (value.reason) {
    case "invalid-details":
      return isFieldErrors(value.fieldErrors);
    case "line-unavailable":
      return (
        Array.isArray(value.lines) &&
        value.lines.length > 0 &&
        value.lines.every(isLineProblem)
      );
    case "price-changed":
      return (
        typeof value.subtotal === "number" &&
        Number.isFinite(value.subtotal) &&
        value.subtotal >= 0
      );
    default:
      return true;
  }
}
