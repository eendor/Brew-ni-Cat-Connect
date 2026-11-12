/**
 * Answers the Messenger events Meta sends to the webhook (FR-058 to FR-063,
 * NFR-018, NFR-022).
 *
 * It runs after the webhook has answered Meta, so a slow reply never delays
 * the acknowledgement. An event gets a reply only when it is:
 * - a customer's message or button tap, not the Page's own echo, a delivery
 *   or read receipt, or a handover event;
 * - from the last hour, which is as long as Meta retries, and not from the
 *   future;
 * - new: Meta can deliver an event twice, and it gets one reply;
 * - within the limits, per customer in 10 minutes: SENDER_REPLY_LIMIT
 *   replies, ORDER_LOOKUP_LIMIT order checks, ORDER_STEP_LIMIT steps of an
 *   order being built and PLACE_ORDER_LIMIT placed orders.
 *
 * The assistant answers button taps, typed button names, order links and
 * "order 09XXXXXXXXX", which starts an order inside the chat (FR-100), and
 * short questions about being open or the hours (added 2026-11-11). Every
 * other message is for the shop's staff: it gets no automated reply and is
 * never marked as seen, so it stays unread in the Page inbox and the staff's
 * Messenger and Business Suite apps notify them as before.
 *
 * Nothing a customer sends is stored or logged. Logs carry counts only.
 */

import { createRateLimiter } from "@/lib/orders/rate-limit";
import type { OrderView } from "@/lib/orders/types";
import type { SiteContent } from "@/lib/site-content/types";
import type { MenuCatalog } from "@/types/menu";

import {
  findOrderPointer,
  MAX_SHORT_MESSAGE_LENGTH,
  readPayload,
  typedButton,
  typedHoursQuestion,
  typedOrderPhone,
  type ButtonTap,
  type Intent,
} from "./intents";
import {
  answerOrderTap,
  beginOrder,
  orderIntentReply,
  resetOrderFlow,
  type OrderFlowDeps,
} from "./order-flow";
import {
  ASSISTANT_NOTICE,
  categoryReply,
  hoursLocationReply,
  howToOrderReply,
  menuReply,
  orderLimitReply,
  orderLinkNeededReply,
  orderNotFoundReply,
  myOrdersReply,
  noOrdersReply,
  orderStatusReply,
  orderUnavailableReply,
  staffReply,
  welcomeReply,
  withNotice,
  type Reply,
} from "./replies";

export type MessengerDeps = OrderFlowDeps &
  Readonly<{
    readContent: () => Promise<SiteContent>;
    /** null when the menu can't be read. */
    readMenu: () => Promise<MenuCatalog | null>;
    /** null when no order matches; throws when orders can't be checked. */
    lookupOrder: (
      reference: string,
      token: string,
    ) => Promise<OrderView | null>;
    /** The orders placed in this chat; null when they can't be read. */
    lookupMyOrders: (sender: string) => Promise<readonly OrderView[] | null>;
    /** True when Meta accepted the reply. */
    send: (recipient: string, answer: Reply) => Promise<boolean>;
  }>;

const MINUTE_MS = 60 * 1000;

export const EVENT_MAX_AGE_MS = 60 * MINUTE_MS;
export const EVENT_MAX_SKEW_MS = 5 * MINUTE_MS;
export const NOTICE_INTERVAL_MS = 24 * 60 * MINUTE_MS;
export const LIMIT_WINDOW_MS = 10 * MINUTE_MS;
export const SENDER_REPLY_LIMIT = 20;
export const ORDER_LOOKUP_LIMIT = 5;
/**
 * Taps while building an order. An order takes about 15 to 40 taps, so the
 * reply limit would cut it off. A technical limit (FR-109); the shop has set
 * none.
 */
export const ORDER_STEP_LIMIT = 150;
export const MAX_EVENTS_PER_DELIVERY = 100;

/** Only the start of a long message is read. */
const MAX_TEXT_INPUT = 1000;

/** Keys seen in the last `ttlMs`, keeping at most `capacity` of them. */
export function createRecentSet(capacity: number, ttlMs: number) {
  const added = new Map<string, number>();

  function prune(now: number): void {
    for (const [key, at] of added) {
      if (added.size < capacity && now - at < ttlMs) return;
      added.delete(key);
    }
  }

  return {
    has(key: string, now: number): boolean {
      const at = added.get(key);
      return at !== undefined && now - at < ttlMs;
    },
    add(key: string, now: number): void {
      added.delete(key);
      prune(now);
      added.set(key, now);
    },
    clear(): void {
      added.clear();
    },
  };
}

// Each server instance keeps its own copy, so these are best effort: a
// retry that reaches another instance can get a second reply.
const seenEvents = createRecentSet(2000, EVENT_MAX_AGE_MS);
const noticeShown = createRecentSet(5000, NOTICE_INTERVAL_MS);
const replyLimiter = createRateLimiter(SENDER_REPLY_LIMIT, LIMIT_WINDOW_MS);
const orderLookupLimiter = createRateLimiter(
  ORDER_LOOKUP_LIMIT,
  LIMIT_WINDOW_MS,
);
const orderStepLimiter = createRateLimiter(ORDER_STEP_LIMIT, LIMIT_WINDOW_MS);

/** Forgets seen events, notices and limits (tests). */
export function resetMessengerState(): void {
  seenEvents.clear();
  noticeShown.clear();
  replyLimiter.reset();
  orderLookupLimiter.reset();
  orderStepLimiter.reset();
  resetOrderFlow();
}

// Reading events ------------------------------------------------------------

type Json = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A customer's Page-scoped ID. */
const PSID_PATTERN = /^\d{1,32}$/;

const messageId = (value: unknown) =>
  typeof value === "string" && value.length > 0 && value.length <= 256
    ? value
    : null;

/** Milliseconds; Meta's examples also show seconds and numeric strings. */
export function eventTime(value: unknown): number | null {
  const time =
    typeof value === "string" && /^\d{1,16}$/.test(value)
      ? Number(value)
      : value;
  if (typeof time !== "number" || !Number.isFinite(time) || time <= 0) {
    return null;
  }
  return time < 1e11 ? time * 1000 : time;
}

type Input =
  | Readonly<{ kind: "tap"; payload: unknown }>
  | Readonly<{ kind: "text"; text: string }>
  /** A photo, a sticker or anything else without text. */
  | Readonly<{ kind: "other" }>;

type CustomerEvent = Readonly<{
  sender: string;
  time: number;
  key: string;
  input: Input;
}>;

function readEvent(event: unknown, pageId: unknown): CustomerEvent | null {
  if (!isRecord(event) || !isRecord(event.sender)) return null;
  const sender = event.sender.id;
  if (typeof sender !== "string" || !PSID_PATTERN.test(sender)) return null;
  if (sender === pageId) return null;
  const time = eventTime(event.timestamp);
  if (time === null) return null;

  const { message, postback } = event;
  if (isRecord(postback)) {
    return {
      sender,
      time,
      key: messageId(postback.mid) ?? `${sender}:${time}:postback`,
      input: { kind: "tap", payload: postback.payload },
    };
  }
  if (!isRecord(message) || message.is_echo === true) return null;
  const key = messageId(message.mid) ?? `${sender}:${time}:message`;
  if (isRecord(message.quick_reply)) {
    return {
      sender,
      time,
      key,
      input: { kind: "tap", payload: message.quick_reply.payload },
    };
  }
  if (typeof message.text === "string") {
    return { sender, time, key, input: { kind: "text", text: message.text } };
  }
  return { sender, time, key, input: { kind: "other" } };
}

// Answers -------------------------------------------------------------------

type Facts = Readonly<{
  content: () => Promise<SiteContent>;
  menu: () => Promise<MenuCatalog | null>;
}>;

/** Reads once per delivery, and only when a reply needs it. */
function once<T>(read: () => Promise<T>): () => Promise<T> {
  let result: Promise<T> | undefined;
  return () => (result ??= read());
}

/** A reply, and whether it is a step of an order being built. */
type Answer = Readonly<{ reply: Reply; ordering: boolean }>;

const plain = (reply: Reply): Answer => ({ reply, ordering: false });
const ordering = (reply: Reply): Answer => ({ reply, ordering: true });

async function answerIntent(
  sender: string,
  intent: Intent,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Answer> {
  switch (intent) {
    case "welcome":
      return plain(welcomeReply());
    case "order":
      return ordering(await orderIntentReply(deps, facts));
    case "menu":
      return plain(menuReply(await facts.menu(), deps.origin));
    case "hours-location":
      return plain(hoursLocationReply(await facts.content()));
    case "how-to-order":
      return plain(
        howToOrderReply(
          await facts.content(),
          deps.origin,
          deps.onlineOrdering(),
        ),
      );
    case "order-status":
      return plain(await checkMyOrders(sender, deps));
    case "staff":
      return plain(staffReply(await facts.content()));
  }
}

async function answerTap(
  sender: string,
  tap: ButtonTap | null,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Answer> {
  // An old or unknown button shows the buttons again.
  if (!tap) return plain(welcomeReply());
  switch (tap.kind) {
    case "intent":
      return answerIntent(sender, tap.intent, deps, facts);
    case "category":
      return plain(
        categoryReply(await facts.menu(), tap.categoryId, deps.origin),
      );
    case "order":
      return ordering(await answerOrderTap(sender, tap.tap, deps, facts));
    case "phone":
      return ordering(
        await beginOrder(tap.phone, deps, facts, tap.missing === true),
      );
    case "status":
      return plain(await checkOrder(sender, tap.reference, tap.token, deps));
  }
}

/**
 * FR-110: the orders placed in this chat, found by who is asking. No order
 * number or link is needed.
 */
async function checkMyOrders(
  sender: string,
  deps: MessengerDeps,
): Promise<Reply> {
  if (!orderLookupLimiter.check(sender, deps.now()).allowed) {
    return orderLimitReply();
  }
  const orders = await deps.lookupMyOrders(sender).catch(() => null);
  if (orders === null) return orderUnavailableReply();
  return orders.length === 0 ? noOrdersReply() : myOrdersReply(orders);
}

/** FR-063: an order's status needs its tracking link, not just the reference. */
async function checkOrder(
  sender: string,
  reference: string,
  token: string,
  deps: MessengerDeps,
): Promise<Reply> {
  if (!orderLookupLimiter.check(sender, deps.now()).allowed) {
    return orderLimitReply();
  }
  try {
    const order = await deps.lookupOrder(reference, token);
    return order
      ? orderStatusReply(order, deps.origin, token)
      : orderNotFoundReply();
  } catch {
    return orderUnavailableReply();
  }
}

/** An order link, a short message with a reference, or a button's name. */
async function answerText(
  sender: string,
  text: string,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Answer | null> {
  const pointer = findOrderPointer(text);
  if (pointer?.token) {
    return plain(
      await checkOrder(sender, pointer.reference, pointer.token, deps),
    );
  }
  if (pointer && text.trim().length <= MAX_SHORT_MESSAGE_LENGTH) {
    return plain(orderLinkNeededReply(pointer.reference));
  }
  // "order 09XXXXXXXXX", or just the mobile number, starts an order for
  // someone who can't tap the phone number button. Other numbers are left
  // to the staff.
  const phone = typedOrderPhone(text);
  if (phone) return ordering(await beginOrder(phone, deps, facts));
  // A short "are you open?" or hours question gets the hours and location
  // (added 2026-11-11). Any other text is left to the staff.
  const intent =
    typedButton(text) ?? (typedHoursQuestion(text) ? "hours-location" : null);
  return intent ? answerIntent(sender, intent, deps, facts) : null;
}

function answerEvent(
  event: CustomerEvent,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Answer | null> | null {
  switch (event.input.kind) {
    case "tap":
      return answerTap(
        event.sender,
        readPayload(event.input.payload),
        deps,
        facts,
      );
    case "text":
      return answerText(
        event.sender,
        event.input.text.slice(0, MAX_TEXT_INPUT),
        deps,
        facts,
      );
    case "other":
      return null;
  }
}

type Outcome = "replied" | "skipped" | "failed";

async function handleEvent(
  raw: unknown,
  pageId: unknown,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Outcome> {
  const event = readEvent(raw, pageId);
  if (!event) return "skipped";
  const now = deps.now();
  const age = now - event.time;
  if (age > EVENT_MAX_AGE_MS || -age > EVENT_MAX_SKEW_MS) return "skipped";
  if (seenEvents.has(event.key, now)) return "skipped";
  seenEvents.add(event.key, now);

  const answer = await answerEvent(event, deps, facts);
  if (!answer) return "skipped";
  const limiter = answer.ordering ? orderStepLimiter : replyLimiter;
  if (!limiter.check(event.sender, now).allowed) return "skipped";

  // FR-062: each customer's first reply of the day says it's automated.
  const reply =
    noticeShown.has(event.sender, now) ||
    answer.reply.text.includes(ASSISTANT_NOTICE)
      ? answer.reply
      : withNotice(answer.reply);
  if (!(await deps.send(event.sender, reply))) return "failed";
  if (reply.text.includes(ASSISTANT_NOTICE)) noticeShown.add(event.sender, now);
  return "replied";
}

export type WebhookResult = Readonly<{
  replied: number;
  skipped: number;
  failed: number;
}>;

/** Replies to each customer event in one webhook delivery, in order. */
export async function processWebhook(
  payload: unknown,
  deps: MessengerDeps,
): Promise<WebhookResult> {
  const counts = { replied: 0, skipped: 0, failed: 0 };
  if (
    !isRecord(payload) ||
    payload.object !== "page" ||
    !Array.isArray(payload.entry)
  ) {
    return counts;
  }

  const events: { event: unknown; pageId: unknown }[] = [];
  for (const entry of payload.entry) {
    // Standby events belong to another app's conversation, so they're left.
    if (!isRecord(entry) || !Array.isArray(entry.messaging)) continue;
    for (const event of entry.messaging) {
      if (events.length < MAX_EVENTS_PER_DELIVERY) {
        events.push({ event, pageId: entry.id });
      } else {
        counts.skipped += 1;
      }
    }
  }

  const facts: Facts = {
    content: once(deps.readContent),
    menu: once(() => deps.readMenu().catch(() => null)),
  };
  for (const { event, pageId } of events) {
    try {
      counts[await handleEvent(event, pageId, deps, facts)] += 1;
    } catch {
      counts.failed += 1;
    }
  }

  if (events.length > 0) {
    console.info(
      JSON.stringify({ event: "messenger-webhook-processed", ...counts }),
    );
  }
  return counts;
}
