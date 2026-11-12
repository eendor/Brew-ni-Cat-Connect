/**
 * The shop's cats around the page (FR-099, update 2026-11-13, ADR-032).
 * Each picture is a cut-out of one of the shop's own photos
 * (`public/images/shop`): the four cats on the opening poster, Oreo, a grey
 * cat and Kasper napping. The cats perch on the edges of the screen, never
 * on top of the page's text, controls or pictures.
 */

export type CatPose = "sit" | "lie";

export type ShopCat = Readonly<{
  id: string;
  /** Picture size in pixels; the page scales it. */
  width: number;
  height: number;
  pose: CatPose;
}>;

export const SHOP_CATS: readonly ShopCat[] = [
  { id: "kasper", width: 197, height: 314, pose: "sit" },
  { id: "latte", width: 149, height: 310, pose: "sit" },
  { id: "luna", width: 188, height: 320, pose: "sit" },
  { id: "kulas", width: 185, height: 320, pose: "sit" },
  { id: "oreo", width: 201, height: 320, pose: "sit" },
  { id: "grey", width: 204, height: 320, pose: "sit" },
  { id: "kasper-nap", width: 291, height: 320, pose: "lie" },
];

export function catSrc(id: string): string {
  return `/cats/${id}.webp`;
}

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

/** How much of a side cat hides past the edge, and of a bottom cat below it. */
export const SIDE_TUCK = 0.3;
export const BOTTOM_TUCK = 0.35;

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
 * part tucked past the edge. `w` and `h` are the picture's size on screen.
 */
export function perchBox(
  perch: Perch,
  w: number,
  h: number,
  screenWidth: number,
  screenHeight: number,
): Box {
  if (perch.side === "bottom") {
    const left = Math.min(
      Math.max(0, perch.at * screenWidth - w / 2),
      Math.max(0, screenWidth - w),
    );
    return {
      left,
      right: left + w,
      top: screenHeight - h * (1 - BOTTOM_TUCK),
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
