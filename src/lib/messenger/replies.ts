/**
 * The Messenger assistant's replies (FR-059 to FR-063).
 *
 * Every fact comes from the same saved content and live menu as the website:
 * hours, address, payments, riders and prices are never written here, so the
 * chat can't drift from the site (FR-086). When the menu can't be read, the
 * reply says so and links the menu page instead of guessing a price.
 */

import { siteConfig } from "@/config/site";
import { formatOptionName } from "@/lib/menu/format-name";
import {
  formatPrice,
  getItemPrices,
  getLowestItemPrice,
} from "@/lib/menu/format-price";
import type { OrderStatus, OrderView } from "@/lib/orders/types";
import {
  fullAddress,
  hoursNotice,
  hoursSummary,
  joinList,
  midSentence,
} from "@/lib/site-content/format";
import type { SiteContent } from "@/lib/site-content/types";
import type { MenuCatalog, MenuCategory, MenuItem } from "@/types/menu";
import { categoryPayload, PAYLOADS, type Intent } from "./intents";

/** Meta's limits for a text message and its quick replies. */
export const MAX_TEXT_LENGTH = 2000;
export const MAX_QUICK_REPLIES = 13;
export const MAX_QUICK_REPLY_TITLE = 20;

/** An item lists each size's price up to this many sizes, then "from". */
const MAX_LISTED_OPTIONS = 4;

export type QuickReply = Readonly<{
  content_type: "text";
  title: string;
  payload: string;
}>;

export type Reply = Readonly<{
  text: string;
  quickReplies: readonly QuickReply[];
}>;

/** Said in the welcome and in each customer's first reply (FR-062). */
export const ASSISTANT_NOTICE = `I'm ${siteConfig.shortName}'s automated assistant, not a person.`;

/** The main buttons: quick replies under each answer and the chat's menu. */
export const MAIN_BUTTONS: readonly Readonly<{
  intent: Intent;
  title: string;
}>[] = [
  { intent: "menu", title: "Menu & prices" },
  { intent: "hours-location", title: "Hours & location" },
  { intent: "how-to-order", title: "How to order" },
  { intent: "order-status", title: "Order status" },
  { intent: "staff", title: "Talk to staff" },
];

const length = (text: string) => Array.from(text).length;

/** Cuts text to Meta's limit by characters, never inside an emoji. */
export function clip(text: string, limit = MAX_TEXT_LENGTH): string {
  const characters = Array.from(text);
  return characters.length <= limit
    ? text
    : `${characters.slice(0, limit - 1).join("")}…`;
}

function quickReply(title: string, payload: string): QuickReply {
  return {
    content_type: "text",
    title: clip(title, MAX_QUICK_REPLY_TITLE),
    payload,
  };
}

/** The main buttons, without the one just answered. */
function mainQuickReplies(answered?: Intent): QuickReply[] {
  return MAIN_BUTTONS.filter((button) => button.intent !== answered).map(
    (button) => quickReply(button.title, PAYLOADS[button.intent]),
  );
}

function reply(text: string, quickReplies: readonly QuickReply[] = []): Reply {
  return {
    text: clip(text),
    quickReplies: quickReplies.slice(0, MAX_QUICK_REPLIES),
  };
}

/** The notice before a reply, for a customer's first reply. */
export function withNotice(answer: Reply): Reply {
  return { ...answer, text: clip(`${ASSISTANT_NOTICE}\n\n${answer.text}`) };
}

// Welcome and staff ---------------------------------------------------------

/** Get Started, a greeting, or a button the assistant doesn't know. */
export function welcomeReply(): Reply {
  return reply(
    `Hi! ${ASSISTANT_NOTICE} Tap a button below for our menu and prices, our hours and location, how to order, or your order status.\n\nOur staff read this chat too, so you can also type your message.`,
    mainQuickReplies(),
  );
}

/**
 * Talk to staff. Every message already reaches the Page inbox, and the
 * assistant doesn't answer typed messages, so the staff can just reply.
 */
export function staffReply(content: SiteContent): Reply {
  return reply(
    `Okay! Our staff will reply here in this chat during shop hours. ${hoursSummary(content.hours)}\n\nType your message below. Send "hi" anytime to see the buttons again.`,
  );
}

// Shop facts ----------------------------------------------------------------

export function hoursLocationReply(content: SiteContent): Reply {
  const { address, hours, notice } = content;
  const landmark = address.landmark.trim()
    ? `, ${midSentence(address.landmark.trim())}`
    : "";
  const parts = [
    hoursNotice(hours),
    notice.text.trim() ? `Notice: ${notice.text.trim()}` : null,
    `We're at ${fullAddress(address)}${landmark}.`,
    address.mapUrl ? `Map: ${address.mapUrl}` : null,
  ];
  return reply(
    parts.filter(Boolean).join("\n\n"),
    mainQuickReplies("hours-location"),
  );
}

export function howToOrderReply(
  content: SiteContent,
  origin: string,
  onlineOrdering: boolean,
): Reply {
  const methods = joinList(content.payments.methods, "or");
  const riders = content.riders.partners
    .map((partner) => partner.name.trim())
    .filter(Boolean);
  const steps = onlineOrdering
    ? [
        "2. At checkout, tap Place order. It goes straight to the shop.",
        `3. Your order page shows its status. You pay at the counter when you pick it up${methods ? ` (${methods})` : ""}.`,
      ]
    : [
        "2. At checkout, prepare your order summary.",
        `3. Send the summary to the shop here in this chat, and the shop confirms your order. You pay at the counter when you pick it up${methods ? ` (${methods})` : ""}.`,
      ];
  const delivery = `For delivery, a local rider${riders.length > 0 ? ` such as ${joinList(riders, "or")}` : ""} can order it for you at the shop. ${siteConfig.shortName} doesn't book riders or charge rider fees: ${origin}/contact`;
  return reply(
    [
      `How to order from ${siteConfig.shortName}:`,
      `1. Pick your drinks and food on our website: ${origin}/menu`,
      ...steps,
      "",
      delivery,
    ].join("\n"),
    mainQuickReplies("how-to-order"),
  );
}

// Menu ----------------------------------------------------------------------

function shownCategories(catalog: MenuCatalog | null): MenuCategory[] {
  return (catalog?.categories ?? []).filter(
    (category) => category.items.length > 0,
  );
}

function categoryQuickReplies(
  categories: readonly MenuCategory[],
): QuickReply[] {
  const room = MAX_QUICK_REPLIES - (MAIN_BUTTONS.length - 1);
  return categories
    .flatMap((category) => {
      const payload = categoryPayload(category.id);
      return payload ? [quickReply(category.name, payload)] : [];
    })
    .slice(0, room);
}

export function menuUnavailableReply(origin: string): Reply {
  return reply(
    `I can't load the menu right now, so I won't guess any prices. See the menu on our website: ${origin}/menu`,
    mainQuickReplies("menu"),
  );
}

/** The menu's categories as buttons. */
export function menuReply(
  catalog: MenuCatalog | null,
  origin: string,
  lead?: string,
): Reply {
  const categories = shownCategories(catalog);
  if (categories.length === 0) return menuUnavailableReply(origin);
  const text = [
    lead,
    "What are you craving? Tap a category to see its items and prices.",
    `Full menu with flavors and add-ons: ${origin}/menu`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return reply(text, [
    ...categoryQuickReplies(categories),
    ...mainQuickReplies("menu"),
  ]);
}

/** Each size's price, while every size has one fixed price. */
function fixedPrices(item: MenuItem): [string, number][] | null {
  const prices: [string, number][] = [];
  for (const variant of item.variants) {
    if (variant.flavorPrices.length > 0 || variant.basePrice === null) {
      return null;
    }
    prices.push([formatOptionName(variant.name), variant.basePrice]);
  }
  return prices;
}

/** One price, each size's price, or "from" the lowest price for many sizes or flavor prices. */
export function priceText(item: MenuItem): string | null {
  const fixed = fixedPrices(item);
  const [only] = fixed ?? [];
  if (fixed && fixed.length === 1 && only) return formatPrice(only[1]);
  if (fixed && fixed.length > 1 && fixed.length <= MAX_LISTED_OPTIONS) {
    return fixed
      .map(([name, price]) => `${name} ${formatPrice(price)}`)
      .join(" · ");
  }
  const lowest = getLowestItemPrice(getItemPrices(item));
  return lowest === null ? null : `from ${formatPrice(lowest)}`;
}

function itemLine(item: MenuItem, withFlavors: boolean): string {
  const price = priceText(item);
  const unavailable =
    item.availability === "unavailable" ? " (temporarily unavailable)" : "";
  const line = `• ${item.name}${price ? ` — ${price}` : ""}${unavailable}`;
  return withFlavors && item.flavors.length > 0
    ? `${line}\n   Flavors: ${joinList(item.flavors)}`
    : line;
}

/** The category's items, without flavors or cut short when it's too long. */
function categoryText(category: MenuCategory, footer: string): string {
  const write = (withFlavors: boolean) =>
    category.items.map((item) => itemLine(item, withFlavors)).join("\n");
  for (const withFlavors of [true, false]) {
    const text = `${category.name}\n${write(withFlavors)}\n\n${footer}`;
    if (length(text) <= MAX_TEXT_LENGTH) return text;
  }
  const room = MAX_TEXT_LENGTH - length(category.name) - length(footer) - 3;
  return `${category.name}\n${clip(write(false), room)}\n\n${footer}`;
}

/** One category's items and prices, with the other categories as buttons. */
export function categoryReply(
  catalog: MenuCatalog | null,
  categoryId: string,
  origin: string,
): Reply {
  const categories = shownCategories(catalog);
  const category = categories.find((entry) => entry.id === categoryId);
  if (!category) {
    return menuReply(
      catalog,
      origin,
      "That category isn't on the menu anymore.",
    );
  }
  const others = categories.filter((entry) => entry.id !== category.id);
  return reply(
    categoryText(category, `Order these on our website: ${origin}/menu`),
    [...categoryQuickReplies(others), ...mainQuickReplies("menu")],
  );
}

// Order status --------------------------------------------------------------

/** The order page's wording (`order-status-tracker.tsx`). */
export const STATUS_TEXT: Readonly<
  Record<OrderStatus, Readonly<{ label: string; detail: string }>>
> = {
  pending: {
    label: "Order Received",
    detail: "Order placed, waiting for shop confirmation",
  },
  accepted: { label: "Accepted by Shop", detail: "Shop accepted your order" },
  preparing: {
    label: "Preparing",
    detail: "Your drinks and food are being prepared",
  },
  ready: {
    label: "Ready for Pickup",
    detail: "Ready for pickup at the counter",
  },
  completed: {
    label: "Completed",
    detail: "Order picked up and completed",
  },
  rejected: {
    label: "Rejected",
    detail: "The shop was unable to accept this order.",
  },
  cancelled: {
    label: "Cancelled",
    detail:
      "This order has been cancelled. If this was unexpected, please contact the shop counter.",
  },
};

const asSentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

export function orderStatusPromptReply(): Reply {
  return reply(
    "To check your order, paste your order link here. It's the link of your order page, the one that ends with #token=…\n\nFor your privacy, I can't look up an order from its reference alone.",
    mainQuickReplies("order-status"),
  );
}

export function orderStatusReply(order: OrderView): Reply {
  // The status comes from the database, so an unknown one is still checked.
  const status = STATUS_TEXT[order.status] as
    (typeof STATUS_TEXT)[OrderStatus] | undefined;
  if (!status) return orderUnavailableReply();
  return reply(
    `Order ${order.reference}: ${status.label}\n${asSentence(status.detail)}\n\nYour order link shows live updates.`,
    mainQuickReplies("order-status"),
  );
}

/** A reference without its link: the link proves the order is theirs. */
export function orderLinkNeededReply(reference: string): Reply {
  return reply(
    `For your privacy, I can only check an order from its full order link, the one that ends with #token=… Paste the link of order ${reference} here, or tap Talk to staff.`,
    mainQuickReplies("order-status"),
  );
}

export function orderNotFoundReply(): Reply {
  return reply(
    "I couldn't find an order for that link. Check that you pasted the whole link, or tap Talk to staff.",
    mainQuickReplies("order-status"),
  );
}

export function orderUnavailableReply(): Reply {
  return reply(
    "I can't check orders right now. Open your order link for its latest status, or tap Talk to staff.",
    mainQuickReplies("order-status"),
  );
}

export function orderLimitReply(): Reply {
  return reply(
    "That's a lot of order checks. Please wait a few minutes, then try again.",
    mainQuickReplies("order-status"),
  );
}
