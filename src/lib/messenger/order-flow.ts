/**
 * The steps of an order placed inside Messenger (FR-100 to FR-109).
 *
 * Every button carries the order so far (`order-state.ts`), so this server
 * keeps no cart and stores nothing. A step reads the live menu, checks what
 * the button carried against it, and answers with the next step. Placing the
 * order uses the same database function as the website (`place_online_order`),
 * so the shop's POS app shows it like any online order.
 */

import { findMenuItem } from "@/lib/menu/menu-facts";
import { createRateLimiter } from "@/lib/orders/rate-limit";
import type {
  OrderCustomer,
  PlaceOrderRequest,
  PlaceOrderResult,
} from "@/lib/orders/types";
import {
  allowsFlavorMix,
  encodeLineFlavor,
  findCatalogItem,
  findCatalogVariant,
  joinFlavorMix,
  MAX_MIXED_FLAVORS,
  resolveVariantUnitPrice,
} from "@/lib/ordering/cart-pricing";
import { orderTotal } from "@/lib/site-content/format";
import { shopStatus } from "@/lib/site-content/open-now";
import type { SiteContent } from "@/lib/site-content/types";
import type { MenuCatalog, MenuItem, MenuVariant } from "@/types/menu";

import {
  addLine,
  argChoice,
  argId,
  argInt,
  argTexts,
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  newOrder,
  PAYMENTS,
  PICKUP_TEXT,
  PICKUPS,
  removeLine,
  REVIEW_MAX_AGE_MINUTES,
  withPayment,
  withPickup,
  withReview,
  type OrderLine,
  type OrderState,
  type OrderTap,
  type Pickup,
} from "./order-state";
import {
  cartReply,
  categoriesReply,
  categoryOf,
  clearedReply,
  expiredLead,
  FALLBACK_NAME,
  fullLead,
  isOrderable,
  itemsReply,
  needsFlavorChoice,
  optionsReply,
  orderClosedReply,
  orderOutsideHoursReply,
  orderPausedReply,
  paymentReply,
  pickReply,
  pickupReply,
  placedReply,
  placeFailedReply,
  placeLimitReply,
  priceOrder,
  removeAskReply,
  reviewReply,
  type PricedOrder,
} from "./ordering";
import type { TypedOrder, TypedOrderLine } from "./assistant";
import { menuUnavailableReply, type Reply } from "./replies";

export type PlaceOrderInput = Readonly<{
  customer: OrderCustomer;
  lines: PlaceOrderRequest["lines"];
  /** The subtotal the customer saw, in pesos. */
  expectedSubtotal: number;
}>;

export type OrderFlowDeps = Readonly<{
  /** The website's address, for pictures, menu and order links. */
  origin: string;
  now: () => number;
  onlineOrdering: () => boolean;
  /** The Messenger profile name, or null when it can't be read. */
  readCustomerName: (sender: string) => Promise<string | null>;
  /** null when the menu can't be read. */
  readTakeoutBoxPrice: () => Promise<number | null>;
  /** A fresh random code for one order summary. */
  newNonce: () => string;
  /**
   * Places the order with the website's database function. The same sender
   * and nonce always give the same saved order. null when the outcome is
   * unknown, which is safe to retry.
   */
  placeOrder: (
    sender: string,
    nonce: string,
    order: PlaceOrderInput,
  ) => Promise<PlaceOrderResult | null>;
}>;

export type OrderFacts = Readonly<{
  content: () => Promise<SiteContent>;
  menu: () => Promise<MenuCatalog | null>;
}>;

const MINUTE_MS = 60 * 1000;

/** A summary may be tapped a few minutes before this server's clock. */
const REVIEW_MAX_SKEW_MINUTES = 5;

/**
 * Technical limit against a stuck button (FR-109); the shop has set no
 * limit.
 */
export const PLACE_ORDER_LIMIT = 5;
export const PLACE_WINDOW_MS = 10 * MINUTE_MS;

// Each server instance keeps its own count, so this is best effort. The
// database's idempotency key is what stops a repeated order.
const placeLimiter = createRateLimiter(PLACE_ORDER_LIMIT, PLACE_WINDOW_MS);

/** Forgets the place-order counts (tests). */
export function resetOrderFlow(): void {
  placeLimiter.reset();
}

const minutesOf = (ms: number) => Math.floor(ms / MINUTE_MS);

// Starting ------------------------------------------------------------------

/**
 * "Order here": the categories straight away, or says ordering is paused.
 * The mobile number is optional since 2026-11-17: the shop replies in the
 * chat.
 */
export async function orderIntentReply(
  deps: OrderFlowDeps,
  facts: OrderFacts,
): Promise<Reply> {
  return beginOrder("", deps, facts);
}

export const typedOrderTip =
  '✍️ You can also just type your order, like "2 Nachos and 1 Iced Latte".';

/** Ordering is off, the owner closed the shop for today (FR-111), or the shop is outside its hours (FR-112). */
async function stopReply(
  deps: OrderFlowDeps,
  facts: OrderFacts,
): Promise<Reply | null> {
  if (!deps.onlineOrdering()) return orderPausedReply();
  const content = await facts.content().catch(() => null);
  if (!content) return null;
  const status = shopStatus(
    content.closure,
    content.hours,
    new Date(deps.now()),
  );
  if (status.open) return null;
  return status.reason === "closed-today"
    ? orderClosedReply(content.closure)
    : orderOutsideHoursReply(status, content.hours);
}

/**
 * Starts an order, with the mobile number the customer gave or none (null
 * or "": the phone button had no number to share, which no longer stops
 * the order).
 */
export async function beginOrder(
  phone: string | null,
  deps: OrderFlowDeps,
  facts: OrderFacts,
): Promise<Reply> {
  const stop = await stopReply(deps, facts);
  if (stop) return stop;
  const catalog = await facts.menu();
  if (!catalog) return menuUnavailableReply(deps.origin);
  return categoriesReply(
    catalog,
    deps.origin,
    newOrder(phone ?? ""),
    typedOrderTip,
  );
}

// Reading a button's choices ------------------------------------------------

type Choice = Readonly<{
  item: MenuItem;
  variant: MenuVariant;
  flavors: string[];
  addOns: string[];
}>;

const isUnique = (values: readonly string[]) =>
  new Set(values).size === values.length;

/** An item, size, flavors and add-ons that the live menu really offers. */
function readChoice(catalog: MenuCatalog, args: readonly unknown[]) {
  const itemId = argId(args, 0);
  const variantId = argId(args, 1);
  const flavors = argTexts(args, 2);
  const addOns = argTexts(args, 3);
  if (!itemId || !variantId || !flavors || !addOns) return null;
  const item = findCatalogItem(catalog, itemId);
  const variant = item ? findCatalogVariant(item, variantId) : null;
  if (!item || !variant || !isOrderable(item)) return null;

  const labels = (item.addOns ?? []).map((addOn) => addOn.label);
  const valid =
    flavors.length <= (allowsFlavorMix(item) ? MAX_MIXED_FLAVORS : 1) &&
    isUnique(flavors) &&
    flavors.every((flavor) => item.flavors.includes(flavor)) &&
    isUnique(addOns) &&
    addOns.every((label) => labels.includes(label));
  return valid ? ({ item, variant, flavors, addOns } satisfies Choice) : null;
}

const removedLead = (order: PricedOrder) =>
  order.removed.length > 0
    ? `😿 Not available anymore, so I took it out of your order: ${[...new Set(order.removed)].join(", ")}.`
    : undefined;

// Steps ---------------------------------------------------------------------

/** One button tap of an order in progress. */
export async function answerOrderTap(
  sender: string,
  tap: OrderTap,
  deps: OrderFlowDeps,
  facts: OrderFacts,
): Promise<Reply> {
  const stop = await stopReply(deps, facts);
  if (stop) return stop;
  const { op, state, args } = tap;
  // Nothing was sent to the shop, so there is nothing to undo.
  if (op === "clear") return clearedReply();

  const catalog = await facts.menu();
  if (!catalog) return menuUnavailableReply(deps.origin);
  const origin = deps.origin;
  const browse = (lead: string) =>
    categoriesReply(catalog, origin, state, lead);
  const gone = "😿 That one isn't on the menu right now. Please pick again.";

  switch (op) {
    case "cats":
      return categoriesReply(catalog, origin, state);
    case "cat": {
      const category = catalog.categories.find(
        (entry) => entry.id === argId(args, 0),
      );
      return category?.items.some(isOrderable)
        ? itemsReply(category, origin, state)
        : browse(gone);
    }
    case "item": {
      const item = findCatalogItem(catalog, argId(args, 0) ?? "");
      if (!item || !isOrderable(item)) return browse(gone);
      const [only] = item.variants;
      return item.variants.length === 1 && only
        ? pickReply(
            item,
            only,
            [],
            [],
            0,
            state,
            categoryOf(catalog, item.id)?.id ?? null,
          )
        : optionsReply(item, state, categoryOf(catalog, item.id)?.id ?? null);
    }
    case "pick": {
      const choice = readChoice(catalog, args);
      const done = argInt(args, 4, 0, 3);
      if (!choice || done === null) return browse(gone);
      return pickReply(
        choice.item,
        choice.variant,
        choice.flavors,
        choice.addOns,
        done,
        state,
        categoryOf(catalog, choice.item.id)?.id ?? null,
      );
    }
    case "qty": {
      const choice = readChoice(catalog, args);
      const quantity = argInt(args, 4, 1, MAX_LINE_QUANTITY);
      if (!choice || quantity === null) return browse(gone);
      const flavor = encodeLineFlavor(
        joinFlavorMix(choice.flavors),
        choice.addOns,
      );
      if (!resolveVariantUnitPrice(choice.item, choice.variant, flavor).ok) {
        return browse(gone);
      }
      const next = addLine(state, {
        itemId: choice.item.id,
        variantId: choice.variant.id,
        flavor,
        quantity,
      });
      if (!next) return cartReply(priceOrder(catalog, state), fullLead);
      return cartReply(
        priceOrder(catalog, next),
        `✅ Added ${quantity} × ${choice.item.name} to your order!`,
      );
    }
    case "cart": {
      const order = priceOrder(catalog, state);
      return cartReply(order, removedLead(order));
    }
    case "rmask": {
      const order = priceOrder(catalog, state);
      return order.lines.length > 0
        ? removeAskReply(order)
        : cartReply(order, removedLead(order));
    }
    case "rm": {
      const index = argInt(args, 0, 0, MAX_ORDER_LINES - 1);
      const order = priceOrder(catalog, state);
      if (index === null || index >= order.lines.length) {
        return cartReply(order, removedLead(order));
      }
      return cartReply(
        priceOrder(catalog, removeLine(order.state, index)),
        "🗑 Removed from your order.",
      );
    }
    case "pay": {
      const order = priceOrder(catalog, state);
      return order.lines.length === 0 || order.removed.length > 0
        ? cartReply(order, removedLead(order))
        : paymentReply(order.state);
    }
    case "paid": {
      const payment = argChoice(args, 0, PAYMENTS);
      const order = priceOrder(catalog, state);
      return payment && order.lines.length > 0 && order.removed.length === 0
        ? pickupReply(withPayment(order.state, payment))
        : cartReply(order, removedLead(order));
    }
    case "when": {
      const pickup = argChoice(args, 0, PICKUPS);
      if (!pickup || !state.payment) {
        return cartReply(priceOrder(catalog, state));
      }
      return showReview(
        sender,
        withPickup(state, pickup),
        deps,
        facts,
        catalog,
      );
    }
    case "place":
      return placeOrderStep(sender, state, deps, facts, catalog);
  }
}

// Typed orders --------------------------------------------------------------

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") ===
  b.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * One thing the customer typed, as an order line the live menu really
 * sells; null when the item, size or flavors don't match, or are missing.
 */
export function matchTypedLine(
  catalog: MenuCatalog,
  wanted: TypedOrderLine,
): OrderLine | null {
  const item = findMenuItem(catalog, [wanted.item]);
  if (!item || !isOrderable(item)) return null;
  const [only] = item.variants;
  const variant =
    item.variants.find(
      (entry) => wanted.size && sameName(entry.name, wanted.size),
    ) ?? (item.variants.length === 1 ? only : undefined);
  if (!variant) return null;
  const flavors = wanted.flavors.map(
    (name) => item.flavors.find((flavor) => sameName(flavor, name)) ?? null,
  );
  if (
    flavors.some((flavor) => flavor === null) ||
    (item.flavors.length > 0 && flavors.length === 0) ||
    flavors.length > (allowsFlavorMix(item) ? MAX_MIXED_FLAVORS : 1) ||
    !isUnique(flavors as string[])
  ) {
    return null;
  }
  const flavor = encodeLineFlavor(joinFlavorMix(flavors as string[]), []);
  if (!resolveVariantUnitPrice(item, variant, flavor).ok) return null;
  return {
    itemId: item.id,
    variantId: variant.id,
    flavor,
    quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, wanted.quantity)),
  };
}

/**
 * An order the customer typed, read by Gemini (added 2026-11-17): every
 * line is checked against the live menu and priced, then the summary is
 * shown with Place order, so it takes one tap. What can't be matched is
 * named, and Edit order opens the usual buttons.
 */
export async function typedOrderReply(
  sender: string,
  typed: TypedOrder,
  deps: OrderFlowDeps,
  facts: OrderFacts,
): Promise<Reply> {
  const stop = await stopReply(deps, facts);
  if (stop) return stop;
  const catalog = await facts.menu();
  if (!catalog) return menuUnavailableReply(deps.origin);
  let state = newOrder("");
  const missed: string[] = [];
  for (const wanted of typed.lines) {
    const line = matchTypedLine(catalog, wanted);
    const next = line ? addLine(state, line) : null;
    if (next) state = next;
    else missed.push(wanted.item);
  }
  const notAdded =
    missed.length > 0
      ? `🤔 I couldn't add ${[...new Set(missed)].join(", ")}: please tap Edit order and pick the size or flavor with the buttons.`
      : null;
  if (state.lines.length === 0) {
    return categoriesReply(
      catalog,
      deps.origin,
      state,
      "🤔 I couldn't match that to our menu. Please pick from here, or type it again with the names on the menu.",
    );
  }
  const ready = withPickup(
    withPayment(state, typed.payment ?? "Cash"),
    typed.pickup ?? "asap",
  );
  return showReview(
    sender,
    ready,
    deps,
    facts,
    catalog,
    ["📝 Here's the order I got from your message.", notAdded]
      .filter(Boolean)
      .join("\n"),
  );
}

// Checking and placing ------------------------------------------------------

/** The summary to check, with a new number so it can be placed once. */
async function showReview(
  sender: string,
  state: OrderState,
  deps: OrderFlowDeps,
  facts: OrderFacts,
  catalog: MenuCatalog,
  lead?: string,
): Promise<Reply> {
  const order = priceOrder(catalog, state);
  if (order.lines.length === 0 || order.removed.length > 0) {
    return cartReply(order, removedLead(order));
  }
  const [name, takeoutBoxPrice, content] = await Promise.all([
    deps.readCustomerName(sender).catch(() => null),
    deps.readTakeoutBoxPrice().catch(() => null),
    facts.content().catch(() => null),
  ]);
  const reviewed = withReview(
    order.state,
    deps.newNonce(),
    minutesOf(deps.now()),
  );
  return reviewReply(
    order,
    reviewed,
    { name: name ?? FALLBACK_NAME, content, takeoutBoxPrice },
    lead,
  );
}

/** What the shop's staff read on the order: where it came from, and when. */
function orderNotes(pickup: Pickup, order: PricedOrder): string {
  return [
    "Messenger order.",
    `Pickup: ${PICKUP_TEXT[pickup]}.`,
    needsFlavorChoice(order)
      ? 'Ask the customer in Messenger for the combo\'s "Any flavor" choices.'
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function placeOrderStep(
  sender: string,
  state: OrderState,
  deps: OrderFlowDeps,
  facts: OrderFacts,
  catalog: MenuCatalog,
): Promise<Reply> {
  const { nonce, reviewedAt, payment, pickup } = state;
  if (
    !nonce ||
    reviewedAt === null ||
    !payment ||
    !pickup ||
    state.lines.length === 0
  ) {
    return cartReply(priceOrder(catalog, state));
  }

  // An old summary may show old prices, so it is shown again before placing.
  const age = minutesOf(deps.now()) - reviewedAt;
  if (age > REVIEW_MAX_AGE_MINUTES || -age > REVIEW_MAX_SKEW_MINUTES) {
    return showReview(sender, state, deps, facts, catalog, expiredLead);
  }
  if (!placeLimiter.check(sender, deps.now()).allowed) return placeLimitReply();

  // Prices are the live menu's, never the ones the buttons were showing.
  const order = priceOrder(catalog, state);
  if (order.lines.length === 0 || order.removed.length > 0) {
    return cartReply(order, removedLead(order));
  }

  const [profileName, takeoutBoxPrice] = await Promise.all([
    deps.readCustomerName(sender).catch(() => null),
    deps.readTakeoutBoxPrice().catch(() => null),
  ]);
  const name = profileName ?? FALLBACK_NAME;
  const input = (customerName: string): PlaceOrderInput => ({
    customer: {
      name: customerName,
      phone: state.phone,
      notes: orderNotes(pickup, order),
      paymentPreference: payment,
    },
    lines: order.lines.map(({ line }) => ({
      itemId: line.itemId,
      variantId: line.variantId,
      flavor: line.flavor,
      quantity: line.quantity,
    })),
    // The database adds the takeout box, so the total the customer saw
    // includes it (2026-11-17).
    expectedSubtotal: orderTotal(order.subtotal, takeoutBoxPrice),
  });

  let result = await deps
    .placeOrder(sender, nonce, input(name))
    .catch(() => null);
  // A profile name the shop's form refuses must not stop the order.
  if (
    result &&
    !result.ok &&
    result.reason === "invalid-details" &&
    result.fieldErrors.name &&
    name !== FALLBACK_NAME
  ) {
    result = await deps
      .placeOrder(sender, nonce, input(FALLBACK_NAME))
      .catch(() => null);
  }

  if (!result) return placeFailedReply(state);
  if (result.ok) {
    return placedReply(result, needsFlavorChoice(order));
  }
  switch (result.reason) {
    case "price-changed":
      return showReview(
        sender,
        state,
        deps,
        facts,
        catalog,
        "💸 A price changed while you were ordering, so here is your updated summary.",
      );
    case "line-unavailable": {
      const indexes = [...new Set(result.lines.map((entry) => entry.index))];
      let next = order.state;
      for (const index of indexes.sort((a, b) => b - a)) {
        next = removeLine(next, index);
      }
      return next.lines.length === order.state.lines.length
        ? placeFailedReply(state)
        : cartReply(
            priceOrder(catalog, next),
            "😿 Something just became unavailable, so I took it out. Please check your order again.",
          );
    }
    case "empty-cart":
      return cartReply(priceOrder(catalog, state));
    default:
      return placeFailedReply(state);
  }
}
