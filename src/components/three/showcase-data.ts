/**
 * Items featured in the home 3D showcase. Names, nicknames and "from"
 * prices are the ones recorded in the live catalog review
 * (docs/evidence/phase-2-implementation.md); the Menu page stays the live
 * source of truth. Photos are the shop's own menu photos.
 */
export type ShowcaseItem = Readonly<{
  id: "matcha" | "catfeine" | "takoyaki" | "fries" | "buldak";
  name: string;
  nickname: string;
  price: string;
  /** Rim-light color for the studio set while this item is on stage. */
  glow: string;
  photo: string;
  alt: string;
}>;

export const showcaseItems: readonly ShowcaseItem[] = [
  {
    id: "matcha",
    name: "Matcha",
    nickname: "The Lucky Green Neko",
    price: "From ₱49",
    glow: "#7CFF6B",
    photo: "/images/menu/items/lucky-green-neko-matcha.jpg",
    alt: "The Lucky Green Neko iced dirty matcha with an espresso layer",
  },
  {
    id: "catfeine",
    name: "Cat-Feine",
    nickname: "Classic Coffee",
    price: "From ₱49",
    glow: "#FFB547",
    photo: "/images/menu/items/cat-feine-iced-latte.jpg",
    alt: "Cat-Feine iced latte in a clear cup",
  },
  {
    id: "takoyaki",
    name: "Takoyaki",
    nickname: "Pawsome Balls",
    price: "From ₱40",
    glow: "#FF6A3D",
    photo: "/images/menu/items/takoyaki-pawsome-balls.jpg",
    alt: "Takoyaki balls topped with sauce, mayo and bonito flakes",
  },
  {
    id: "fries",
    name: "Fries",
    nickname: "Cat Claws",
    price: "From ₱30",
    glow: "#FFD93B",
    photo: "/images/menu/items/fries-cat-claws.jpg",
    alt: "Fries served in a wire cone in front of the Brew ni Cat logo wall",
  },
  {
    id: "buldak",
    name: "Buldak Carbo",
    nickname: "Buldak & Sedaap",
    price: "From ₱119",
    glow: "#FF3D7F",
    photo: "/images/menu/items/buldak-carbo.jpg",
    alt: "Buldak Carbo spicy noodles with a fried egg",
  },
];

/**
 * Glow color for a menu item name, used for the add-to-cart toss. Items
 * without a color of their own get Cat-Feine amber.
 */
export function glowForItem(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("matcha") || n.includes("neko")) return "#7CFF6B";
  if (n.includes("cat-feine") || n.includes("coffee")) return "#FFB547";
  if (n.includes("takoyaki")) return "#FF6A3D";
  if (n.includes("fries")) return "#FFD93B";
  if (n.includes("cheese")) return "#5EE1FF";
  if (n.includes("buldak") || n.includes("carbo")) return "#FF3D7F";
  return "#FFB547";
}
