/**
 * The shop's cats around the page (FR-099, update 2026-11-13, ADR-032).
 * Each cat is modelled in three.js from simple geometry (no pictures), with
 * its coat, markings and eyes taken from the shop's own photos
 * (`public/images/shop`): the four cats on the opening poster, Oreo, a grey
 * cat and Kasper napping. The cats perch on the edges of the screen, never
 * on top of the page's text, controls or pictures.
 */

export type CatPose = "sit" | "lie";

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

/** Where a cat perches: on a side of the screen or rising from its bottom. */
export type Perch = Readonly<{
  side: "left" | "right" | "bottom";
  /** Along that edge, from 0 (top or left) to 1 (bottom or right). */
  at: number;
}>;

/** Every spot a cat may take; each is only used while it is clear. */
export const PERCHES: readonly Perch[] = [
  { side: "left", at: 0.3 },
  { side: "right", at: 0.45 },
  { side: "left", at: 0.72 },
  { side: "right", at: 0.8 },
  { side: "bottom", at: 0.12 },
  { side: "bottom", at: 0.88 },
  { side: "right", at: 0.18 },
  { side: "bottom", at: 0.5 },
];

/**
 * How much of a side cat hides past the edge (none: side cats sit whole on
 * the edge), and of a bottom cat below it (it peeks over the bottom edge).
 */
export const SIDE_TUCK = 0;
export const BOTTOM_TUCK = 0.3;

/** A cat's height in CSS pixels: it scales with the screen. */
export function catHeight(width: number, height: number): number {
  const base = Math.min(width * 0.11, height * 0.2);
  return Math.round(Math.min(220, Math.max(84, base)));
}

/** The most cats on the page at once, by screen width. */
export function catCount(width: number): number {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  if (width < 1440) return 4;
  return 5;
}

export type Box = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export function boxesOverlap(a: Box, b: Box, gap = 0): boolean {
  return (
    a.left < b.right + gap &&
    a.right + gap > b.left &&
    a.top < b.bottom + gap &&
    a.bottom + gap > b.top
  );
}

/**
 * The part of the screen a cat at `perch` covers: its picture box, less the
 * part tucked past the edge. `w` and `h` are the cat's size on screen;
 * `tuck` is how much of a bottom cat hides below the edge.
 */
export function perchBox(
  perch: Perch,
  w: number,
  h: number,
  screenWidth: number,
  screenHeight: number,
  tuck = BOTTOM_TUCK,
): Box {
  if (perch.side === "bottom") {
    const left = Math.min(
      Math.max(0, perch.at * screenWidth - w / 2),
      Math.max(0, screenWidth - w),
    );
    return {
      left,
      right: left + w,
      top: screenHeight - h * (1 - tuck),
      bottom: screenHeight,
    };
  }
  const top = Math.min(
    Math.max(0, perch.at * screenHeight - h / 2),
    Math.max(0, screenHeight - h),
  );
  const shown = w * (1 - SIDE_TUCK);
  return perch.side === "left"
    ? { left: 0, right: shown, top, bottom: top + h }
    : { left: screenWidth - shown, right: screenWidth, top, bottom: top + h };
}

/** A sitting cat peeks over the bottom edge; a lying cat shows whole. */
export function tuckFor(cat: ShopCat): number {
  return cat.pose === "lie" ? 0 : BOTTOM_TUCK;
}

/** Which cat goes on a perch: lying cats only rise from the bottom. */
export function catsFor(perch: Perch): readonly ShopCat[] {
  return perch.side === "bottom"
    ? SHOP_CATS
    : SHOP_CATS.filter((cat) => cat.pose === "sit");
}

/** Seconds a cat stays before another takes its place. */
export function stayMs(random: number): number {
  return Math.round(14_000 + Math.min(Math.max(random, 0), 1) * 16_000);
}
