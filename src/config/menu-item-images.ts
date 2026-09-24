export type MenuItemImage = Readonly<{
  src: string;
  alt: string;
}>;

/**
 * Local static photos for Menu cards. Keys are normalized base names
 * (lowercase, parenthetical nicknames stripped). Supabase remains the
 * source of truth for item names and prices — this map never invents a
 * remote image column.
 */
const menuItemImagesByName: Readonly<Record<string, MenuItemImage>> = {
  "buldak carbo": {
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy noodles with a fried egg and seaweed served at Brew ni Cat",
  },
  "buldak cheese": {
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy cheese-style noodles with egg and seaweed at Brew ni Cat",
  },
  "sedaap original": {
    src: "/images/shop/photo_011.jpg",
    alt: "Wavy noodle plate with fried egg and seaweed at Brew ni Cat",
  },
  "sedaap spicy chicken": {
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy noodle plate with fried egg and seaweed at Brew ni Cat",
  },
  "cat treats": {
    src: "/images/shop/photo_006.jpg",
    alt: "Fluffy white café cat — Cat Treats are for cats, not people",
  },
  fries: {
    src: "/images/shop/photo_041.jpg",
    alt: "Wire basket of golden fries (Cat Claws) on a Brew ni Cat table",
  },
  nachos: {
    src: "/images/menu/bites.jpg",
    alt: "Cat-Tastic Bites menu art featuring nachos, fries, and takoyaki",
  },
  takoyaki: {
    src: "/images/shop/photo_155.jpg",
    alt: "Takoyaki (Pawsome Balls) in wooden trays on the Brew ni Cat patio",
  },
  "cat-feine": {
    src: "/images/shop/photo_012.jpg",
    alt: "Three iced Cat-Feine coffee drinks with cat stickers at Brew ni Cat",
  },
  matcha: {
    src: "/images/shop/photo_148.jpg",
    alt: "Salted caramel matcha beside a gray café cat at Brew ni Cat",
  },
  oreo: {
    src: "/images/shop/photo_152.jpg",
    alt: "Caramel Oreo drink beside a white café cat by the window",
  },
  soda: {
    src: "/images/shop/photo_042.jpg",
    alt: "Colorful Fizzy Felines sodas in clear cups at Brew ni Cat",
  },
  "cat association": {
    src: "/images/shop/photo_030.jpg",
    alt: "Shared table of sodas, fries, and takoyaki for a group combo",
  },
  "couple of cats": {
    src: "/images/shop/photo_074.jpg",
    alt: "Shared fries, takoyaki, and sodas for a Couple of Cats combo",
  },
  "single-paw-rtner combos": {
    src: "/images/shop/photo_157.jpg",
    alt: "Single drink and fries set with a café cat at Brew ni Cat",
  },
  "take-out box": {
    src: "/images/shop/photo_078.jpg",
    alt: "White take-out containers and drinks on the Brew ni Cat patio",
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
