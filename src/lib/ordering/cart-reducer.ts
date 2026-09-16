import {
  buildCartItemKey,
  buildSelectionKey,
  calculateLineTotal,
  findCatalogItem,
  findCatalogVariant,
  isValidCartQuantity,
  normalizeFlavor,
  resolveVariantUnitPrice,
} from "@/lib/ordering/cart-pricing";
import type { MenuCatalog } from "@/types/menu";
import type {
  AddCartItemFailureReason,
  AddCatalogSelectionResult,
  CartAction,
  CartItem,
  CartItemSelection,
  CartState,
  FulfillmentType,
} from "@/types/ordering";

/**
 * Client-side cart state boundary.
 *
 * Source-of-truth hardening: the only supported way to add a line is
 * {@link addCatalogSelection}, which takes a price-free {@link CartItemSelection}
 * plus the current catalog and resolves names and unit price internally.
 * The reducer intentionally exposes no price-accepting `add` action, so
 * future UI code cannot dispatch an arbitrary or stale `unitPrice`.
 * `remove`, `update-quantity`, `set-fulfillment`, and `clear` remain available
 * for future UI because none of them carries a price.
 *
 * All transitions are pure and immutable and keep quantity a positive safe
 * integer. The owner-confirmed quantity limit is still
 * TODO: Confirm with Brew ni Cat owner, so no maximum is enforced as shop
 * policy here. This module never reads Supabase data directly
 * and never performs network or storage effects; the catalog is supplied by
 * the caller.
 */

export const INITIAL_FULFILLMENT: FulfillmentType = "pickup";

export function isFulfillmentType(value: unknown): value is FulfillmentType {
  return value === "pickup" || value === "external-rider";
}

export function createInitialCartState(): CartState {
  return { lines: [], fulfillment: INITIAL_FULFILLMENT };
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Internally resolved line input. Names and unit price always come from the
 * current catalog inside {@link addCatalogSelection}; this type is
 * deliberately not exported so UI code cannot construct a priced entry.
 */
type ResolvedCartLineInput = Readonly<{
  itemId: string;
  itemName: string;
  variantId: string;
  variantName: string;
  flavor: string | null;
  unitPrice: number;
  quantity: number;
}>;

function toCartItem(entry: ResolvedCartLineInput): CartItem | null {
  const itemId = entry.itemId.trim();
  const variantId = entry.variantId.trim();
  const itemName = entry.itemName.trim();
  const variantName = entry.variantName.trim();

  if (
    itemId.length === 0 ||
    variantId.length === 0 ||
    itemName.length === 0 ||
    variantName.length === 0 ||
    !isFiniteNonNegative(entry.unitPrice) ||
    !isValidCartQuantity(entry.quantity)
  ) {
    return null;
  }

  const flavor = normalizeFlavor(entry.flavor);
  const key = buildCartItemKey(itemId, variantId, flavor);
  const unitPrice = entry.unitPrice;
  const quantity = entry.quantity;

  return {
    key,
    itemId,
    itemName,
    variantId,
    variantName,
    flavor,
    unitPrice,
    quantity,
    lineTotal: calculateLineTotal(unitPrice, quantity),
  };
}

/**
 * Merge one internally resolved line. Identical configurations merge by
 * adding quantities; different variants or flavors remain separate lines.
 * The current catalog stays the source of truth: when the line already
 * exists, the merged line keeps the merged quantity but takes the newly
 * resolved item/variant names and unit price, then recalculates the line
 * total from that current price. Invalid entries or unsafe-integer overflow
 * leave the state reference unchanged. Not exported: UI code must use
 * {@link addCatalogSelection}.
 */
function appendResolvedLine(
  state: CartState,
  entry: ResolvedCartLineInput,
): CartState {
  const candidate = toCartItem(entry);
  if (candidate === null) {
    return state;
  }

  const existingIndex = state.lines.findIndex(
    (line) => line.key === candidate.key,
  );
  if (existingIndex === -1) {
    return { ...state, lines: [...state.lines, candidate] };
  }

  const existing = state.lines[existingIndex];
  if (!existing) {
    return state;
  }

  const quantity = existing.quantity + candidate.quantity;
  if (!Number.isSafeInteger(quantity)) {
    return state;
  }

  const merged: CartItem = {
    key: candidate.key,
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    variantId: candidate.variantId,
    variantName: candidate.variantName,
    flavor: candidate.flavor,
    unitPrice: candidate.unitPrice,
    quantity,
    lineTotal: calculateLineTotal(candidate.unitPrice, quantity),
  };

  return {
    ...state,
    lines: state.lines.map((line, index) =>
      index === existingIndex ? merged : line,
    ),
  };
}

/** Remove one configuration line. Unknown keys leave state unchanged. */
export function removeCartLine(state: CartState, key: string): CartState {
  if (!state.lines.some((line) => line.key === key)) {
    return state;
  }

  return { ...state, lines: state.lines.filter((line) => line.key !== key) };
}

/**
 * Replace one line quantity. Non-positive, non-safe-integer, or unknown-key
 * updates are ignored so quantity can never become invalid. Use
 * {@link removeCartLine} for explicit removal.
 */
export function updateCartLineQuantity(
  state: CartState,
  key: string,
  quantity: number,
): CartState {
  if (!isValidCartQuantity(quantity)) {
    return state;
  }

  const index = state.lines.findIndex((line) => line.key === key);
  if (index === -1) {
    return state;
  }

  const existing = state.lines[index];
  if (!existing || existing.quantity === quantity) {
    return state;
  }

  const updated: CartItem = {
    ...existing,
    quantity,
    lineTotal: calculateLineTotal(existing.unitPrice, quantity),
  };

  return {
    ...state,
    lines: state.lines.map((line, lineIndex) =>
      lineIndex === index ? updated : line,
    ),
  };
}

export function setCartFulfillment(
  state: CartState,
  fulfillment: FulfillmentType,
): CartState {
  if (!isFulfillmentType(fulfillment) || state.fulfillment === fulfillment) {
    return state;
  }

  return { ...state, fulfillment };
}

/** Remove all lines while retaining the selected fulfillment mode. */
export function clearCart(state: CartState): CartState {
  if (state.lines.length === 0) {
    return state;
  }

  return { ...state, lines: [] };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "remove":
      return removeCartLine(state, action.key);
    case "update-quantity":
      return updateCartLineQuantity(state, action.key, action.quantity);
    case "set-fulfillment":
      return setCartFulfillment(state, action.fulfillment);
    case "clear":
      return clearCart(state);
    default:
      // Unknown or legacy price-injecting actions never alter the cart.
      return state;
  }
}

const FAILURE_MESSAGES: Record<AddCartItemFailureReason, string> = {
  "unknown-item": "That product is no longer listed in the current menu.",
  "unknown-variant":
    "That size or option is no longer listed in the current menu.",
  "unknown-flavor": "That flavor is not available for the selected option.",
  "item-unavailable": "That product is temporarily unavailable.",
  "availability-unknown":
    "That product availability is not confirmed right now.",
  "missing-price":
    "That selection does not have a current price. Choose a flavor or contact the shop.",
  "invalid-quantity": "Quantity must be a whole number of at least 1.",
};

export function getAddItemFailureMessage(
  reason: AddCartItemFailureReason,
): string {
  return FAILURE_MESSAGES[reason];
}

/**
 * Validate a price-free menu selection against the current catalog and add
 * it. Only `available` items can be added; `unavailable` and `unknown` are
 * rejected without mutating the cart. Names and unit price are resolved
 * deterministically from the supplied catalog, never from caller-provided
 * totals. Extra runtime properties such as a caller-supplied `unitPrice`
 * are ignored.
 */
export function addCatalogSelection(
  state: CartState,
  catalog: MenuCatalog,
  selection: CartItemSelection,
): AddCatalogSelectionResult {
  if (!isValidCartQuantity(selection.quantity)) {
    return {
      ok: false,
      state,
      reason: "invalid-quantity",
      message: FAILURE_MESSAGES["invalid-quantity"],
    };
  }

  const item = findCatalogItem(catalog, selection.itemId);
  if (!item) {
    return {
      ok: false,
      state,
      reason: "unknown-item",
      message: FAILURE_MESSAGES["unknown-item"],
    };
  }

  if (item.availability === "unavailable") {
    return {
      ok: false,
      state,
      reason: "item-unavailable",
      message: FAILURE_MESSAGES["item-unavailable"],
    };
  }

  if (item.availability === "unknown") {
    return {
      ok: false,
      state,
      reason: "availability-unknown",
      message: FAILURE_MESSAGES["availability-unknown"],
    };
  }

  const variant = findCatalogVariant(item, selection.variantId);
  if (!variant) {
    return {
      ok: false,
      state,
      reason: "unknown-variant",
      message: FAILURE_MESSAGES["unknown-variant"],
    };
  }

  const resolved = resolveVariantUnitPrice(item, variant, selection.flavor);
  if (!resolved.ok) {
    const reason: AddCartItemFailureReason =
      resolved.reason === "unknown-flavor" ? "unknown-flavor" : "missing-price";
    return { ok: false, state, reason, message: FAILURE_MESSAGES[reason] };
  }

  const next = appendResolvedLine(state, {
    itemId: item.id,
    itemName: item.name,
    variantId: variant.id,
    variantName: variant.name,
    flavor: selection.flavor,
    unitPrice: resolved.unitPrice,
    quantity: selection.quantity,
  });

  return {
    ok: true,
    state: next,
    lineKey: buildSelectionKey(selection),
  };
}
