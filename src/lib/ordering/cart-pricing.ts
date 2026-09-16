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

/** Interim client-side sanity bound pending owner-confirmed limits. */
export const CART_MIN_QUANTITY = 1;

/** Interim client-side sanity bound pending owner-confirmed limits. */
export const CART_MAX_QUANTITY = 99;

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
    Number.isInteger(value) &&
    value >= CART_MIN_QUANTITY &&
    value <= CART_MAX_QUANTITY
  );
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

/** Subtotal in pesos for already-resolved cart lines. */
export function calculateSubtotal(
  lines: readonly Readonly<{ unitPrice: number; quantity: number }>[],
): number {
  let totalCentavos = 0;
  for (const line of lines) {
    totalCentavos += toCentavos(line.unitPrice) * line.quantity;
  }

  return fromCentavos(totalCentavos);
}
