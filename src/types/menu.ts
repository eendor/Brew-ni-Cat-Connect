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

export type MenuItem = Readonly<{
  id: string;
  name: string;
  availability: MenuAvailability;
  flavors: readonly string[];
  variants: readonly MenuVariant[];
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

export type ItemRow = Readonly<{
  id: string;
  category_id: string | null;
  name: string | null;
  flavors: string | null;
  variants_json: unknown;
  is_available: boolean | null;
}>;
