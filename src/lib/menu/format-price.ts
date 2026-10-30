import type { MenuItem } from "@/types/menu";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(price: number): string {
  return pesoFormatter.format(price);
}

export function getLowestItemPrice(
  prices: readonly (number | null)[],
): number | null {
  const validPrices = prices.filter(
    (price): price is number => price !== null && Number.isFinite(price),
  );

  return validPrices.length > 0 ? Math.min(...validPrices) : null;
}

/**
 * Every price an item is sold at. A base price of 0 next to flavor prices is
 * the POS's "priced by flavor" marker, not a free item.
 */
export function getItemPrices(item: MenuItem): readonly (number | null)[] {
  return item.variants.flatMap((variant) => {
    const flavorPrices = variant.flavorPrices.map((entry) => entry.price);
    const basePrice =
      variant.basePrice === 0 && flavorPrices.length > 0
        ? []
        : [variant.basePrice];

    return [...basePrice, ...flavorPrices];
  });
}
