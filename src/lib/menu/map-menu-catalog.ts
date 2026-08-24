import type {
  CategoryRow,
  FlavorPrice,
  ItemRow,
  MenuAvailability,
  MenuCatalog,
  MenuItem,
  MenuVariant,
} from "@/types/menu";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanPrice(value: unknown): number | null {
  const price = typeof value === "string" ? Number(value) : value;

  return typeof price === "number" && Number.isFinite(price) && price >= 0
    ? price
    : null;
}

function parseVariantSource(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapFlavorPrices(value: unknown): readonly FlavorPrice[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .map(([flavor, rawPrice]) => {
      const price = cleanPrice(rawPrice);
      const name = cleanText(flavor);

      return price === null || name === null ? null : { flavor: name, price };
    })
    .filter((entry): entry is FlavorPrice => entry !== null)
    .sort((left, right) => left.flavor.localeCompare(right.flavor));
}

function mapVariants(value: unknown, itemId: string): readonly MenuVariant[] {
  return parseVariantSource(value)
    .map((rawVariant, index) => {
      if (!isRecord(rawVariant)) {
        return null;
      }

      const name = cleanText(rawVariant.name);
      if (name === null) {
        return null;
      }

      return {
        id: cleanText(rawVariant.id) ?? `${itemId}-variant-${index + 1}`,
        name,
        basePrice: cleanPrice(rawVariant.basePrice),
        flavorPrices: mapFlavorPrices(rawVariant.priceByFlavor),
        description: cleanText(rawVariant.description),
      } satisfies MenuVariant;
    })
    .filter((variant): variant is MenuVariant => variant !== null);
}

function mapAvailability(value: boolean | null): MenuAvailability {
  if (value === true) {
    return "available";
  }

  if (value === false) {
    return "unavailable";
  }

  return "unknown";
}

function mapItem(row: ItemRow): MenuItem | null {
  const name = cleanText(row.name);
  if (name === null) {
    return null;
  }

  const flavors = (row.flavors ?? "")
    .split("|")
    .map((flavor) => flavor.trim())
    .filter(
      (flavor, index, collection) =>
        Boolean(flavor) && collection.indexOf(flavor) === index,
    );

  return {
    id: row.id,
    name,
    availability: mapAvailability(row.is_available),
    flavors,
    variants: mapVariants(row.variants_json, row.id),
  };
}

export function mapMenuCatalog(
  categoryRows: readonly CategoryRow[],
  itemRows: readonly ItemRow[],
): MenuCatalog {
  const categories = categoryRows
    .map((category) => {
      const name = cleanText(category.name);
      if (name === null) {
        return null;
      }

      const items = itemRows
        .filter((item) => item.category_id === category.id)
        .map(mapItem)
        .filter((item): item is MenuItem => item !== null)
        .sort((left, right) => left.name.localeCompare(right.name));

      return { id: category.id, name, items };
    })
    .filter(
      (category): category is NonNullable<typeof category> => category !== null,
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return { categories };
}
