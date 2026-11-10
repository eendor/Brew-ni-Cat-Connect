/**
 * The footer cats (FR-099): six pixel cats from the CC0 "Pet Cats Pack"
 * (`public/cats`, license in `public/cats/LICENSE.txt`). Each sheet is one
 * row of 50 x 50 frames; the cat stands on row 32 of its frame.
 */
export type CatAction =
  | "walk"
  | "run"
  | "idle"
  | "sitting"
  | "laying"
  | "sleeping"
  | "licking"
  | "stretching"
  | "meow"
  | "itch";

export type CatSheet = Readonly<{ frames: number; ms: number; once?: boolean }>;

export const CAT_SHEETS: Readonly<Record<CatAction, CatSheet>> = {
  walk: { frames: 8, ms: 800 },
  run: { frames: 8, ms: 480 },
  idle: { frames: 10, ms: 1500 },
  sitting: { frames: 1, ms: 1000 },
  laying: { frames: 8, ms: 1100, once: true },
  sleeping: { frames: 2, ms: 2600 },
  licking: { frames: 5, ms: 900 },
  stretching: { frames: 13, ms: 1700, once: true },
  meow: { frames: 4, ms: 700 },
  itch: { frames: 2, ms: 300 },
};

export type PixelCat = Readonly<{ id: string; canItch: boolean }>;

/** Cat 3 has no scratching sheet. */
export const PIXEL_CATS: readonly PixelCat[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `cat-${n}`,
  canItch: n !== 3,
}));

/** Walking and running speed, in cat sizes (one 50-pixel frame) per second. */
export const CAT_SPEED = { walk: 0.3, run: 1 } as const;

export function catSheetUrl(id: string, action: CatAction): string {
  return `/cats/${id}/${action}.png`;
}

const clamp01 = (r: number) => Math.min(Math.max(r, 0), 0.999_999);

/** One cat for about every 200 pixels of width: 3 on a phone, 6 on a desktop. */
export function catCount(width: number): number {
  return Math.min(PIXEL_CATS.length, Math.max(3, Math.round(width / 200)));
}

export type CatRest = Readonly<{ action: CatAction; ms: number }>;

const RESTS: readonly (readonly [CatAction, number, number])[] = [
  ["idle", 3_000, 6_000],
  ["sitting", 4_000, 9_000],
  ["licking", 2_700, 4_500],
  ["meow", 1_400, 1_400],
  ["stretching", 1_700, 1_700],
  ["laying", 1_100, 1_100],
  ["itch", 1_200, 2_000],
];

/** What a cat does after a walk, and for how long, from two random numbers. */
export function nextRest(
  pick: number,
  length: number,
  canItch: boolean,
): CatRest {
  const options = canItch ? RESTS : RESTS.filter(([a]) => a !== "itch");
  const [action, min, max] =
    options[Math.floor(clamp01(pick) * options.length)]!;
  return { action, ms: Math.round(min + clamp01(length) * (max - min)) };
}

/** A cat that lay down goes to sleep; any other rest ends in a walk. */
export function afterRest(action: CatAction, length: number): CatRest | null {
  if (action !== "laying") return null;
  return {
    action: "sleeping",
    ms: Math.round(8_000 + clamp01(length) * 8_000),
  };
}

/**
 * Where the next walk ends: somewhere in the strip at least two cat sizes
 * away, so every walk is worth watching. `size` is the cat's frame in pixels.
 */
export function nextTarget(
  random: number,
  x: number,
  width: number,
  size: number,
): number {
  const min = -0.2 * size;
  const max = Math.max(min, width - 0.8 * size);
  let target = min + clamp01(random) * (max - min);
  if (Math.abs(target - x) < 2 * size) {
    target = x + (target >= x ? 2 : -2) * size;
    if (target > max || target < min) target = x - (target - x);
  }
  return Math.min(max, Math.max(min, target));
}
