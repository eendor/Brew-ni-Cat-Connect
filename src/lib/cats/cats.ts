/**
 * The shop's cats (FR-099, update 2026-11-13, ADR-032). Each cat is modelled
 * in three.js from simple geometry (no pictures), with its coat, markings and
 * eyes taken from the shop's own photos (`public/images/shop`): the four cats
 * on the opening poster, Oreo, a grey cat and Kasper napping. They stroll
 * across the top of the footer. In November and December they walk in single
 * file with bells and reins, pulling a cosy coffee-cup sleigh with Luna, a
 * mama cat soon, resting inside with her kittens.
 */

export type CatPose = "sit" | "lie" | "walk";

/** Colours of one cat, as CSS hex. */
export type CatCoat = Readonly<{
  coat: string;
  /** Chest and belly (a bib on Oreo). */
  chest: string;
  muzzle: string;
  paws: string;
  ears: string;
  innerEar: string;
  tail: string;
  tailTip: string;
  /** A patch on top of the head (Luna's grey cap). */
  cap?: string;
  eyeLeft: string;
  eyeRight: string;
  nose: string;
  /** How shaggy the fur is, 0 (smooth) to 1. */
  fluff: number;
  /** A name tag on the collar. */
  tag?: string;
}>;

export type ShopCat = Readonly<{
  id: string;
  /** Size of the model's box (any unit); the page scales it. */
  width: number;
  height: number;
  pose: CatPose;
  look: CatCoat;
}>;

export const SHOP_CATS: readonly ShopCat[] = [
  {
    id: "kasper",
    width: 72,
    height: 100,
    pose: "sit",
    look: {
      coat: "#f3efe7",
      chest: "#fbf9f4",
      muzzle: "#fbf9f4",
      paws: "#f6f2ea",
      ears: "#efe9df",
      innerEar: "#f0b9b4",
      tail: "#efe9df",
      tailTip: "#f3efe7",
      eyeLeft: "#c9c14a",
      eyeRight: "#93bb63",
      nose: "#e9a3a0",
      fluff: 0.9,
      tag: "#cfd3d8",
    },
  },
  {
    id: "latte",
    width: 66,
    height: 100,
    pose: "sit",
    look: {
      coat: "#ede0cb",
      chest: "#f5ecdd",
      muzzle: "#7b5a47",
      paws: "#6f4f3d",
      ears: "#5a3d2f",
      innerEar: "#9b7461",
      tail: "#7a5845",
      tailTip: "#4f3529",
      eyeLeft: "#6ea6dc",
      eyeRight: "#6ea6dc",
      nose: "#5a3d33",
      fluff: 0.25,
    },
  },
  {
    id: "luna",
    width: 68,
    height: 100,
    pose: "sit",
    look: {
      coat: "#f2f0ed",
      chest: "#faf9f7",
      muzzle: "#faf9f7",
      paws: "#f7f6f3",
      ears: "#8e8c90",
      innerEar: "#d9a7a8",
      tail: "#9a989c",
      tailTip: "#77757a",
      cap: "#a4a2a6",
      eyeLeft: "#3b3633",
      eyeRight: "#3b3633",
      nose: "#e3a0a3",
      fluff: 0.2,
    },
  },
  {
    id: "kulas",
    width: 72,
    height: 100,
    pose: "sit",
    look: {
      coat: "#7b8789",
      chest: "#8b9698",
      muzzle: "#8f9a9c",
      paws: "#7f8a8c",
      ears: "#6e7a7c",
      innerEar: "#b08f8c",
      tail: "#737f81",
      tailTip: "#687476",
      eyeLeft: "#c98a3a",
      eyeRight: "#c98a3a",
      nose: "#5d6466",
      fluff: 0.8,
    },
  },
  {
    id: "oreo",
    width: 72,
    height: 100,
    pose: "sit",
    look: {
      coat: "#1f1d20",
      chest: "#f6f4f0",
      muzzle: "#f6f4f0",
      paws: "#f6f4f0",
      ears: "#1b191c",
      innerEar: "#8f6b70",
      tail: "#1f1d20",
      tailTip: "#1f1d20",
      eyeLeft: "#d9a238",
      eyeRight: "#d9a238",
      nose: "#e7a4ae",
      fluff: 0.7,
      tag: "#eeb3c0",
    },
  },
  {
    id: "grey",
    width: 74,
    height: 100,
    pose: "sit",
    look: {
      coat: "#7a6e68",
      chest: "#867a73",
      muzzle: "#8b7f78",
      paws: "#7e726b",
      ears: "#6f635d",
      innerEar: "#a98a84",
      tail: "#73675f",
      tailTip: "#655a54",
      eyeLeft: "#dc9c38",
      eyeRight: "#dc9c38",
      nose: "#6a5853",
      fluff: 1,
    },
  },
  {
    id: "kasper-nap",
    width: 140,
    height: 80,
    pose: "lie",
    look: {
      coat: "#f2e4c9",
      chest: "#f8f0e0",
      muzzle: "#faf4e8",
      paws: "#f6ecd8",
      ears: "#efdcbc",
      innerEar: "#efb8ac",
      tail: "#ecd9b6",
      tailTip: "#e7cfa6",
      eyeLeft: "#b9b04a",
      eyeRight: "#8db45e",
      nose: "#e6a29a",
      fluff: 0.9,
      tag: "#cfd3d8",
    },
  },
];

/**
 * The walkers, lead first. Luna is about to be a mama cat, so she doesn't
 * walk: in the holiday season she rides in the sleigh with her kittens.
 */
export const PARADE_ORDER: readonly string[] = [
  "oreo",
  "latte",
  "kulas",
  "grey",
];
export const SLEIGH_RIDER = "luna";
/** The kittens riding with Luna, coloured after Luna and the shop's toms. */
export const KITTEN_COATS: readonly string[] = ["luna", "kulas", "latte"];

/**
 * The sleigh, reins and bells are a holiday look: November and December
 * only. From January the cats just stroll across, free, and Luna rests.
 */
export function festiveSeason(date: Date): boolean {
  return date.getMonth() >= 10;
}

/** How many cats walk, by screen width. */
export function paradeSize(width: number): number {
  return width < 640 ? 3 : 4;
}

/** The cats walking at this width, lead first. */
export function paradeWalkers(width: number): readonly ShopCat[] {
  return PARADE_ORDER.slice(0, paradeSize(width)).map((id) =>
    SHOP_CATS.find((cat) => cat.id === id)!,
  );
}

/** Height of the footer's parade strip in CSS pixels: it scales with the screen. */
export function stripHeight(width: number): number {
  return Math.round(Math.min(150, Math.max(84, width * 0.075)));
}

/** Walking speed in px a second: about a body length a second. */
export function paradeSpeed(height: number): number {
  return Math.round(height * 0.95);
}

/** Milliseconds to walk `distance` px at the strip's speed. */
export function walkMs(distance: number, height: number): number {
  return Math.round((Math.abs(distance) / paradeSpeed(height)) * 1000);
}

/**
 * One lap across the strip. `x` is where the lead cat's nose is: the lap
 * starts with the whole parade out of sight, passes the middle (where the
 * cats glance out and one meows, without stopping), and ends out of sight.
 */
export function paradeLap(
  width: number,
  span: number,
  dir: 1 | -1,
): { start: number; stop: number; end: number } {
  return dir > 0
    ? { start: 0, stop: (width + span) / 2, end: width + span }
    : { start: width, stop: (width - span) / 2, end: -span };
}

/** The rest between laps: 5 to 12 seconds. */
export function restMs(random: number): number {
  return Math.round(5_000 + Math.min(Math.max(random, 0), 1) * 7_000);
}
