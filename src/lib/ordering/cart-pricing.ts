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
 * - A selected flavor with an explicit flavor price always wins, including
 *   when the variant base is the zero placeholder.
 * - A selected flavor known to the item but without an explicit override
 *   falls back to a positive base price.
 * - A selected flavor known to neither the item nor the variant is unknown.
 * - No flavor with a zero base plus flavor prices requires a flavor choice.
 */
export function resolveVariantUnitPrice(
  item: MenuItem,
  variant: MenuVariant,
  flavor: string | null | undefined,
): ResolvePriceResult {
  const selectedFlavor = normalizeFlavor(flavor);

  if (selectedFlavor !== null) {
    const override = findFlavorPrice(variant, selectedFlavor);
    if (override !== null) {
      return { ok: true, unitPrice: normalizePrice(override) };
    }

    if (item.flavors.includes(selectedFlavor)) {
      if (hasPurchasableBasePrice(variant) && variant.basePrice !== null) {
        return { ok: true, unitPrice: normalizePrice(variant.basePrice) };
      }

      return { ok: false, reason: "missing-price" };
    }

    return { ok: false, reason: "unknown-flavor" };
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
