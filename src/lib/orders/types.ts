/**
 * Shared types for online orders (Phase 4).
 *
 * The order API (`POST /api/orders`), the order page (`/orders/[reference]`),
 * live tracking and order history all use these, so they agree on one shape.
 *
 * - Money is in Philippine pesos rounded to two decimals, like the cart
 *   (`src/lib/ordering/cart-pricing.ts`). The server works out every price
 *   and total from the live menu; the browser never sends a price to charge.
 * - Times are ISO 8601 strings, as the database returns them.
 * - Order ids are UUIDs. Item and size ids are the menu's own ids.
 */

import type {
  AddCartItemFailureReason,
  CartItemSelection,
  FulfillmentType,
} from "@/types/ordering";

// ---------------------------------------------------------------------------
// Status

/**
 * Every status an online order can have (`docs/execution-paths.md` §4.3).
 *
 * TODO: Confirm with Brew ni Cat owner. The exact status names, and when the
 * customer or the shop may cancel an order.
 */
export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses an order never leaves, so tracking can stop listening for changes. */
export const FINAL_ORDER_STATUSES = [
  "rejected",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[];

const STATUS_SET: ReadonlySet<string> = new Set(ORDER_STATUSES);
const FINAL_STATUS_SET: ReadonlySet<OrderStatus> = new Set(
  FINAL_ORDER_STATUSES,
);

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function isFinalOrderStatus(status: OrderStatus): boolean {
  return FINAL_STATUS_SET.has(status);
}

/**
 * Who made a status change: the customer, shop staff (from the POS), or the
 * system for automatic changes.
 */
export type OrderActor = "customer" | "shop" | "system";

// ---------------------------------------------------------------------------
// Reference and tracking token

/** Every order reference starts with this, as in `BNC-7K2Q9F`. */
export const ORDER_REFERENCE_PREFIX = "BNC-";

/**
 * Characters after the prefix: digits and capital letters without 0, 1, I, L
 * and O, which are easy to misread when a customer reads the reference out.
 */
export const ORDER_REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Number of characters after the prefix. */
export const ORDER_REFERENCE_LENGTH = 6;

const ORDER_REFERENCE_PATTERN = new RegExp(
  `^${ORDER_REFERENCE_PREFIX}[${ORDER_REFERENCE_ALPHABET}]{${ORDER_REFERENCE_LENGTH}}$`,
);

/**
 * True for a well-formed order reference. The reference is not secret
 * (FR-025): customers say it at the counter. Reading an order online also
 * needs its tracking token.
 */
export function isOrderReference(value: unknown): value is string {
  return typeof value === "string" && ORDER_REFERENCE_PATTERN.test(value);
}

/**
 * Length of a tracking token: 32 random bytes written as base64url without
 * padding.
 */
export const TRACKING_TOKEN_LENGTH = 43;

const TRACKING_TOKEN_PATTERN = new RegExp(
  `^[A-Za-z0-9_-]{${TRACKING_TOKEN_LENGTH}}$`,
);

/**
 * True for a well-formed tracking token. The token is the secret part of a
 * guest's order link (FR-045): with the reference, it shows that one order.
 * Never log it or show it to anyone but the customer.
 */
export function isTrackingToken(value: unknown): value is string {
  return typeof value === "string" && TRACKING_TOKEN_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Live status updates

/** Every order's Realtime topic starts with this, as in `order:3kQ…`. */
export const ORDER_REALTIME_TOPIC_PREFIX = "order:";

/** Number of random base64url characters after the topic prefix. */
export const ORDER_REALTIME_TOPIC_LENGTH = 22;

const ORDER_REALTIME_TOPIC_PATTERN = new RegExp(
  `^${ORDER_REALTIME_TOPIC_PREFIX}[A-Za-z0-9_-]{${ORDER_REALTIME_TOPIC_LENGTH}}$`,
);

/**
 * Broadcast event the database sends on an order's topic after each status
 * change. The payload is only `{ status, changedAt }`: treat it as a sign to
 * read the order again, never as the order itself.
 */
export const ORDER_STATUS_CHANGED_EVENT = "status-changed";

/** True for a well-formed order Realtime topic. */
export function isOrderRealtimeTopic(value: unknown): value is string {
  return typeof value === "string" && ORDER_REALTIME_TOPIC_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Customer details

/**
 * How the customer will pay at the counter: the same two choices as checkout.
 * Online payment is Deferred (FR-029), so no payment happens in the app.
 */
export const PAYMENT_PREFERENCES = ["Cash", "GCash"] as const;

export type PaymentPreference = (typeof PAYMENT_PREFERENCES)[number];

const PAYMENT_PREFERENCE_SET: ReadonlySet<string> = new Set(
  PAYMENT_PREFERENCES,
);

export function isPaymentPreference(
  value: unknown,
): value is PaymentPreference {
  return typeof value === "string" && PAYMENT_PREFERENCE_SET.has(value);
}

/**
 * Online orders are pickup only. Rider delivery keeps the copied order
 * summary, because a local rider orders at the shop for the customer
 * (FR-030 is Deferred).
 */
export type OnlineOrderFulfillment = Extract<FulfillmentType, "pickup">;

/** What the customer enters at checkout for an online pickup order. */
export type OrderCustomer = Readonly<{
  name: string;
  /** Philippine mobile number, as `validatePhoneNumber` accepts it. */
  phone: string;
  /** Special instructions or a preferred pickup time; `""` when left empty. */
  notes: string;
  paymentPreference: PaymentPreference;
}>;

// ---------------------------------------------------------------------------
// Orders

/**
 * One line of a placed order. Names and prices are copied from the menu when
 * the order is placed, so a later menu change never changes a past order.
 * It has the same fields as a cart line, without the cart's `key`.
 */
export type OrderItemSnapshot = Readonly<{
  itemId: string;
  itemName: string;
  variantId: string;
  variantName: string;
  /** `null` when the line has no flavor. */
  flavor: string | null;
  /** In pesos, from the menu when the order was placed. */
  unitPrice: number;
  quantity: number;
  /** `unitPrice * quantity`, in pesos. */
  lineTotal: number;
}>;

/** One saved status change (`docs/execution-paths.md` §4.3). */
export type OrderStatusHistoryEntry = Readonly<{
  /** `null` on the first entry, which is saved with the new order. */
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actor: OrderActor;
  changedAt: string;
  /** Links the change to the request that made it, for troubleshooting. */
  correlationId: string;
}>;

/** An online order as the shop sees it. */
export type OnlineOrder = Readonly<{
  /** UUID. Never shown to customers. */
  id: string;
  reference: string;
  status: OrderStatus;
  fulfillment: OnlineOrderFulfillment;
  /** The signed-in customer's user id, or `null` for a guest order. */
  customerId: string | null;
  customer: OrderCustomer;
  items: readonly OrderItemSnapshot[];
  /**
   * Sum of the line totals, in pesos. As at checkout, the takeout box charge
   * is not included.
   */
  subtotal: number;
  /** Total quantity across all lines. */
  itemCount: number;
  /** Customer-safe reason when the shop rejects the order (FR-027). */
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}>;

/** One step in the status timeline a customer sees. */
export type OrderStatusEvent = Readonly<{
  status: OrderStatus;
  changedAt: string;
}>;

/**
 * What a customer sees for one order: the order page after Place order and,
 * later, live tracking. A guest gets it with the reference and the tracking
 * token. It leaves out the phone number and internal ids, because a guest can
 * forward the link.
 */
export type OrderView = Readonly<{
  reference: string;
  status: OrderStatus;
  fulfillment: OnlineOrderFulfillment;
  customerName: string;
  paymentPreference: PaymentPreference;
  notes: string;
  items: readonly OrderItemSnapshot[];
  subtotal: number;
  itemCount: number;
  rejectionReason: string | null;
  createdAt: string;
  /** Oldest first. The first event is always `pending`. */
  statusHistory: readonly OrderStatusEvent[];
  /**
   * Realtime Broadcast topic for this order's status changes. It is random
   * for each order and only comes with an authorized read, so only someone
   * who can see the order learns it. Listen for
   * {@link ORDER_STATUS_CHANGED_EVENT} on it.
   */
  realtimeTopic: string;
}>;

// ---------------------------------------------------------------------------
// Place order (`POST /api/orders`)

/**
 * Request body for Place order. It carries what the customer picked, never a
 * price: the server prices every line from the live menu (FR-021).
 */
export type PlaceOrderRequest = Readonly<{
  /**
   * A random UUID made once per checkout and sent again on every retry, so a
   * double tap or a retry never creates a second order (FR-024).
   */
  idempotencyKey: string;
  fulfillment: OnlineOrderFulfillment;
  customer: OrderCustomer;
  lines: readonly CartItemSelection[];
  /**
   * The subtotal the customer saw, in pesos. The server only compares it: if
   * the menu price changed, it answers `price-changed` with the new subtotal,
   * and the customer confirms before placing the order again.
   */
  expectedSubtotal: number;
}>;

/** The order was saved, or a retry with the same key found it. */
export type PlaceOrderSuccess = Readonly<{
  ok: true;
  reference: string;
  /** Secret. It goes only into the customer's order link. */
  trackingToken: string;
  /** `pending` for a new order. A retry gets the order's current status. */
  status: OrderStatus;
  createdAt: string;
}>;

/** A line the server could not order, by its position in `lines`. */
export type PlaceOrderLineProblem = Readonly<{
  index: number;
  reason: AddCartItemFailureReason;
}>;

/** Customer-safe message for each checkout field that failed. */
export type OrderFieldErrors = Readonly<
  Partial<Record<"name" | "phone" | "notes", string>>
>;

type PlaceOrderFailureOf<TReason extends string> = Readonly<{
  ok: false;
  reason: TReason;
  /** Customer-safe message to show. */
  message: string;
}>;

/**
 * Why an order was not placed. After a `server-error` the outcome may be
 * unknown, so the client retries with the same idempotency key, which returns
 * the order if it was saved.
 */
export type PlaceOrderFailure =
  | PlaceOrderFailureOf<"invalid-request" | "empty-cart" | "server-error">
  | (PlaceOrderFailureOf<"invalid-details"> &
      Readonly<{ fieldErrors: OrderFieldErrors }>)
  | (PlaceOrderFailureOf<"line-unavailable"> &
      Readonly<{ lines: readonly PlaceOrderLineProblem[] }>)
  | (PlaceOrderFailureOf<"price-changed"> & Readonly<{ subtotal: number }>);

export type PlaceOrderFailureReason = PlaceOrderFailure["reason"];

export type PlaceOrderResult = PlaceOrderSuccess | PlaceOrderFailure;
