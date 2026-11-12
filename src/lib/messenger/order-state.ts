/**
 * The order a customer builds in Messenger (FR-100 to FR-109).
 *
 * The assistant keeps nothing between messages, so the order travels inside
 * the buttons: each button's payload holds the customer's mobile number, the
 * items so far and the step's own choices. Meta sends the payload back
 * unchanged when the button is tapped. Every payload is read strictly, and
 * the shop's menu and database check the order again when it is placed.
 */

/** Meta's limit for a button or quick reply payload, in characters. */
export const MAX_PAYLOAD_LENGTH = 1000;

/**
 * The order so far may take this much of a payload, which leaves room for
 * the step's own choices. A longer order is placed first, then the next one
 * is started.
 */
export const MAX_STATE_LENGTH = 560;

/** Technical limits for chat, not shop policy (the shop has set none). */
export const MAX_LINE_QUANTITY = 99;
export const MAX_ORDER_LINES = 12;

/** An order summary can be placed for this long after it was shown. */
export const REVIEW_MAX_AGE_MINUTES = 60;

export const ORDER_PAYLOAD_PREFIX = "ORD:";

export const ORDER_OPS = [
  "cats",
  "cat",
  "item",
  "pick",
  "qty",
  "cart",
  "rmask",
  "rm",
  "clear",
  "pay",
  "paid",
  "when",
  "place",
] as const;

export type OrderOp = (typeof ORDER_OPS)[number];

export const PAYMENTS = ["Cash", "GCash"] as const;
export type Payment = (typeof PAYMENTS)[number];

export const PICKUPS = ["asap", "30m", "1h"] as const;
export type Pickup = (typeof PICKUPS)[number];

/** How a pickup choice reads in the chat and in the order's note. */
export const PICKUP_TEXT: Readonly<Record<Pickup, string>> = {
  asap: "as soon as possible",
  "30m": "in about 30 minutes",
  "1h": "in about 1 hour",
};

export type OrderLine = Readonly<{
  itemId: string;
  variantId: string;
  /** The stored flavor text: flavors, then add-ons (the same as the POS). */
  flavor: string | null;
  quantity: number;
}>;

export type OrderState = Readonly<{
  /** Local form, 09XXXXXXXXX. */
  phone: string;
  lines: readonly OrderLine[];
  payment: Payment | null;
  pickup: Pickup | null;
  /** Made when the summary is shown; it makes a double tap one order. */
  nonce: string | null;
  /** Minutes since 1970 when the summary was shown. */
  reviewedAt: number | null;
}>;

export type OrderTap = Readonly<{
  op: OrderOp;
  state: OrderState;
  args: readonly unknown[];
}>;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const NONCE_PATTERN = /^[A-Za-z0-9]{8,32}$/;
const PHONE_PATTERN = /^09\d{9}$/;
const MAX_TEXT = 200;

export function newOrder(phone: string): OrderState {
  return {
    phone,
    lines: [],
    payment: null,
    pickup: null,
    nonce: null,
    reviewedAt: null,
  };
}

// Phone numbers -------------------------------------------------------------

/**
 * A Philippine mobile number in its local form, 09XXXXXXXXX, or null. Typed
 * text must be a whole number; a button's number may also omit the 0.
 */
export function parsePhone(text: string, buttonNumber = false): string | null {
  const cleaned = text.replace(/[\s().-]/g, "");
  const match =
    /^(?:\+?63|0063|0)(9\d{9})$/.exec(cleaned) ??
    (buttonNumber ? /^(9\d{9})$/.exec(cleaned) : null);
  return match?.[1] ? `0${match[1]}` : null;
}

/** What Meta sends back for the "phone number" quick reply. */
export const PHONE_PAYLOAD_PATTERN = /^\+?[\d\s().-]{7,25}$/;

// Encoding ------------------------------------------------------------------

function stateParts(state: OrderState): unknown[] {
  const tail: unknown[] = [
    state.payment,
    state.pickup,
    state.nonce,
    state.reviewedAt,
  ];
  while (tail.length > 0 && tail.at(-1) === null) tail.pop();
  return [
    state.phone,
    state.lines.map((line) => [
      line.itemId,
      line.variantId,
      line.flavor,
      line.quantity,
    ]),
    ...tail,
  ];
}

/** True when the order so far leaves room in a payload for a step's choices. */
export const fitsInPayload = (state: OrderState) =>
  JSON.stringify(stateParts(state)).length <= MAX_STATE_LENGTH;

/**
 * A button payload for a step, or null when it would be too long for Meta.
 * A choice that can't be carried is left out; the website has every choice.
 */
export function encodeOrderPayload(
  op: OrderOp,
  state: OrderState,
  args: readonly unknown[] = [],
): string | null {
  const payload = `${ORDER_PAYLOAD_PREFIX}${op}:${JSON.stringify({
    s: stateParts(state),
    a: args,
  })}`;
  return payload.length <= MAX_PAYLOAD_LENGTH ? payload : null;
}

// Decoding ------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MAX_TEXT;

function readLine(value: unknown): OrderLine | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const [itemId, variantId, flavor, quantity] = value as unknown[];
  if (
    typeof itemId !== "string" ||
    !ID_PATTERN.test(itemId) ||
    typeof variantId !== "string" ||
    !ID_PATTERN.test(variantId) ||
    !(flavor === null || isText(flavor)) ||
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_LINE_QUANTITY
  ) {
    return null;
  }
  return { itemId, variantId, flavor, quantity };
}

function readState(value: unknown): OrderState | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    return null;
  }
  const [
    phone,
    rawLines,
    payment = null,
    pickup = null,
    nonce = null,
    at = null,
  ] = value as unknown[];
  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone)) return null;
  if (!Array.isArray(rawLines) || rawLines.length > MAX_ORDER_LINES) {
    return null;
  }
  const lines = rawLines.map(readLine);
  if (lines.some((line) => line === null)) return null;
  if (
    !(payment === null || PAYMENTS.some((entry) => entry === payment)) ||
    !(pickup === null || PICKUPS.some((entry) => entry === pickup)) ||
    !(
      nonce === null ||
      (typeof nonce === "string" && NONCE_PATTERN.test(nonce))
    ) ||
    !(
      at === null ||
      (typeof at === "number" && Number.isSafeInteger(at) && at > 0)
    )
  ) {
    return null;
  }
  return {
    phone,
    lines: lines as OrderLine[],
    payment: payment as Payment | null,
    pickup: pickup as Pickup | null,
    nonce: nonce as string | null,
    reviewedAt: at as number | null,
  };
}

/** The step a payload belongs to, or null when it isn't a valid order payload. */
export function decodeOrderPayload(payload: unknown): OrderTap | null {
  if (typeof payload !== "string" || payload.length > MAX_PAYLOAD_LENGTH) {
    return null;
  }
  if (!payload.startsWith(ORDER_PAYLOAD_PREFIX)) return null;
  const rest = payload.slice(ORDER_PAYLOAD_PREFIX.length);
  const colon = rest.indexOf(":");
  const op = ORDER_OPS.find((name) => name === rest.slice(0, colon));
  if (!op) return null;
  let body: unknown;
  try {
    body = JSON.parse(rest.slice(colon + 1));
  } catch {
    return null;
  }
  if (!isRecord(body) || !Array.isArray(body.a)) return null;
  const state = readState(body.s);
  return state ? { op, state, args: body.a as unknown[] } : null;
}

// Reading a step's choices --------------------------------------------------

export function argId(args: readonly unknown[], index: number): string | null {
  const value = args[index];
  return typeof value === "string" && ID_PATTERN.test(value) ? value : null;
}

export function argTexts(
  args: readonly unknown[],
  index: number,
): string[] | null {
  const value = args[index];
  return Array.isArray(value) && value.length <= 12 && value.every(isText)
    ? (value as string[])
    : null;
}

export function argInt(
  args: readonly unknown[],
  index: number,
  min: number,
  max: number,
): number | null {
  const value = args[index];
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

export function argChoice<T extends string>(
  args: readonly unknown[],
  index: number,
  choices: readonly T[],
): T | null {
  const value = args[index];
  return choices.find((choice) => choice === value) ?? null;
}

// Changing the order --------------------------------------------------------

/** The order's text and prices change, so an old summary can't be placed. */
const reopened = (state: OrderState): OrderState => ({
  ...state,
  payment: null,
  pickup: null,
  nonce: null,
  reviewedAt: null,
});

/** null when the order is full: too many items, or too long for a payload. */
export function addLine(state: OrderState, line: OrderLine): OrderState | null {
  const same = state.lines.findIndex(
    (entry) =>
      entry.itemId === line.itemId &&
      entry.variantId === line.variantId &&
      entry.flavor === line.flavor,
  );
  const lines =
    same >= 0
      ? state.lines.map((entry, index) =>
          index === same
            ? {
                ...entry,
                quantity: Math.min(
                  MAX_LINE_QUANTITY,
                  entry.quantity + line.quantity,
                ),
              }
            : entry,
        )
      : [...state.lines, line];
  if (lines.length > MAX_ORDER_LINES) return null;
  const next = { ...reopened(state), lines };
  return fitsInPayload(next) ? next : null;
}

export function removeLine(state: OrderState, index: number): OrderState {
  return {
    ...reopened(state),
    lines: state.lines.filter((_, position) => position !== index),
  };
}

export const clearLines = (state: OrderState): OrderState => ({
  ...reopened(state),
  lines: [],
});

export const withPayment = (
  state: OrderState,
  payment: Payment,
): OrderState => ({
  ...state,
  payment,
  pickup: null,
  nonce: null,
  reviewedAt: null,
});

export const withPickup = (state: OrderState, pickup: Pickup): OrderState => ({
  ...state,
  pickup,
  nonce: null,
  reviewedAt: null,
});

export const withReview = (
  state: OrderState,
  nonce: string,
  minutes: number,
): OrderState => ({ ...state, nonce, reviewedAt: minutes });
