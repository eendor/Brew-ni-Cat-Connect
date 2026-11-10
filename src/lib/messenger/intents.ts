/**
 * What a Messenger message asks for (FR-059 to FR-063).
 *
 * The assistant works with buttons (emerging technologies §7.2: buttons
 * before free text). A tapped button sends a fixed payload. Typed text is
 * read in only three cases: an order link, for the order's status; a
 * button's name typed on its own ("menu po", "hi"), which works like the
 * button; and "order" with a mobile number, to start an order. Anything
 * else is left for the shop's staff, so the assistant never guesses what a
 * customer or a rider means.
 */

import {
  isOrderReference,
  isTrackingToken,
  ORDER_REFERENCE_ALPHABET,
  ORDER_REFERENCE_LENGTH,
  ORDER_REFERENCE_PREFIX,
  TRACKING_TOKEN_LENGTH,
} from "@/lib/orders/types";

import {
  decodeOrderPayload,
  ORDER_PAYLOAD_PREFIX,
  parsePhone,
  PHONE_PAYLOAD_PATTERN,
  type OrderTap,
} from "./order-state";

export const INTENTS = [
  "welcome",
  "order",
  "menu",
  "hours-location",
  "how-to-order",
  "order-status",
  "staff",
] as const;

export type Intent = (typeof INTENTS)[number];

/** Button payloads. Meta sends one back when a customer taps its button. */
export const PAYLOADS: Readonly<Record<Intent, string>> = {
  welcome: "GET_STARTED",
  order: "ORDER_HERE",
  menu: "MENU",
  "hours-location": "HOURS_LOCATION",
  "how-to-order": "HOW_TO_ORDER",
  "order-status": "ORDER_STATUS",
  staff: "TALK_TO_STAFF",
};

/** A category button's payload carries the category id after this prefix. */
export const CATEGORY_PAYLOAD_PREFIX = "MENU_CATEGORY:";

const CATEGORY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** A status button's payload carries the order's reference and token. */
export const STATUS_PAYLOAD_PREFIX = "STATUS:";

export type ButtonTap =
  | Readonly<{ kind: "intent"; intent: Intent }>
  | Readonly<{ kind: "category"; categoryId: string }>
  /** A step of an order in the chat (`order-state.ts`). */
  | Readonly<{ kind: "order"; tap: OrderTap }>
  | Readonly<{ kind: "status"; reference: string; token: string }>
  /** The mobile number from Messenger's button; null when it isn't a PH one. */
  | Readonly<{
      kind: "phone";
      phone: string | null;
      /** The button sent no number at all (none on the Facebook account). */
      missing?: true;
    }>;

/** The payload of a "check status" button, or null for an invalid link. */
export function statusPayload(reference: string, token: string): string | null {
  return isOrderReference(reference) && isTrackingToken(token)
    ? `${STATUS_PAYLOAD_PREFIX}${reference}:${token}`
    : null;
}

export function categoryPayload(categoryId: string): string | null {
  return CATEGORY_ID_PATTERN.test(categoryId)
    ? `${CATEGORY_PAYLOAD_PREFIX}${categoryId}`
    : null;
}

/** The button a payload belongs to, or null for an unknown payload. */
export function readPayload(payload: unknown): ButtonTap | null {
  if (typeof payload !== "string") return null;
  if (payload.startsWith(CATEGORY_PAYLOAD_PREFIX)) {
    const categoryId = payload.slice(CATEGORY_PAYLOAD_PREFIX.length);
    return CATEGORY_ID_PATTERN.test(categoryId)
      ? { kind: "category", categoryId }
      : null;
  }
  if (payload.startsWith(ORDER_PAYLOAD_PREFIX)) {
    const tap = decodeOrderPayload(payload);
    return tap ? { kind: "order", tap } : null;
  }
  if (payload.startsWith(STATUS_PAYLOAD_PREFIX)) {
    const [reference, token, ...extra] = payload
      .slice(STATUS_PAYLOAD_PREFIX.length)
      .split(":");
    return extra.length === 0 &&
      isOrderReference(reference) &&
      isTrackingToken(token)
      ? { kind: "status", reference, token }
      : null;
  }
  const intent = INTENTS.find((name) => PAYLOADS[name] === payload);
  if (intent) return { kind: "intent", intent };
  // Messenger's "mobile number" button sends the number as its payload.
  // A number that isn't a Philippine mobile can't be used either, and the
  // button would send the same one again, so it isn't offered again.
  if (PHONE_PAYLOAD_PATTERN.test(payload)) {
    const phone = parsePhone(payload, true);
    if (phone) return { kind: "phone", phone };
    logUnusablePhone(payload);
    return { kind: "phone", phone: null, missing: true };
  }
  // The phone button sent something we can't use as a number (empty, or
  // its label), so ask for the number again.
  if (payload.trim() === "" || /\d|phone|number/i.test(payload)) {
    logUnusablePhone(payload);
    return { kind: "phone", phone: null, missing: true };
  }
  return null;
}

/**
 * The format of a phone button payload we couldn't use, with every digit
 * shown as "d" and every letter as "a", so the number itself is never logged.
 */
export function phoneShape(payload: string): string {
  return payload.slice(0, 30).replace(/\p{L}/gu, "a").replace(/\d/g, "d");
}

function logUnusablePhone(payload: string): void {
  console.info(
    JSON.stringify({
      event: "messenger-phone-button-unusable",
      shape: phoneShape(payload),
      length: payload.length,
    }),
  );
}

/** Lowercase words, without accents or punctuation: "Menu?" → "menu". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Typed button names ---------------------------------------------------------

/**
 * Only a short message can work like a button or ask about an order by its
 * reference. Longer messages are for the staff, even when they name a button.
 */
export const MAX_SHORT_MESSAGE_LENGTH = 60;

/** Polite words around a button name: "menu po", "hi admin". */
const POLITE_WORDS = new Set([
  "po",
  "poh",
  "please",
  "pls",
  "plz",
  "admin",
  "sir",
  "maam",
  "mam",
  "ate",
  "kuya",
  "there",
  "everyone",
]);

const GREETINGS = [
  "hi",
  "hii",
  "hiii",
  "hello",
  "helo",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "good day",
  "kumusta",
  "kamusta",
  "musta",
];

/**
 * Typed text that works like a button, after polite words are removed. Every
 * button title is here too (a test checks it), so a customer can type what a
 * button says.
 */
const TYPED_BUTTONS: ReadonlyMap<string, Intent> = new Map<string, Intent>([
  ...GREETINGS.map((greeting) => [greeting, "welcome"] as const),
  ["order", "order"],
  ["order here", "order"],
  ["order now", "order"],
  ["new order", "order"],
  ["start order", "order"],
  ["place order", "order"],
  ["magorder", "order"],
  ["mag order", "order"],
  ["start", "welcome"],
  ["get started", "welcome"],
  ["help", "welcome"],
  ["options", "welcome"],
  ["buttons", "welcome"],
  ["menu", "menu"],
  ["menu prices", "menu"],
  ["menu and prices", "menu"],
  ["prices", "menu"],
  ["price list", "menu"],
  ["hours", "hours-location"],
  ["location", "hours-location"],
  ["address", "hours-location"],
  ["hours location", "hours-location"],
  ["hours and location", "hours-location"],
  ["how to order", "how-to-order"],
  ["order status", "order-status"],
  ["status", "order-status"],
  ["track my order", "order-status"],
  ["talk to staff", "staff"],
  ["staff", "staff"],
]);

/** The words after a greeting: "hello menu" → ["menu"]. */
function afterGreeting(words: readonly string[]): readonly string[] {
  const phrase = words.join(" ");
  const greeting = GREETINGS.find((start) => phrase.startsWith(`${start} `));
  return greeting ? words.slice(greeting.split(" ").length) : words;
}

/** The button a short typed message names, or null for any other text. */
export function typedButton(text: string): Intent | null {
  if (text.length > MAX_SHORT_MESSAGE_LENGTH) return null;
  const words = normalizeText(text)
    .split(" ")
    .filter((word) => word !== "" && !POLITE_WORDS.has(word));
  if (words.length === 0) return null;
  return (
    TYPED_BUTTONS.get(words.join(" ")) ??
    TYPED_BUTTONS.get(afterGreeting(words).join(" ")) ??
    null
  );
}

/** "order 09171234567": starts an order with the number typed after it. */
const TYPED_ORDER_PATTERN =
  /^\s*(?:order|mag\s?order)\b[\s:,-]*(\+?[\d][\d\s().-]*)$/i;

/** A message that is only a number: "0917 123 4567". */
const BARE_NUMBER_PATTERN = /^\s*\+?\d[\d\s().-]*$/;

/**
 * The mobile number in a short "order <number>" message, or null.
 * Update 2026-11-11: a message that is only a Philippine mobile number counts
 * too, since customers often reply with just the number. Other bare numbers
 * (landlines, short codes) are still left to the staff.
 */
export function typedOrderPhone(text: string): string | null {
  if (text.length > MAX_SHORT_MESSAGE_LENGTH) return null;
  const number =
    TYPED_ORDER_PATTERN.exec(text)?.[1] ??
    (BARE_NUMBER_PATTERN.test(text) ? text : undefined);
  return number ? parsePhone(number) : null;
}

// Order links ---------------------------------------------------------------

const REFERENCE_SOURCE = `${ORDER_REFERENCE_PREFIX}[${ORDER_REFERENCE_ALPHABET}]{${ORDER_REFERENCE_LENGTH}}`;

const ORDER_LINK_PATTERN = new RegExp(
  `/orders/(${REFERENCE_SOURCE})#token=([A-Za-z0-9_-]{${TRACKING_TOKEN_LENGTH}})(?![A-Za-z0-9_-])`,
);

const REFERENCE_PATTERN = new RegExp(
  `(?<![A-Za-z0-9])${REFERENCE_SOURCE}(?![A-Za-z0-9])`,
  "i",
);

export type OrderPointer = Readonly<{
  reference: string;
  /** null when the message has only the reference, without the link. */
  token: string | null;
}>;

/**
 * The order a message points to: the full order link, with its tracking
 * token, or a bare reference such as "BNC-7K2Q9F".
 */
export function findOrderPointer(text: string): OrderPointer | null {
  const link = ORDER_LINK_PATTERN.exec(text);
  const reference = link?.[1];
  const token = link?.[2];
  if (isOrderReference(reference) && isTrackingToken(token)) {
    return { reference, token };
  }
  const bare = REFERENCE_PATTERN.exec(text)?.[0].toUpperCase();
  return isOrderReference(bare) ? { reference: bare, token: null } : null;
}
