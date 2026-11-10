/**
 * The shop's cats (FR-099), drawn from the shop's "With Main Characters" poster.
 * Colors only; the drawing is in `components/cats/cat-figure.tsx`.
 */
export type ShopCat = Readonly<{
  name: string;
  fur: string;
  /** Face, ears, paws and tail for a colorpoint cat; the fur color otherwise. */
  points: string;
  earTips: string;
  eyes: string;
  longFur: boolean;
  collar?: string;
}>;

export const SHOP_CATS: readonly ShopCat[] = [
  {
    name: "Kasper",
    fur: "#f7f4ee",
    points: "#f7f4ee",
    earTips: "#f3c9c4",
    eyes: "#b5c93b",
    longFur: true,
  },
  {
    name: "Latte",
    fur: "#efe0c6",
    points: "#7a5236",
    earTips: "#7a5236",
    eyes: "#5ea3d8",
    longFur: false,
  },
  {
    name: "Luna",
    fur: "#fbfaf7",
    points: "#fbfaf7",
    earTips: "#3b3530",
    eyes: "#8fb35a",
    longFur: false,
  },
  {
    name: "Kulas",
    fur: "#8d8f93",
    points: "#8d8f93",
    earTips: "#6f7175",
    eyes: "#d99a2b",
    longFur: true,
    collar: "#ffffff",
  },
];

/** A walk takes this long to cross the strip. */
export const CAT_WALK_MS = 14_000;
/** Wait between walks, so the cats only show now and then. */
export const CAT_WAIT_MIN_MS = 6_000;
export const CAT_WAIT_MAX_MS = 18_000;

/** Wait before the next walk, from a random number in [0, 1). */
export function nextCatWait(random: number): number {
  const r = Math.min(Math.max(random, 0), 0.999_999);
  return Math.round(CAT_WAIT_MIN_MS + r * (CAT_WAIT_MAX_MS - CAT_WAIT_MIN_MS));
}

/** The next cat to walk, never the same one twice in a row. */
export function nextCatIndex(random: number, last: number | null): number {
  const count = SHOP_CATS.length;
  const r = Math.min(Math.max(random, 0), 0.999_999);
  if (last === null) return Math.floor(r * count);
  return (last + 1 + Math.floor(r * (count - 1))) % count;
}
