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
 * - within the limits: SENDER_REPLY_LIMIT replies and ORDER_LOOKUP_LIMIT
 *   order checks per customer in 10 minutes.
 *
 * The assistant answers button taps, typed button names and order links.
 * Every other message is for the shop's staff: it gets no automated reply
 * and is never marked as seen, so it stays unread in the Page inbox and the
 * staff's Messenger and Business Suite apps notify them as before.
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
  type ButtonTap,
  type Intent,
} from "./intents";
import {
  ASSISTANT_NOTICE,
  categoryReply,
  hoursLocationReply,
  howToOrderReply,
  menuReply,
  orderLimitReply,
  orderLinkNeededReply,
  orderNotFoundReply,
  orderStatusPromptReply,
  orderStatusReply,
  orderUnavailableReply,
  staffReply,
  welcomeReply,
  withNotice,
  type Reply,
} from "./replies";

export type MessengerDeps = Readonly<{
  /** The website's address, for menu and order links. */
  origin: string;
  now: () => number;
  onlineOrdering: () => boolean;
  readContent: () => Promise<SiteContent>;
  /** null when the menu can't be read. */
  readMenu: () => Promise<MenuCatalog | null>;
  /** null when no order matches; throws when orders can't be checked. */
  lookupOrder: (reference: string, token: string) => Promise<OrderView | null>;
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

/** Forgets seen events, notices and limits (tests). */
export function resetMessengerState(): void {
  seenEvents.clear();
  noticeShown.clear();
  replyLimiter.reset();
  orderLookupLimiter.reset();
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

async function answerIntent(
  intent: Intent,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Reply> {
  switch (intent) {
    case "welcome":
      return welcomeReply();
    case "menu":
      return menuReply(await facts.menu(), deps.origin);
    case "hours-location":
      return hoursLocationReply(await facts.content());
    case "how-to-order":
      return howToOrderReply(
        await facts.content(),
        deps.origin,
        deps.onlineOrdering(),
      );
    case "order-status":
      return orderStatusPromptReply();
    case "staff":
      return staffReply(await facts.content());
  }
}

async function answerTap(
  tap: ButtonTap | null,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Reply> {
  // An old or unknown button shows the buttons again.
  if (!tap) return welcomeReply();
  if (tap.kind === "category") {
    return categoryReply(await facts.menu(), tap.categoryId, deps.origin);
  }
  return answerIntent(tap.intent, deps, facts);
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
    return order ? orderStatusReply(order) : orderNotFoundReply();
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
): Promise<Reply | null> {
  const pointer = findOrderPointer(text);
  if (pointer?.token) {
    return checkOrder(sender, pointer.reference, pointer.token, deps);
  }
  if (pointer && text.trim().length <= MAX_SHORT_MESSAGE_LENGTH) {
    return orderLinkNeededReply(pointer.reference);
  }
  const intent = typedButton(text);
  return intent ? answerIntent(intent, deps, facts) : null;
}

function answerEvent(
  event: CustomerEvent,
  deps: MessengerDeps,
  facts: Facts,
): Promise<Reply | null> | null {
  switch (event.input.kind) {
    case "tap":
      return answerTap(readPayload(event.input.payload), deps, facts);
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
  if (!replyLimiter.check(event.sender, now).allowed) return "skipped";

  // FR-062: each customer's first reply of the day says it's automated.
  const reply =
    noticeShown.has(event.sender, now) || answer.text.includes(ASSISTANT_NOTICE)
      ? answer
      : withNotice(answer);
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
