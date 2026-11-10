/**
 * The Messenger assistant's replies (FR-059 to FR-063, FR-100 to FR-109).
 *
 * Every fact comes from the same saved content and live menu as the website:
 * hours, address, payments, riders and prices are never written here, so the
 * chat can't drift from the site (FR-086). When the menu can't be read, the
 * reply says so and offers the menu page instead of guessing a price.
 *
 * Website links are buttons, never pasted into the text (FR-104). A reply
 * can also carry pictures and a carousel; `send.ts` turns it into messages.
 */

import { getMenuBoardPaths } from "@/config/menu-boards";
import { siteConfig } from "@/config/site";
import { formatOptionName } from "@/lib/menu/format-name";
import {
  formatPrice,
  getItemPrices,
  getLowestItemPrice,
} from "@/lib/menu/format-price";
import { buildOrderPath } from "@/lib/orders/order-link";
import type { OrderStatus, OrderView } from "@/lib/orders/types";
import {
  fullAddress,
  hoursNotice,
  hoursSummary,
  joinList,
  midSentence,
} from "@/lib/site-content/format";
import type { SiteContent } from "@/lib/site-content/types";
import type {
  MenuCatalog,
  MenuCategory,
  MenuItem,
  MenuVariant,
} from "@/types/menu";
import {
  categoryPayload,
  PAYLOADS,
  statusPayload,
  type Intent,
} from "./intents";

/** Meta's limits for a text message and its quick replies. */
export const MAX_TEXT_LENGTH = 2000;
export const MAX_QUICK_REPLIES = 13;
export const MAX_QUICK_REPLY_TITLE = 20;
/** A carousel card's title and subtitle. */
export const MAX_CARD_TEXT = 80;

/** An item lists each size's price up to this many sizes, then "from". */
const MAX_LISTED_OPTIONS = 4;

export type QuickReply = Readonly<{
  content_type: "text";
  title: string;
  payload: string;
}>;

/** A website button (`web_url`). */
export type WebLink = Readonly<{ title: string; url: string }>;

export type CardButton =
  | Readonly<{ type: "postback"; title: string; payload: string }>
  | Readonly<{ type: "web_url"; title: string; url: string }>;

/** One picture card of a carousel. */
export type Card = Readonly<{
  title: string;
  subtitle: string;
  imageUrl: string;
  buttons: readonly CardButton[];
}>;

export type Reply = Readonly<{
  text: string;
  /**
   * The choices. The first ones show as buttons inside the message and the
   * rest below it, unless `listChoices` keeps them all below.
   */
  quickReplies: readonly QuickReply[];
  /** Website buttons, shown inside the message before the choices. */
  links?: readonly WebLink[];
  /** Pictures sent after the text (absolute https addresses). */
  images?: readonly string[];
  /** A carousel sent last. */
  cards?: readonly Card[];
  /** Adds Messenger's "use my mobile number" button. */
  askPhone?: boolean;
  /** The choices are a list to pick from, so they all stay below. */
  listChoices?: boolean;
  /** At most this many choices go inside the message; the rest stay below. */
  inlineChoices?: number;
}>;

/** Said in the welcome and in each customer's first reply (FR-062). */
export const ASSISTANT_NOTICE = `I'm ${siteConfig.shortName}'s automated assistant, not a person.`;

/** The main buttons: quick replies under each answer and the chat's menu. */
export const MAIN_BUTTONS: readonly Readonly<{
  intent: Intent;
  title: string;
}>[] = [
  { intent: "order", title: "🛒 Order here" },
  { intent: "menu", title: "📋 Menu & prices" },
  { intent: "hours-location", title: "🕒 Hours & location" },
  { intent: "how-to-order", title: "❓ How to order" },
  { intent: "order-status", title: "📦 Order status" },
  { intent: "staff", title: "💬 Talk to staff" },
];

const length = (text: string) => Array.from(text).length;

/** Cuts text to Meta's limit by characters, never inside an emoji. */
export function clip(text: string, limit = MAX_TEXT_LENGTH): string {
  const characters = Array.from(text);
  return characters.length <= limit
    ? text
    : `${characters.slice(0, limit - 1).join("")}…`;
}

/**
 * Cuts a title to Meta's limit counted in UTF-16 units, the strictest way to
 * count, so an emoji can't push it over. It never splits an emoji.
 */
export function clipTitle(text: string, limit: number): string {
  if (text.length <= limit) return text;
  let kept = "";
  for (const character of Array.from(text)) {
    if (kept.length + character.length > limit - 1) break;
    kept += character;
  }
  return `${kept.trimEnd()}…`;
}

export function quickReply(title: string, payload: string): QuickReply {
  return {
    content_type: "text",
    title: clipTitle(title, MAX_QUICK_REPLY_TITLE),
    payload,
  };
}

/** A website button, or none when the address isn't a web address. */
export function webLinks(title: string, url: string): WebLink[] {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return [];
  } catch {
    return [];
  }
  return [{ title: clipTitle(title, MAX_QUICK_REPLY_TITLE), url }];
}

export function card(
  title: string,
  subtitle: string,
  imageUrl: string,
  buttons: readonly CardButton[],
): Card {
  return {
    title: clipTitle(title, MAX_CARD_TEXT),
    // Meta needs a subtitle or an image; an empty one is left out of view.
    subtitle: clipTitle(subtitle, MAX_CARD_TEXT),
    imageUrl,
    buttons: buttons.map((button) => ({
      ...button,
      title: clipTitle(button.title, MAX_QUICK_REPLY_TITLE),
    })),
  };
}

/** The main buttons, without the ones just answered. */
export function mainQuickReplies(...answered: Intent[]): QuickReply[] {
  return MAIN_BUTTONS.filter((button) => !answered.includes(button.intent)).map(
    (button) => quickReply(button.title, PAYLOADS[button.intent]),
  );
}

export const orderChoice = (): QuickReply =>
  quickReply(MAIN_BUTTONS[0]?.title ?? "🛒 Order here", PAYLOADS.order);

export function buildReply(
  text: string,
  quickReplies: readonly QuickReply[] = [],
  extras: Omit<Reply, "text" | "quickReplies"> = {},
): Reply {
  return {
    text: clip(text),
    quickReplies: quickReplies.slice(0, MAX_QUICK_REPLIES),
    ...extras,
  };
}

/** The notice before a reply, for a customer's first reply. */
export function withNotice(answer: Reply): Reply {
  return { ...answer, text: clip(`${ASSISTANT_NOTICE}\n\n${answer.text}`) };
}

/** An emoji for a menu category, by its name. */
export function categoryEmoji(name: string): string {
  if (/buldak|sedaap|noodle/i.test(name)) return "🍜";
  if (/bites|snack/i.test(name)) return "🍟";
  if (/drink|coffee|soda|beverage/i.test(name)) return "🥤";
  if (/combo|package/i.test(name)) return "🎁";
  if (/treat/i.test(name)) return "🐟";
  if (/water/i.test(name)) return "💧";
  return "🍴";
}

// Welcome and staff ---------------------------------------------------------

/** Get Started, a greeting, or a button the assistant doesn't know. */
export function welcomeReply(): Reply {
  return buildReply(
    `Hi! 👋 ${ASSISTANT_NOTICE} 🐱\n\nTap a button below to order right here in the chat 🛒, see our menu and prices 📋, our hours and location 🕒, or your order status 📦.\n\nOur staff read this chat too, so you can also type your message. 💬`,
    mainQuickReplies(),
  );
}

/**
 * Talk to staff. Every message already reaches the Page inbox, and the
 * assistant doesn't answer typed messages, so the staff can just reply.
 */
export function staffReply(content: SiteContent): Reply {
  return buildReply(
    `Okay! 😊 Our staff will reply here in this chat during shop hours. ${hoursSummary(content.hours)}\n\nType your message below. Send "hi" anytime to see the buttons again.`,
  );
}

// Shop facts ----------------------------------------------------------------

export function hoursLocationReply(content: SiteContent): Reply {
  const { address, hours, notice } = content;
  const landmark = address.landmark.trim()
    ? `, ${midSentence(address.landmark.trim())}`
    : "";
  const parts = [
    `🕒 ${hoursNotice(hours)}`,
    notice.text.trim() ? `📢 Notice: ${notice.text.trim()}` : null,
    `📍 We're at ${fullAddress(address)}${landmark}.`,
  ];
  return buildReply(
    parts.filter(Boolean).join("\n\n"),
    mainQuickReplies("hours-location"),
    { links: webLinks("📍 Open map", address.mapUrl) },
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
  const pay = `You pay at the counter when you pick it up${methods ? ` (${methods})` : ""}.`;
  const steps = onlineOrdering
    ? [
        '1. Tap "🛒 Order here" and share your mobile number 📱',
        "2. Pick your drinks and food with photos 📸, then sizes, flavors and add-ons",
        "3. Choose how you'll pay and when you'll pick up ⏰",
        "4. Check your order and tap Place order. It goes straight to the shop 🎉",
        `5. Check its status here anytime 📦. ${pay}`,
      ]
    : [
        "1. Pick your drinks and food on our website 🌐",
        "2. At checkout, prepare your order summary.",
        `3. Send the summary to the shop here in this chat, and the shop confirms your order. ${pay}`,
      ];
  const delivery = `🏍 For delivery, a local rider${riders.length > 0 ? ` such as ${joinList(riders, "or")}` : ""} can order it for you at the shop. ${siteConfig.shortName} doesn't book riders or charge rider fees.`;
  return buildReply(
    [
      `How to order from ${siteConfig.shortName}: 🐱☕`,
      steps.join("\n"),
      delivery,
    ].join("\n\n"),
    mainQuickReplies("how-to-order"),
    {
      links: [
        ...webLinks("🌐 Order on website", `${origin}/menu`),
        ...webLinks("🏍 Delivery info", `${origin}/contact`),
      ],
    },
  );
}

// Menu ----------------------------------------------------------------------

function shownCategories(catalog: MenuCatalog | null): MenuCategory[] {
  return (catalog?.categories ?? []).filter(
    (category) => category.items.length > 0,
  );
}

/** The categories as choices. */
function categoryQuickReplies(
  categories: readonly MenuCategory[],
): QuickReply[] {
  return categories.flatMap((category) => {
    const payload = categoryPayload(category.id);
    return payload
      ? [
          quickReply(
            `${categoryEmoji(category.name)} ${category.name}`,
            payload,
          ),
        ]
      : [];
  });
}

/**
 * Order here, then as many categories as fit, then the main buttons: Meta
 * allows 13, and the main buttons are never the ones cut.
 */
function menuChoices(categories: readonly MenuCategory[]): QuickReply[] {
  const mains = mainQuickReplies("menu", "order");
  const room = Math.max(0, MAX_QUICK_REPLIES - 1 - mains.length);
  return [
    orderChoice(),
    ...categoryQuickReplies(categories).slice(0, room),
    ...mains,
  ];
}

export function menuUnavailableReply(origin: string): Reply {
  return buildReply(
    "😿 I can't load the menu right now, so I won't guess any prices. You can see it on our website.",
    mainQuickReplies("menu"),
    { links: webLinks("🌐 Menu page", `${origin}/menu`) },
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
    "😋 What are you craving? Tap a category to see its items, prices and menu board, or tap Order here to order in this chat.",
  ]
    .filter(Boolean)
    .join("\n\n");
  // Only Full menu and Order here sit inside the message; the categories
  // stay below it.
  return buildReply(text, menuChoices(categories), {
    links: webLinks("🌐 Full menu", `${origin}/menu`),
    inlineChoices: 1,
  });
}

/** The lowest and highest price of a size, as text; null when it has none. */
export function variantPriceText(variant: MenuVariant): string | null {
  const prices = [
    ...variant.flavorPrices.map((entry) => entry.price),
    ...(variant.basePrice !== null && variant.basePrice > 0
      ? [variant.basePrice]
      : []),
  ];
  if (prices.length === 0) return null;
  const lowest = Math.min(...prices);
  return `${Math.max(...prices) > lowest ? "from " : ""}${formatPrice(lowest)}`;
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

/** What comes in a combo's option, as the menu words it; null when none. */
export const optionContents = (variant: MenuVariant): string | null =>
  variant.description?.trim() || null;

/** One option of an item, with its price and, for a combo, what comes in it. */
export function optionLine(variant: MenuVariant): string {
  const price = variantPriceText(variant);
  const contents = optionContents(variant);
  return `${formatOptionName(variant.name)}${price ? ` — ${price}` : ""}${contents ? `: ${contents}` : ""}`;
}

function itemLine(item: MenuItem, withFlavors: boolean): string {
  const unavailable =
    item.availability === "unavailable" ? " (temporarily unavailable)" : "";
  // A combo spells out what each of its options comes with (FR-103).
  if (item.variants.some((variant) => optionContents(variant))) {
    return [
      `• ${item.name}${unavailable}`,
      ...item.variants.map((variant) => `   – ${optionLine(variant)}`),
    ].join("\n");
  }
  const price = priceText(item);
  const line = `• ${item.name}${price ? ` — ${price}` : ""}${unavailable}`;
  return withFlavors && item.flavors.length > 0
    ? `${line}\n   Flavors: ${joinList(item.flavors)}`
    : line;
}

/** The note under a category's menu board pictures (FR-105). */
export const BOARD_NOTE =
  "🖼 The menu board pictures may show older prices. The prices in this chat are today's.";

/** The category's items, without flavors or cut short when it's too long. */
function categoryText(category: MenuCategory, footer: string): string {
  const title = `${categoryEmoji(category.name)} ${category.name}`;
  const write = (withFlavors: boolean) =>
    category.items.map((item) => itemLine(item, withFlavors)).join("\n");
  for (const withFlavors of [true, false]) {
    const text = `${title}\n${write(withFlavors)}\n\n${footer}`;
    if (length(text) <= MAX_TEXT_LENGTH) return text;
  }
  const room = MAX_TEXT_LENGTH - length(title) - length(footer) - 3;
  return `${title}\n${clip(write(false), room)}\n\n${footer}`;
}

/** The absolute addresses of a category's menu board pictures. */
export const boardImages = (categoryName: string, origin: string) =>
  getMenuBoardPaths(categoryName).map((path) => `${origin}${path}`);

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
  const images = boardImages(category.name, origin);
  const others = categories.filter((entry) => entry.id !== category.id);
  return buildReply(
    categoryText(
      category,
      [
        images.length > 0 ? BOARD_NOTE : null,
        "Ready to order? Tap Order here 🛒",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    menuChoices(others),
    {
      links: webLinks("🌐 Full menu", `${origin}/menu`),
      images,
      inlineChoices: 1,
    },
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

const STATUS_EMOJI: Readonly<Record<OrderStatus, string>> = {
  pending: "📝",
  accepted: "👍",
  preparing: "🍳",
  ready: "🎉",
  completed: "✅",
  rejected: "😿",
  cancelled: "🚫",
};

const asSentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/** The customer has no order from this chat yet (FR-110). */
export function noOrdersReply(): Reply {
  return buildReply(
    "📦 I can't see any orders from this chat yet. Tap Order here to place one 🛒\n\nOrdered on our website instead? Paste its order link here, the one that ends with #token=…",
    [orderChoice(), ...mainQuickReplies("order", "order-status")],
  );
}

/** The most items named in an order's summary line. */
const MAX_SUMMARY_LENGTH = 110;

/** The order page's wording for a rejected order with no reason given. */
const REJECTION_FALLBACK =
  "Item temporarily out of stock or store at capacity.";
const MAX_REASON_LENGTH = 200;

/** What the shop told the customer about a rejected order (as on its page). */
const reasonOf = (order: OrderView): string | null =>
  order.status === "rejected"
    ? `💬 Reason from the shop: ${clip(
        (order.rejectionReason ?? "").replace(/\s+/g, " ").trim() ||
          REJECTION_FALLBACK,
        MAX_REASON_LENGTH,
      )}`
    : null;

const summaryOf = (order: OrderView): string => {
  const text = order.items
    .map((line) => `${line.quantity} × ${line.itemName}`)
    .join(", ");
  return clip(text, MAX_SUMMARY_LENGTH);
};

/**
 * FR-110: the orders this customer placed in the chat, newest first, found
 * by who is asking. No order number or link is needed, and the status is
 * answered right here in the chat.
 */
export function myOrdersReply(orders: readonly OrderView[]): Reply {
  const blocks = orders.flatMap((order) => {
    const status = STATUS_TEXT[order.status] as
      (typeof STATUS_TEXT)[OrderStatus] | undefined;
    if (!status) return [];
    return [
      [
        `${STATUS_EMOJI[order.status]} Order ${order.reference}: ${status.label}`,
        asSentence(status.detail),
        reasonOf(order),
        `🧾 ${summaryOf(order)} · ${formatPrice(order.subtotal)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ];
  });
  if (blocks.length === 0) return orderUnavailableReply();
  return buildReply(
    `📦 Your orders from this chat\n\n${blocks.join("\n\n")}\n\nTap Refresh to see the latest status. 🔄`,
    [
      quickReply("🔄 Refresh", PAYLOADS["order-status"]),
      orderChoice(),
      ...mainQuickReplies("order", "order-status"),
    ],
  );
}

/**
 * An order's status, with a button to refresh it and one to open its order
 * page. The refresh button carries the order's link, so it works without
 * the assistant remembering anything.
 */
export function orderStatusReply(
  order: OrderView,
  origin: string,
  token: string,
): Reply {
  // The status comes from the database, so an unknown one is still checked.
  const status = STATUS_TEXT[order.status] as
    (typeof STATUS_TEXT)[OrderStatus] | undefined;
  if (!status) return orderUnavailableReply();
  const refresh = statusPayload(order.reference, token);
  return buildReply(
    `${STATUS_EMOJI[order.status]} Order ${order.reference}: ${status.label}\n${asSentence(status.detail)}`,
    [
      ...(refresh ? [quickReply("🔄 Check status", refresh)] : []),
      ...mainQuickReplies("order-status"),
    ],
    { links: orderPageLinks(order.reference, token, origin) },
  );
}

/** A button to an order's page, which shows its live updates. */
export function orderPageLinks(
  reference: string,
  token: string,
  origin: string,
): WebLink[] {
  try {
    return webLinks(
      "📍 Track order",
      `${origin}${buildOrderPath(reference, token)}`,
    );
  } catch {
    return [];
  }
}

/** A reference without its link: the link proves the order is theirs. */
export function orderLinkNeededReply(reference: string): Reply {
  return buildReply(
    `🔒 For your privacy, I can only check an order from its full order link, the one that ends with #token=… Paste the link of order ${reference} here, tap Order status to see the orders you placed in this chat, or tap Talk to staff.`,
    mainQuickReplies("order-status"),
  );
}

export function orderNotFoundReply(): Reply {
  return buildReply(
    "🤔 I couldn't find an order for that link. Check that you pasted the whole link, or tap Talk to staff.",
    mainQuickReplies("order-status"),
  );
}

export function orderUnavailableReply(): Reply {
  return buildReply(
    "😿 I can't check orders right now. Please try again in a few minutes, or tap Talk to staff.",
    mainQuickReplies("order-status"),
  );
}

export function orderLimitReply(): Reply {
  return buildReply(
    "⏳ That's a lot of order checks. Please wait a few minutes, then try again.",
    mainQuickReplies("order-status"),
  );
}
