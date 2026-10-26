export type MenuItemImage = Readonly<{
  src: string;
  alt: string;
}>;

const vanillaOreoWhisker: MenuItemImage = {
  src: "/images/menu/items/vanilla-oreo-whisker.jpg",
  alt: "Vanilla Oreo Whisker iced drink with cookie crumbs in a clear cup",
};

/**
 * Local static photos for Menu cards. Supabase remains the source of truth
 * for item names and prices — this map never invents a remote image column.
 *
 * Policy: only real Brew ni Cat product photos where the item itself fills
 * the frame (no menu-board graphics, no people, no stock photos). Every
 * card photo belongs to exactly one item so no two Menu cards share an
 * image. Items without a matching photo stay imageless until one is
 * captured.
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
  {
    names: ["oreo", "the tuxedo cat", "tuxedo cat"],
    image: vanillaOreoWhisker,
  },
] as const satisfies ReadonlyArray<{
  names: ReadonlyArray<string>;
  image: MenuItemImage;
}>;

/**
 * Photos of one flavor of an item, shown in the Menu 3D viewer while that
 * flavor is picked. Same photo policy as the cards; a flavor photo may also
 * be its item's card photo when both show the same drink.
 */
const menuFlavorImages = [
  {
    names: ["matcha", "the lucky green neko", "lucky green neko"],
    flavor: "dirty neko",
    image: {
      src: "/images/menu/items/dirty-neko-matcha.jpg",
      alt: "Dirty Neko iced matcha with milk and an espresso layer on top",
    },
  },
  {
    names: ["matcha", "the lucky green neko", "lucky green neko"],
    flavor: "vanilla matcha meow",
    image: {
      src: "/images/menu/items/vanilla-matcha-meow.jpg",
      alt: "Vanilla Matcha Meow iced matcha topped with vanilla cream",
    },
  },
  {
    names: ["matcha", "the lucky green neko", "lucky green neko"],
    flavor: "caramel matcha tail",
    image: {
      src: "/images/menu/items/caramel-matcha-tail.jpg",
      alt: "Caramel Matcha Tail iced matcha with caramel drizzle down the cup",
    },
  },
  {
    names: ["oreo", "the tuxedo cat", "tuxedo cat"],
    flavor: "vanilla oreo whisker",
    image: vanillaOreoWhisker,
  },
] as const satisfies ReadonlyArray<{
  names: ReadonlyArray<string>;
  flavor: string;
  image: MenuItemImage;
}>;

const menuItemImagesByName: ReadonlyMap<string, MenuItemImage> = new Map(
  menuItemImages.flatMap(({ names, image }) =>
    names.map((name) => [name, image] as const),
  ),
);

const menuFlavorImagesByKey: ReadonlyMap<string, MenuItemImage> = new Map(
  menuFlavorImages.flatMap(({ names, flavor, image }) =>
    names.map((name) => [`${name}|${flavor}`, image] as const),
  ),
);

/** All distinct photo paths used on Menu cards (exported for tests). */
export const menuItemImageSources: ReadonlyArray<string> = menuItemImages.map(
  ({ image }) => image.src,
);

/** All distinct flavor photo paths (exported for tests). */
export const menuFlavorImageSources: ReadonlyArray<string> = [
  ...new Set(menuFlavorImages.map(({ image }) => image.src)),
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** "Fries (Cat Claws)" → ["fries", "cat claws"]. */
function nameCandidates(itemName: string): string[] {
  const base = normalize(itemName.replace(/\([^)]*\)/g, " "));
  const nicknames = [...itemName.matchAll(/\(([^)]*)\)/g)].map((match) =>
    normalize(match[1] ?? ""),
  );
  return [base, ...nicknames].filter(Boolean);
}

export function getMenuItemImage(itemName: string): MenuItemImage | null {
  for (const candidate of nameCandidates(itemName)) {
    const image = menuItemImagesByName.get(candidate);
    if (image) {
      return image;
    }
  }

  return null;
}

/** The photo of one flavor of an item, when that flavor was photographed. */
export function getMenuFlavorImage(
  itemName: string,
  flavor: string | null | undefined,
): MenuItemImage | null {
  const key = flavor ? normalize(flavor) : "";
  if (!key) {
    return null;
  }
  for (const candidate of nameCandidates(itemName)) {
    const image = menuFlavorImagesByKey.get(`${candidate}|${key}`);
    if (image) {
      return image;
    }
  }

  return null;
}

/** Photos that have a transparent cut-out of the product next to them. */
const CUTOUT_NAMES: ReadonlySet<string> = new Set([
  "buldak-carbo",
  "buldak-cheese",
  "caramel-matcha-tail",
  "cat-feine-iced-latte",
  "dirty-neko-matcha",
  "fries-cat-claws",
  "takoyaki-pawsome-balls",
  "vanilla-matcha-meow",
  "vanilla-oreo-whisker",
]);

/** The cut-out files, as paths (exported for tests). */
export const menuCutoutSources: ReadonlyArray<string> = [...CUTOUT_NAMES].map(
  (name) => `/images/menu/items/cutouts/${name}.webp`,
);

/**
 * The transparent cut-out of an item's photo, for the floating 3D picture in
 * the order dialog. A flavor with its own photo uses that photo's cut-out.
 * Items without a cut-out return null and get a built model instead.
 */
export function getMenuCutout(
  itemName: string,
  flavor?: string | null,
): MenuItemImage | null {
  const photo =
    getMenuFlavorImage(itemName, flavor) ?? getMenuItemImage(itemName);
  const name = photo?.src
    .split("/")
    .pop()
    ?.replace(/\.jpg$/, "");
  if (!photo || !name || !CUTOUT_NAMES.has(name)) {
    return null;
  }

  return {
    src: `/images/menu/items/cutouts/${name}.webp`,
    alt: photo.alt,
  };
}
