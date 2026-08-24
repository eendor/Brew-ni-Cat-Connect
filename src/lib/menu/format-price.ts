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
