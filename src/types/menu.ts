export type MenuAvailability = "available" | "unavailable" | "unknown";

export type FlavorPrice = Readonly<{
  flavor: string;
  price: number;
}>;

export type MenuVariant = Readonly<{
  id: string;
  name: string;
  basePrice: number | null;
  flavorPrices: readonly FlavorPrice[];
  description: string | null;
}>;

/** A paid extra, like an egg on noodles. Priced in pesos. */
export type MenuAddOn = Readonly<{
  id: string;
  label: string;
  price: number;
}>;

export type MenuItem = Readonly<{
  id: string;
  name: string;
  availability: MenuAvailability;
  flavors: readonly string[];
  variants: readonly MenuVariant[];
  /** Extras offered for this item's category; empty or missing means none. */
  addOns?: readonly MenuAddOn[];
}>;

export type MenuCategory = Readonly<{
  id: string;
  name: string;
  items: readonly MenuItem[];
}>;

export type MenuCatalog = Readonly<{
  categories: readonly MenuCategory[];
}>;

export type CategoryRow = Readonly<{
  id: string;
  name: string | null;
}>;

export type AddOnRow = Readonly<{
  id: string;
  category_id: string | null;
  label: string | null;
  price: number | null;
  sort_order: number | null;
}>;

export type ItemRow = Readonly<{
  id: string;
  category_id: string | null;
  name: string | null;
  flavors: string | null;
  variants_json: unknown;
  is_available: boolean | null;
}>;
