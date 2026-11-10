/**
 * The replies of an order built inside Messenger (FR-100 to FR-109).
 *
 * Browsing shows pictures: a carousel of categories, then of items, with the
 * shop's menu boards beside it. Every price is read from the live menu, and
 * the order is checked against it again before it is placed. The order so far
 * rides inside each button (`order-state.ts`), so nothing is stored here.
 */

import { getMenuItemImage } from "@/config/menu-item-images";
import { formatOptionName } from "@/lib/menu/format-name";
import {
  formatPrice,
  getItemPrices,
  getLowestItemPrice,
} from "@/lib/menu/format-price";
import {
  allowsFlavorMix,
  calculateLineTotal,
  calculateSubtotal,
  encodeLineFlavor,
  findCatalogItem,
  findCatalogVariant,
  isSafeCartSubtotal,
  joinFlavorMix,
  MAX_MIXED_FLAVORS,
  resolveVariantUnitPrice,
  splitAddOns,
} from "@/lib/ordering/cart-pricing";
import type { PlaceOrderSuccess } from "@/lib/orders/types";
import {
  closedTodayText,
  hoursSummary,
  takeoutBoxText,
} from "@/lib/site-content/format";
import {
  shopClosedMessage,
  type ShopStatus,
} from "@/lib/site-content/open-now";
import type {
  ClosureContent,
  HoursContent,
  SiteContent,
} from "@/lib/site-content/types";
import type {
  MenuCatalog,
  MenuCategory,
  MenuItem,
  MenuVariant,
} from "@/types/menu";

import { PAYLOADS } from "./intents";
import {
  encodeOrderPayload,
  MAX_ORDER_LINES,
  PICKUP_TEXT,
  type OrderLine,
  type OrderOp,
  type OrderState,
} from "./order-state";
import {
  BOARD_NOTE,
  boardImages,
  buildReply,
  card,
  categoryEmoji,
  mainQuickReplies,
  MAX_QUICK_REPLIES,
  MAX_QUICK_REPLY_TITLE,
  optionLine,
  orderChoice,
  priceText,
  quickReply,
  variantPriceText,
  type CardButton,
  type QuickReply,
  type Reply,
} from "./replies";

/** The picture for items and categories without a photo. */
export const FALLBACK_PHOTO = "/images/messenger/no-photo.jpg";

/** The name on an order when Messenger doesn't give one. */
export const FALLBACK_NAME = "Messenger customer";

/** A carousel allows ten cards. */
const MAX_CARDS = 10;

// Buttons -------------------------------------------------------------------

function step(
  title: string,
  op: OrderOp,
  state: OrderState,
  args: readonly unknown[] = [],
): QuickReply[] {
  const payload = encodeOrderPayload(op, state, args);
  return payload ? [quickReply(title, payload)] : [];
}

function stepButton(
  title: string,
  op: OrderOp,
  state: OrderState,
  args: readonly unknown[] = [],
): CardButton[] {
  const payload = encodeOrderPayload(op, state, args);
  return payload ? [{ type: "postback", title, payload }] : [];
}

const staffChoice = (): QuickReply[] =>
  mainQuickReplies().filter((entry) => entry.payload === PAYLOADS.staff);

/** What to offer under most steps. */
function orderChoices(state: OrderState): QuickReply[] {
  return [
    ...(state.lines.length > 0
      ? [
          ...step("🧺 My order", "cart", state),
          ...step("✅ Checkout", "pay", state),
        ]
      : []),
    ...step("❌ Cancel order", "clear", state),
  ];
}

const join = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join("\n\n");

// Pricing -------------------------------------------------------------------

export type PricedLine = Readonly<{
  line: OrderLine;
  item: MenuItem;
  variant: MenuVariant;
  unitPrice: number;
  total: number;
}>;

export type PricedOrder = Readonly<{
  lines: readonly PricedLine[];
  /** The order without lines the menu no longer sells. */
  state: OrderState;
  /** Names of the items that were left out. */
  removed: readonly string[];
  subtotal: number;
}>;

/** Prices an order from the live menu; lines the menu can't sell are removed. */
export function priceOrder(
  catalog: MenuCatalog,
  state: OrderState,
): PricedOrder {
  const lines: PricedLine[] = [];
  const removed: string[] = [];
  for (const line of state.lines) {
    const item = findCatalogItem(catalog, line.itemId);
    const variant = item ? findCatalogVariant(item, line.variantId) : null;
    const price =
      item && variant && item.availability === "available"
        ? resolveVariantUnitPrice(item, variant, line.flavor)
        : null;
    if (!item || !variant || !price?.ok) {
      removed.push(item?.name ?? "An item");
      continue;
    }
    lines.push({
      line,
      item,
      variant,
      unitPrice: price.unitPrice,
      total: calculateLineTotal(price.unitPrice, line.quantity),
    });
  }
  const rows = lines.map((row) => ({
    unitPrice: row.unitPrice,
    quantity: row.line.quantity,
  }));
  return {
    lines,
    state:
      removed.length === 0
        ? state
        : {
            ...state,
            lines: lines.map((row) => row.line),
            payment: null,
            pickup: null,
            nonce: null,
            reviewedAt: null,
          },
    removed,
    subtotal: isSafeCartSubtotal(rows) ? calculateSubtotal(rows) : 0,
  };
}

function selectionText(flavor: string | null): string {
  const parts = splitAddOns(flavor);
  return [
    parts.flavor,
    parts.addOns.length > 0 ? `+ ${parts.addOns.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** "Fries (Large) – Cheese + Egg": an ordered item, its size and choices. */
export function lineName(row: PricedLine): string {
  const size =
    row.item.variants.length > 1
      ? ` (${formatOptionName(row.variant.name)})`
      : "";
  const selection = selectionText(row.line.flavor);
  return `${row.item.name}${size}${selection ? ` – ${selection}` : ""}`;
}

const lineText = (row: PricedLine, index: number) =>
  `${index + 1}. ${row.line.quantity} × ${lineName(row)} — ${formatPrice(row.total)}`;

/** True when a combo leaves a flavor to the customer, for staff to confirm. */
export const needsFlavorChoice = (order: PricedOrder) =>
  order.lines.some((row) => /any flavor/i.test(row.variant.description ?? ""));

// Menu helpers --------------------------------------------------------------

export const isOrderable = (item: MenuItem) =>
  item.availability === "available" && item.variants.length > 0;

export const orderableCategories = (catalog: MenuCatalog): MenuCategory[] =>
  catalog.categories.filter((category) => category.items.some(isOrderable));

export const categoryOf = (catalog: MenuCatalog, itemId: string) =>
  catalog.categories.find((category) =>
    category.items.some((item) => item.id === itemId),
  ) ?? null;

const photoPath = (itemName: string) =>
  getMenuItemImage(itemName)?.src ?? FALLBACK_PHOTO;

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

// Starting ------------------------------------------------------------------

/** Asks for the mobile number, which the shop needs to reach the customer. */
export function phoneAskReply(note?: string): Reply {
  return buildReply(
    join(
      note,
      "🛒 Let's start your order! First, I need a mobile number the shop can reach you on about this order. 📱",
      "Tap the phone number button below, or type it like this: order 09XXXXXXXXX",
    ),
    [
      ...mainQuickReplies().filter((entry) => entry.payload === PAYLOADS.menu),
      ...staffChoice(),
    ],
    { askPhone: true, listChoices: true },
  );
}

/**
 * The phone number button sent no number, because the Facebook account has
 * none to share. The button can't work for them, so it isn't offered again.
 */
export function phoneMissingReply(): Reply {
  return buildReply(
    join(
      "🤔 I couldn't get a Philippine mobile number from your Facebook account, so the phone number button won't work for you.",
      "📱 Please type your number like this instead: order 09XXXXXXXXX",
    ),
    [
      ...mainQuickReplies().filter((entry) => entry.payload === PAYLOADS.menu),
      ...staffChoice(),
    ],
    { listChoices: true },
  );
}

export const phoneRetryReply = () =>
  phoneAskReply(
    "🤔 I couldn't get a Philippine mobile number from that. I can only take one like 09XXXXXXXXX.",
  );

/** Ordering is switched off (the same switch as the website's). */
export function orderPausedReply(): Reply {
  return buildReply(
    "🙏 Ordering is paused right now, so I can't take orders in this chat. You can still look at the menu 📋 or message our staff 💬.",
    mainQuickReplies("order"),
  );
}

export function orderClosedReply(closure: ClosureContent): Reply {
  return buildReply(
    `${closedTodayText(closure)}\n\n🙏 I can't take orders while the shop is closed. You can still look at the menu 📋 or message our staff 💬.`,
    mainQuickReplies("order"),
  );
}

export function orderOutsideHoursReply(
  status: ShopStatus,
  hours: HoursContent,
): Reply {
  return buildReply(
    `🕒 ${shopClosedMessage(status) ?? ""}\n\n${hoursSummary(hours)}\n\nYou can still look at the menu 📋 or message our staff 💬.`,
    mainQuickReplies("order"),
  );
}

// Browsing ------------------------------------------------------------------

/** The categories as picture cards. */
export function categoriesReply(
  catalog: MenuCatalog,
  origin: string,
  state: OrderState,
  lead?: string,
): Reply {
  const cards = orderableCategories(catalog)
    .slice(0, MAX_CARDS)
    .map((category) => {
      const items = category.items.filter(isOrderable);
      const lowest = getLowestItemPrice(
        items.flatMap((item) => getItemPrices(item)),
      );
      const photo = items.find((item) => getMenuItemImage(item.name));
      return card(
        `${categoryEmoji(category.name)} ${category.name}`,
        `${plural(items.length, "item")}${lowest === null ? "" : ` · from ${formatPrice(lowest)}`}`,
        `${origin}${photo ? photoPath(photo.name) : FALLBACK_PHOTO}`,
        stepButton("👀 See items", "cat", state, [category.id]),
      );
    });
  if (cards.length === 0) {
    return buildReply(
      join(
        lead,
        "😿 Nothing is available to order right now. Please try again later or tap Talk to staff.",
      ),
      mainQuickReplies("order"),
    );
  }
  return buildReply(
    join(
      lead,
      "🛒 What would you like to order? Tap a category to see its items with photos. 📸",
    ),
    orderChoices(state),
    { cards, listChoices: true },
  );
}

/** One category's items as picture cards, with its menu boards before them. */
export function itemsReply(
  category: MenuCategory,
  origin: string,
  state: OrderState,
  lead?: string,
): Reply {
  const items = category.items.filter(isOrderable).slice(0, MAX_CARDS);
  const unavailable = category.items.filter((item) => !isOrderable(item));
  const images = boardImages(category.name, origin);
  const cards = items.map((item) => {
    const price = priceText(item) ?? "";
    const options =
      item.variants.length > 1 && price.startsWith("from")
        ? ` · ${item.variants.length} options`
        : "";
    return card(
      item.name,
      `${price}${options}`,
      `${origin}${photoPath(item.name)}`,
      stepButton("🛒 Order", "item", state, [item.id]),
    );
  });
  return buildReply(
    join(
      lead,
      `${categoryEmoji(category.name)} ${category.name}\nTap Order under the one you want.`,
      images.length > 0 && BOARD_NOTE,
      unavailable.length > 0 &&
        `😿 Not available right now: ${unavailable.map((item) => item.name).join(", ")}.`,
    ),
    [
      ...step("🔙 Categories", "cats", state),
      ...orderChoices(state).slice(0, -1),
    ],
    { cards, images, listChoices: true },
  );
}

// Choosing an option, flavors and add-ons -----------------------------------

/**
 * Button titles for a list of choices. When a name is too long for a button,
 * every choice is numbered instead and the full names go in the message, so
 * nothing is cut off.
 */
function choiceTitles<T>(
  entries: readonly T[],
  label: (entry: T) => string,
  price: (entry: T) => string | null,
): Readonly<{ numbered: boolean; titles: string[]; list: string }> {
  const numbered = entries.some(
    (entry) => label(entry).length > MAX_QUICK_REPLY_TITLE,
  );
  const titles = entries.map((entry, index) => {
    const cost = price(entry);
    if (numbered) return cost ? `${index + 1} · ${cost}` : `${index + 1}`;
    const withPrice = cost ? `${label(entry)} ${cost}` : label(entry);
    return withPrice.length <= MAX_QUICK_REPLY_TITLE ? withPrice : label(entry);
  });
  const list = entries
    .map((entry, index) => {
      const cost = price(entry);
      return `${index + 1}. ${label(entry)}${cost ? ` — ${cost}` : ""}`;
    })
    .join("\n");
  return { numbered, titles, list };
}

const NUMBER_HINT = "Tap its number below. 👇";

/** An item's sizes or combo options, each spelled out with what it comes with. */
export function optionsReply(
  item: MenuItem,
  state: OrderState,
  categoryId: string | null,
): Reply {
  const { numbered, titles } = choiceTitles(
    item.variants,
    (variant) => formatOptionName(variant.name),
    (variant) => {
      const price = variantPriceText(variant);
      return price && !price.startsWith("from") ? price : null;
    },
  );
  return buildReply(
    join(
      `${item.name}\nWhich one would you like?`,
      item.variants
        .map(
          (variant, index) =>
            `${numbered ? `${index + 1}.` : "•"} ${optionLine(variant)}`,
        )
        .join("\n"),
      numbered && NUMBER_HINT,
    ),
    [
      ...item.variants.flatMap((variant, index) =>
        step(titles[index] ?? String(index + 1), "pick", state, [
          item.id,
          variant.id,
          [],
          [],
          0,
        ]),
      ),
      ...(categoryId ? step("🔙 Back", "cat", state, [categoryId]) : []),
    ],
    { listChoices: true },
  );
}

const flavorPrice = (variant: MenuVariant, flavor: string) => {
  const price = variant.flavorPrices.find(
    (entry) => entry.flavor === flavor,
  )?.price;
  return price === undefined ? null : formatPrice(price);
};

/** The next thing to ask for one item: flavors, add-ons, then how many. */
export function pickReply(
  item: MenuItem,
  variant: MenuVariant,
  flavors: readonly string[],
  addOns: readonly string[],
  done: number,
  state: OrderState,
  categoryId: string | null = null,
): Reply {
  // Back goes to the sizes, or to the category when there is only one size.
  const back =
    item.variants.length > 1
      ? step("🔙 Back", "item", state, [item.id])
      : categoryId
        ? step("🔙 Back", "cat", state, [categoryId])
        : [];
  const mixable = allowsFlavorMix(item);
  const flavorsDone =
    done % 2 === 1 ||
    item.flavors.length === 0 ||
    flavors.length >= MAX_MIXED_FLAVORS ||
    (flavors.length > 0 && !mixable);
  const offered = item.addOns ?? [];
  const addOnsDone =
    done >= 2 ||
    offered.length === 0 ||
    offered.every((addOn) => addOns.includes(addOn.label));
  const base = flavorsDone ? done | 1 : done;
  const title = `${item.name}${item.variants.length > 1 ? ` (${formatOptionName(variant.name)})` : ""}`;
  const chosen = join(
    flavors.length > 0 && `Flavor: ${flavors.join(" / ")}`,
    addOns.length > 0 && `Add-ons: ${addOns.join(", ")}`,
  ).replace("\n\n", "\n");
  const header = [title, chosen].filter(Boolean).join("\n");
  const again = (
    nextFlavors: readonly string[],
    nextAddOns: readonly string[],
    next: number,
  ) => [item.id, variant.id, nextFlavors, nextAddOns, next] as const;

  if (!flavorsDone) {
    const first = flavors.length === 0;
    const left = item.flavors
      .filter((flavor) => !flavors.includes(flavor))
      .slice(0, MAX_QUICK_REPLIES - 2);
    const { numbered, titles, list } = choiceTitles(
      left,
      (flavor) => flavor,
      (flavor) => flavorPrice(variant, flavor),
    );
    return buildReply(
      join(
        first
          ? `${header}\n\nPick a flavor: 🍬`
          : `${header}\n\nAdd another flavor (up to ${MAX_MIXED_FLAVORS}), or continue. 🍬`,
        numbered && `${list}\n\n${NUMBER_HINT}`,
      ),
      [
        ...left.flatMap((flavor, index) =>
          step(
            titles[index] ?? flavor,
            "pick",
            state,
            again([...flavors, flavor], addOns, mixable ? base : base | 1),
          ),
        ),
        ...(first
          ? []
          : step(
              "✅ Continue",
              "pick",
              state,
              again(flavors, addOns, base | 1),
            )),
        ...back,
      ],
      { listChoices: true },
    );
  }

  if (!addOnsDone) {
    const left = offered
      .filter((addOn) => !addOns.includes(addOn.label))
      .slice(0, MAX_QUICK_REPLIES - 2);
    const { numbered, titles, list } = choiceTitles(
      left,
      (addOn) => addOn.label,
      (addOn) => formatPrice(addOn.price),
    );
    return buildReply(
      join(
        `${header}\n\nWant any extras? Tap one to add it, or Done. ➕`,
        numbered && `${list}\n\n${NUMBER_HINT}`,
      ),
      [
        ...left.flatMap((addOn, index) =>
          step(
            titles[index] ?? addOn.label,
            "pick",
            state,
            again(flavors, [...addOns, addOn.label], base),
          ),
        ),
        ...step(
          addOns.length > 0 ? "✅ Done" : "No extras",
          "pick",
          state,
          again(flavors, addOns, base | 3),
        ),
        ...back,
      ],
      { listChoices: true },
    );
  }

  const price = resolveVariantUnitPrice(
    item,
    variant,
    encodeLineFlavor(joinFlavorMix(flavors), addOns),
  );
  if (!price.ok) {
    return buildReply(
      `${header}\n\n😿 That combination isn't available. Please choose again.`,
      back,
    );
  }
  return buildReply(
    `${header}\n\n${formatPrice(price.unitPrice)} each. How many would you like? 🔢`,
    [
      ...Array.from({ length: 9 }, (_, index) => index + 1).flatMap((count) =>
        step(String(count), "qty", state, [
          item.id,
          variant.id,
          flavors,
          addOns,
          count,
        ]),
      ),
      ...back,
    ],
    { listChoices: true },
  );
}

// The order -----------------------------------------------------------------

/** The order so far, with buttons to check out, add more or change it. */
export function cartReply(order: PricedOrder, lead?: string): Reply {
  const { state } = order;
  if (order.lines.length === 0) {
    return buildReply(
      join(lead, "🧺 Your order is empty. Let's find something tasty! 😋"),
      [
        ...step("➕ Add items", "cats", state),
        ...step("❌ Cancel order", "clear", state),
      ],
    );
  }
  return buildReply(
    join(
      lead,
      `🧺 Your order\n${order.lines.map(lineText).join("\n")}`,
      `Subtotal: ${formatPrice(order.subtotal)}`,
    ),
    [
      ...step("✅ Checkout", "pay", state),
      ...(state.lines.length < MAX_ORDER_LINES
        ? step("➕ Add more", "cats", state)
        : []),
      ...step("❌ Remove item", "rmask", state),
      ...step("🧹 Clear order", "clear", state),
    ],
  );
}

export function removeAskReply(order: PricedOrder): Reply {
  const { state } = order;
  return buildReply(
    `Which item should I remove?\n${order.lines.map(lineText).join("\n")}`,
    [
      ...order.lines.flatMap((row, index) =>
        step(`❌ ${index + 1}. ${row.item.name}`, "rm", state, [index]),
      ),
      ...step("🔙 Back", "cart", state),
    ],
    { listChoices: true },
  );
}

export function paymentReply(state: OrderState): Reply {
  return buildReply(
    "💳 How will you pay? You pay at the counter when you pick up your order.",
    [
      ...step("💵 Cash", "paid", state, ["Cash"]),
      ...step("📲 GCash", "paid", state, ["GCash"]),
      ...step("🔙 Back", "cart", state),
    ],
  );
}

export function pickupReply(state: OrderState): Reply {
  return buildReply("⏰ When will you pick it up?", [
    ...step("⚡ ASAP", "when", state, ["asap"]),
    ...step("🕐 In 30 minutes", "when", state, ["30m"]),
    ...step("🕑 In 1 hour", "when", state, ["1h"]),
  ]);
}

export type ReviewDetails = Readonly<{
  name: string;
  content: SiteContent | null;
  takeoutBoxPrice: number | null;
}>;

/**
 * The summary to check before placing (FR-108). `state` carries the order's
 * number.
 */
export function reviewReply(
  order: PricedOrder,
  state: OrderState,
  details: ReviewDetails,
  lead?: string,
): Reply {
  const { content } = details;
  const notice = content?.notice.text.trim();
  return buildReply(
    join(
      lead,
      "📝 Please check your order",
      `👤 ${details.name}\n📱 ${state.phone}`,
      order.lines.map(lineText).join("\n"),
      `Subtotal: ${formatPrice(order.subtotal)}\n💳 Pay ${formatPrice(order.subtotal)} via ${state.payment ?? "Cash"} at the counter. The ${takeoutBoxText(details.takeoutBoxPrice)} is not included in that amount.\n⏰ Pickup: ${state.pickup ? PICKUP_TEXT[state.pickup] : "as soon as possible"}`,
      needsFlavorChoice(order) &&
        '💬 Staff will ask you here for the "Any flavor" choices in your combo.',
      content && `🕒 ${hoursSummary(content.hours)}`,
      notice && `📢 Notice: ${notice}`,
      "Tap Place order to send it to the shop. 🛍",
    ),
    [
      ...step("✅ Place order", "place", state),
      ...step("📝 Edit order", "cart", state),
      ...step("❌ Cancel order", "clear", state),
    ],
  );
}

export function clearedReply(): Reply {
  return buildReply(
    "🧹 Your order is cleared. Nothing was sent to the shop. Tap Order here whenever you're ready!",
    mainQuickReplies(),
  );
}

/** The order is in the shop's queue and the customer has its number (FR-108). */
export function placedReply(
  placed: PlaceOrderSuccess,
  anyFlavor: boolean,
): Reply {
  return buildReply(
    join(
      "🎉 Order placed! The shop got it just now.",
      `Your order number is ${placed.reference}. 🧾`,
      "Staff will confirm it during shop hours. You pay at the counter when you pick it up. 💳",
      anyFlavor && '💬 We\'ll ask you here for your "Any flavor" choices.',
      "Tap Order status anytime to see how it's going. 📦",
    ),
    [
      quickReply("📦 Order status", PAYLOADS["order-status"]),
      orderChoice(),
      ...mainQuickReplies("order", "order-status"),
    ],
  );
}

/**
 * Something stopped the order (FR-109). Retrying with the same button is
 * safe.
 */
export function placeFailedReply(state: OrderState): Reply {
  return buildReply(
    "😿 I couldn't place your order just now. Nothing is lost: tap Try again, and it won't create a second order. Or tap Talk to staff.",
    [...step("🔁 Try again", "place", state), ...staffChoice()],
  );
}

export const placeLimitReply = (): Reply =>
  buildReply(
    "⏳ You've placed several orders in a short time. Please wait a few minutes, or tap Talk to staff.",
    mainQuickReplies("order"),
  );

export const phoneProblemLead =
  "🤔 The shop couldn't use that mobile number. Please send it again.";

export const expiredLead =
  "⏱ That summary is out of date, so here is a fresh one. Please check it again.";

export const fullLead =
  "🧺 Your order has reached the most I can carry in chat. Check out first, then start another order.";
