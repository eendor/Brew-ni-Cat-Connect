import type { MenuCatalog, MenuItem, MenuVariant } from "@/types/menu";
import type { CartItemSelection } from "@/types/ordering";

/**
 * Deterministic unit-price resolution from current menu-derived data.
 *
 * No product price is hardcoded here. Every price comes from the supplied
 * catalog records, which are mapped from Supabase and remain the source of
 * truth. A zero `basePrice` with flavor prices (for example Takoyaki) is a
 * placeholder: the bare variant has no purchasable price and a flavor must
 * be selected.
 */

export const CENTAVOS_PER_PESO = 100;

/**
 * Technical lower bound for a cart quantity. This is not a Brew ni Cat
 * business rule: the owner-confirmed quantity limit is still
 * TODO: Confirm with Brew ni Cat owner. Validation accepts any positive safe
 * integer so no unconfirmed maximum is presented as shop policy.
 */
export const CART_MIN_QUANTITY = 1;

export type ResolvePriceFailureReason = "unknown-flavor" | "missing-price";

export type ResolvePriceResult =
  | Readonly<{ ok: true; unitPrice: number }>
  | Readonly<{ ok: false; reason: ResolvePriceFailureReason }>;

/**
 * Trim a caller-supplied flavor. Empty/whitespace-only input becomes `null`
 * so identity, lookup, and pricing treat " Veggie " and "Veggie" as one
 * configuration while keeping `null` distinct from any real flavor.
 */
export function normalizeFlavor(
  flavor: string | null | undefined,
): string | null {
  if (typeof flavor !== "string") {
    return null;
  }

  const trimmed = flavor.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Convert pesos to integer centavos with half-up rounding. */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * CENTAVOS_PER_PESO);
}

/** Convert integer centavos back to pesos. */
export function fromCentavos(centavos: number): number {
  return centavos / CENTAVOS_PER_PESO;
}

/** Canonicalize a catalog price to two-decimal peso precision. */
export function normalizePrice(price: number): number {
  return fromCentavos(toCentavos(price));
}

export function isValidCartQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= CART_MIN_QUANTITY
  );
}

/**
 * Technical money-safety guard. A quantity can be a positive safe integer on
 * its own yet still overflow centavo arithmetic once multiplied by a price,
 * so the cart boundary checks the product before accepting it. This is only
 * a numeric-precision guard, not a Brew ni Cat business limit: the
 * owner-confirmed quantity limit is still TODO: Confirm with Brew ni Cat
 * owner. Zero-priced explicit flavor selections stay valid because their
 * centavo total is always zero.
 */
export function isSafeLineQuantity(
  unitPrice: unknown,
  quantity: unknown,
): boolean {
  if (!isValidCartQuantity(quantity)) {
    return false;
  }

  if (
    typeof unitPrice !== "number" ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0
  ) {
    return false;
  }

  const priceCentavos = toCentavos(unitPrice);
  if (!Number.isSafeInteger(priceCentavos) || priceCentavos < 0) {
    return false;
  }

  if (priceCentavos === 0) {
    return true;
  }

  return quantity <= Math.floor(Number.MAX_SAFE_INTEGER / priceCentavos);
}

function isFiniteNonNegativePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * A bare variant price is purchasable only when it rounds to a positive
 * centavo amount. Zero without a selected flavor override is the catalog
 * placeholder pattern and must not become a `₱0` line.
 */
function hasPurchasableBasePrice(variant: MenuVariant): boolean {
  return (
    variant.basePrice !== null &&
    isFiniteNonNegativePrice(variant.basePrice) &&
    toCentavos(variant.basePrice) > 0
  );
}

/** Joins the flavors of a mixed order, e.g. "BBQ Scratch / Cheesy Purr" (same as the POS). */
export const FLAVOR_MIX_SEPARATOR = " / ";

/** Fries can mix up to this many flavors, at the normal size price. */
export const MAX_MIXED_FLAVORS = 2;

/** Mixing is offered on fries only for now (the same rule as the POS). */
export function allowsFlavorMix(item: Pick<MenuItem, "id" | "name">): boolean {
  return /fries/i.test(item.id) || /fries/i.test(item.name);
}

// Add-ons ride in the flavor text the same way the POS stores them:
// "Spicy + Egg (Boiled), Hotdog", or "+ Egg (Boiled)" when there is no flavor.
const ADD_ON_SEPARATOR = " + ";
const ADD_ON_PREFIX = "+ ";
const ADD_ON_LABEL_SEPARATOR = ", ";

export type LineFlavorParts = Readonly<{
  flavor: string | null;
  addOns: readonly string[];
  /** True when the text has an add-on part, even an empty one. */
  hasAddOnPart: boolean;
}>;

/** Splits stored flavor text into the flavor and the add-on labels. */
export function splitAddOns(text: string | null | undefined): LineFlavorParts {
  const trimmed = normalizeFlavor(text);
  if (trimmed === null)
    return { flavor: null, addOns: [], hasAddOnPart: false };
  let before = trimmed;
  let rest: string | null = null;
  if (trimmed.startsWith(ADD_ON_PREFIX)) {
    before = "";
    rest = trimmed.slice(ADD_ON_PREFIX.length);
  } else {
    const at = trimmed.indexOf(ADD_ON_SEPARATOR);
    if (at >= 0) {
      before = trimmed.slice(0, at);
      rest = trimmed.slice(at + ADD_ON_SEPARATOR.length);
    }
  }
  const addOns =
    rest === null
      ? []
      : rest
          .split(",")
          .map((label) => label.trim())
          .filter((label) => label.length > 0);
  return {
    flavor: normalizeFlavor(before),
    addOns,
    hasAddOnPart: rest !== null,
  };
}

/** The stored flavor text for a flavor and its add-ons. */
export function encodeLineFlavor(
  flavor: string | null,
  addOns: readonly string[],
): string | null {
  const base = normalizeFlavor(flavor);
  if (addOns.length === 0) return base;
  const labels = addOns.join(ADD_ON_LABEL_SEPARATOR);
  return base === null
    ? `${ADD_ON_PREFIX}${labels}`
    : `${base}${ADD_ON_SEPARATOR}${labels}`;
}

/** The flavors in a stored flavor: none, one, or each part of a mix. */
export function splitFlavorMix(flavor: string | null | undefined): string[] {
  const normalized = normalizeFlavor(flavor);
  if (normalized === null) return [];
  return normalized
    .split(FLAVOR_MIX_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** The stored flavor for the picked flavors, or null when none are picked. */
export function joinFlavorMix(flavors: readonly string[]): string | null {
  return flavors.length === 0 ? null : flavors.join(FLAVOR_MIX_SEPARATOR);
}

/** True when the flavor is one of the item's flavors or a valid mix of them. */
export function isAllowedFlavor(
  item: MenuItem,
  flavor: string | null | undefined,
): boolean {
  const parts = splitFlavorMix(flavor);
  return (
    parts.length > 0 &&
    (parts.length === 1 || allowsFlavorMix(item)) &&
    parts.length <= MAX_MIXED_FLAVORS &&
    new Set(parts).size === parts.length &&
    parts.every((part) => item.flavors.includes(part))
  );
}

function findFlavorPrice(variant: MenuVariant, flavor: string): number | null {
  const match = variant.flavorPrices.find((entry) => entry.flavor === flavor);
  if (!match || !isFiniteNonNegativePrice(match.price)) {
    return null;
  }

  return match.price;
}

/**
 * Build the deterministic identity for one item/variant/flavor
 * configuration. Identical configurations share a key and merge; any
 * difference in item, variant, or normalized flavor yields a separate key.
 */
export function buildCartItemKey(
  itemId: string,
  variantId: string,
  flavor: string | null | undefined,
): string {
  return `${itemId}::${variantId}::${normalizeFlavor(flavor) ?? ""}`;
}

export function buildSelectionKey(selection: CartItemSelection): string {
  return buildCartItemKey(
    selection.itemId,
    selection.variantId,
    selection.flavor,
  );
}

export function findCatalogItem(
  catalog: MenuCatalog,
  itemId: string,
): MenuItem | null {
  for (const category of catalog.categories) {
    const match = category.items.find((item) => item.id === itemId);
    if (match) {
      return match;
    }
  }

  return null;
}

export function findCatalogVariant(
  item: MenuItem,
  variantId: string,
): MenuVariant | null {
  return item.variants.find((variant) => variant.id === variantId) ?? null;
}

/**
 * Resolve one purchasable unit price from already-located menu records.
 *
 * - A selected flavor must be a member of the item's allowed flavors.
 * - An allowed flavor with an explicit variant flavor price always wins,
 *   including when the variant base is the zero placeholder.
 * - An allowed flavor without an explicit override falls back to a positive
 *   base price.
 * - An unallowed flavor is rejected with unknown-flavor even if present in
 *   variant flavor prices.
 * - No flavor with a zero base plus flavor prices requires a flavor choice.
 */
export function resolveVariantUnitPrice(
  item: MenuItem,
  variant: MenuVariant,
  flavor: string | null | undefined,
): ResolvePriceResult {
  const parts = splitAddOns(flavor);
  if (!parts.hasAddOnPart)
    return resolveFlavorPrice(item, variant, parts.flavor);

  // Each add-on must be one of this item's extras, once.
  const offered = new Map(
    (item.addOns ?? []).map((addOn) => [addOn.label, addOn.price]),
  );
  if (
    parts.addOns.length === 0 ||
    new Set(parts.addOns).size !== parts.addOns.length ||
    !parts.addOns.every((label) => offered.has(label))
  ) {
    return { ok: false, reason: "unknown-flavor" };
  }
  const base = resolveFlavorPrice(item, variant, parts.flavor);
  if (!base.ok) return base;
  const extras = parts.addOns.reduce(
    (sum, label) => sum + (offered.get(label) ?? 0),
    0,
  );
  return { ok: true, unitPrice: normalizePrice(base.unitPrice + extras) };
}

function resolveFlavorPrice(
  item: MenuItem,
  variant: MenuVariant,
  flavor: string | null,
): ResolvePriceResult {
  const selectedFlavor = normalizeFlavor(flavor);

  if (selectedFlavor !== null) {
    if (!isAllowedFlavor(item, selectedFlavor)) {
      return { ok: false, reason: "unknown-flavor" };
    }

    const parts = splitFlavorMix(selectedFlavor);
    if (parts.length > 1) {
      // A mix costs the size price. When this size prices flavors
      // differently, the dearest flavor in the mix applies, so a mix never
      // costs less than one of its flavors alone.
      let highest: number | null = null;
      for (const part of parts) {
        const partPrice =
          findFlavorPrice(variant, part) ??
          (hasPurchasableBasePrice(variant) ? variant.basePrice : null);
        if (partPrice === null) {
          return { ok: false, reason: "missing-price" };
        }
        highest = highest === null ? partPrice : Math.max(highest, partPrice);
      }
      return { ok: true, unitPrice: normalizePrice(highest ?? 0) };
    }

    const override = findFlavorPrice(variant, selectedFlavor);

    if (override !== null) {
      return { ok: true, unitPrice: normalizePrice(override) };
    }

    if (hasPurchasableBasePrice(variant) && variant.basePrice !== null) {
      return { ok: true, unitPrice: normalizePrice(variant.basePrice) };
    }

    return { ok: false, reason: "missing-price" };
  }

  if (variant.basePrice === 0 && variant.flavorPrices.length > 0) {
    return { ok: false, reason: "missing-price" };
  }

  if (hasPurchasableBasePrice(variant) && variant.basePrice !== null) {
    return { ok: true, unitPrice: normalizePrice(variant.basePrice) };
  }

  return { ok: false, reason: "missing-price" };
}

/** Line total in pesos, computed through integer centavos. */
export function calculateLineTotal(
  unitPrice: number,
  quantity: number,
): number {
  return fromCentavos(toCentavos(unitPrice) * quantity);
}

export type CartSubtotalLine = Readonly<{
  unitPrice: number;
  quantity: number;
}>;

/**
 * Technical cart-wide money-safety guard. Each line can be individually safe
 * while their combined centavo total still overflows safe-integer precision,
 * so the cart boundary checks the whole subtotal before accepting a change.
 * This is only a numeric-precision guard, not a Brew ni Cat business limit.
 * Zero-priced lines stay valid because they add nothing to the total.
 */
export function isSafeCartSubtotal(
  lines: readonly CartSubtotalLine[],
): boolean {
  let totalCentavos = 0;

  for (const line of lines) {
    if (!isSafeLineQuantity(line.unitPrice, line.quantity)) {
      return false;
    }

    const lineCentavos = toCentavos(line.unitPrice) * line.quantity;
    if (!Number.isSafeInteger(lineCentavos)) {
      return false;
    }

    if (lineCentavos > Number.MAX_SAFE_INTEGER - totalCentavos) {
      return false;
    }

    totalCentavos += lineCentavos;
  }

  return Number.isSafeInteger(totalCentavos);
}

/**
 * Subtotal in pesos for already-resolved cart lines.
 *
 * Uses exact integer-centavo arithmetic. Throws a `RangeError` for arbitrary
 * input whose centavo total cannot be represented safely; validated
 * `CartState` paths check `isSafeCartSubtotal` first and must never reach
 * that failure.
 */
export function calculateSubtotal(lines: readonly CartSubtotalLine[]): number {
  if (!isSafeCartSubtotal(lines)) {
    throw new RangeError(
      "Cart subtotal exceeds safe integer precision in centavos.",
    );
  }

  let totalCentavos = 0;
  for (const line of lines) {
    totalCentavos += toCentavos(line.unitPrice) * line.quantity;
  }

  return fromCentavos(totalCentavos);
}
