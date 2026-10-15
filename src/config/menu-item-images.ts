export type MenuItemImage = Readonly<{
  src: string;
  alt: string;
}>;

/**
 * Local static photos for Menu cards. Supabase remains the source of truth
 * for item names and prices — this map never invents a remote image column.
 *
 * Policy: only real Brew ni Cat product photos where the item itself fills
 * the frame (no menu-board graphics, no people, no stock photos). Every
 * photo belongs to exactly one item so no two Menu cards share an image.
 * Items without a matching photo stay imageless until one is captured.
 *
 * Lookup is exact: an item matches by its base name (e.g. "Takoyaki") or
 * its parenthetical nickname (e.g. "Pawsome Balls"), never by prefix.
 */
const menuItemImages = [
  {
    names: ["takoyaki", "pawsome balls"],
    image: {
      src: "/images/menu/items/takoyaki-pawsome-balls.jpg",
      alt: "Takoyaki balls topped with sauce, mayo and bonito flakes",
    },
  },
  {
    names: ["buldak carbo"],
    image: {
      src: "/images/menu/items/buldak-carbo.jpg",
      alt: "Buldak Carbo spicy noodles with a fried egg",
    },
  },
  {
    names: ["buldak cheese"],
    image: {
      src: "/images/menu/items/buldak-cheese.jpg",
      alt: "Buldak Cheese spicy noodles with a fried egg",
    },
  },
  {
    names: ["fries", "cat claws"],
    image: {
      src: "/images/menu/items/fries-cat-claws.jpg",
      alt: "Fries served in a wire cone in front of the Brew ni Cat logo wall",
    },
  },
  {
    names: ["cat-feine"],
    image: {
      src: "/images/menu/items/cat-feine-iced-latte.jpg",
      alt: "Cat-Feine iced latte in a clear cup",
    },
  },
  {
    names: ["matcha", "the lucky green neko", "lucky green neko"],
    image: {
      src: "/images/menu/items/lucky-green-neko-matcha.jpg",
      alt: "The Lucky Green Neko iced dirty matcha with an espresso layer",
    },
  },
] as const satisfies ReadonlyArray<{
  names: ReadonlyArray<string>;
  image: MenuItemImage;
}>;

const menuItemImagesByName: ReadonlyMap<string, MenuItemImage> = new Map(
  menuItemImages.flatMap(({ names, image }) =>
    names.map((name) => [name, image] as const),
  ),
);

/** All distinct photo paths used on Menu cards (exported for tests). */
export const menuItemImageSources: ReadonlyArray<string> = menuItemImages.map(
  ({ image }) => image.src,
);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getMenuItemImage(itemName: string): MenuItemImage | null {
  const base = normalize(itemName.replace(/\([^)]*\)/g, " "));
  const nicknames = [...itemName.matchAll(/\(([^)]*)\)/g)].map((match) =>
    normalize(match[1] ?? ""),
  );

  for (const candidate of [base, ...nicknames]) {
    if (!candidate) {
      continue;
    }
    const image = menuItemImagesByName.get(candidate);
    if (image) {
      return image;
    }
  }

  return null;
}
