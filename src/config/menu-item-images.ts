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
 * Policy: only real Brew ni Cat shop stills where food/drink fills the
 * frame (no people, no cats, no flyer art, no internet stock). Items
 * without a matching still omit a photo until one is captured.
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
  "cat-feine": {
    src: "/images/shop/photo_012.jpg",
    alt: "Three iced coffee drinks in clear cups",
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
