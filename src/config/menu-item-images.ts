export type MenuItemImage = Readonly<{
  src: string;
  alt: string;
}>;

/**
 * Local static photos for Menu cards. Keys are normalized base names
 * (lowercase, parenthetical nicknames stripped). Supabase remains the
 * source of truth for item names and prices — this map never invents a
 * remote image column.
 *
 * Policy: food/drink product fills the frame only — no people, no cats,
 * no flyer art. Shop stills kept only when they already meet that bar;
 * otherwise royalty-free stock under /images/menu/items/.
 */
const menuItemImagesByName: Readonly<Record<string, MenuItemImage>> = {
  "buldak carbo": {
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy curly noodles with fried egg and seaweed in a wire basket",
  },
  "buldak cheese": {
    src: "/images/shop/photo_011.jpg",
    alt: "Cheese-style spicy noodles with fried egg and seaweed",
  },
  "sedaap original": {
    src: "/images/shop/photo_011.jpg",
    alt: "Wavy noodles with fried egg and seaweed sheets",
  },
  "sedaap spicy chicken": {
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy noodle plate with fried egg and seaweed",
  },
  fries: {
    src: "/images/menu/items/fries.jpg",
    alt: "Golden french fries in a wire basket with dipping sauce",
  },
  nachos: {
    src: "/images/menu/items/nachos.jpg",
    alt: "Loaded nachos with cheese, salsa, jalapeños, and crema",
  },
  takoyaki: {
    src: "/images/menu/items/takoyaki.jpg",
    alt: "Takoyaki balls with mayo, sauce, and bonito flakes",
  },
  "cat-feine": {
    src: "/images/shop/photo_012.jpg",
    alt: "Three iced coffee drinks in clear cups",
  },
  matcha: {
    src: "/images/menu/items/matcha.jpg",
    alt: "Creamy matcha latte in a white cup with latte art",
  },
  oreo: {
    src: "/images/menu/items/oreo-drink.jpg",
    alt: "Cookies-and-cream drink topped with whipped cream and a cookie",
  },
  soda: {
    src: "/images/menu/items/soda.jpg",
    alt: "Three colorful fruit sodas in tall glasses with ice and mint",
  },
  "cat association": {
    src: "/images/menu/items/combo-spread.jpg",
    alt: "Shared cafe combo plate with fries, sides, and a cold drink",
  },
  "couple of cats": {
    src: "/images/menu/items/combo-spread.jpg",
    alt: "Cafe food combo with fries and a cold drink for two",
  },
  "single-paw-rtner combos": {
    src: "/images/menu/items/combo-spread.jpg",
    alt: "Single cafe combo plate with fries and a cold drink",
  },
  "take-out box": {
    src: "/images/menu/items/takeout-box.jpg",
    alt: "Open white take-out box filled with noodles and chopsticks",
  },
};

function normalizeMenuItemName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMenuItemImage(itemName: string): MenuItemImage | null {
  const normalized = normalizeMenuItemName(itemName);
  if (!normalized) {
    return null;
  }

  const exact = menuItemImagesByName[normalized];
  if (exact) {
    return exact;
  }

  for (const [key, image] of Object.entries(menuItemImagesByName)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return image;
    }
  }

  return null;
}
