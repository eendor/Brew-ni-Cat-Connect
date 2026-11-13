/**
 * The parade's pixel-art sprites (FR-099, ADR-032 update 2026-11-13). The
 * cats are drawn in Aseprite by `scripts/aseprite/cat-sprites.lua` from the
 * coats in `cats.ts`; the editable sources are in `art/cats/` and the sheets
 * the site loads in `public/cats/sprites/`. These helpers say which frame of
 * which sheet to draw, and how big.
 */

/** One walking-cat frame, in sprite pixels; the cat faces right. */
export const CAT_FRAME = { width: 48, height: 40 } as const;
/** One sleigh frame, in sprite pixels; the sleigh faces right. */
export const SLEIGH_FRAME = { width: 72, height: 44 } as const;
/** Frames in one step cycle, and in the sleigh's ride. */
export const WALK_FRAMES = 6;
export const SLEIGH_FRAMES = 4;
/** How long each frame shows, as set in the Aseprite sources. */
export const WALK_FRAME_MS = 110;
export const SLEIGH_FRAME_MS = 180;
/** The sprite rows just under a cat's paws and the sleigh's runners. */
export const CAT_GROUND_ROW = 38;
export const SLEIGH_GROUND_ROW = 43;

/** The tags of a cat's sheet, one row each, top to bottom. */
export const CAT_TAGS = [
  "walk",
  "look",
  "meow",
  "walk-festive",
  "look-festive",
  "meow-festive",
] as const;

export type CatMode = "walk" | "look" | "meow";

export function catSheet(id: string): string {
  return `/cats/sprites/${id}.png`;
}
export const SLEIGH_SHEET = "/cats/sprites/sleigh.png";

/** The row to draw: looking out once the glance is past halfway. */
export function catRow(look: number, meowing: boolean, festive: boolean) {
  const mode: CatMode = meowing ? "meow" : look > 0.4 ? "look" : "walk";
  return CAT_TAGS.indexOf(festive ? `${mode}-festive` : mode);
}

/**
 * The frame of the step cycle at `seconds`: standing still is frame 0, and
 * each cat is a little out of step with the one in front.
 */
export function walkFrame(seconds: number, stride: number, index: number) {
  if (stride < 0.5) return 0;
  const step = Math.floor((seconds * 1000) / WALK_FRAME_MS) + index * 2;
  return ((step % WALK_FRAMES) + WALK_FRAMES) % WALK_FRAMES;
}

export function sleighFrame(seconds: number, moving: boolean) {
  if (!moving) return 0;
  return Math.floor((seconds * 1000) / SLEIGH_FRAME_MS) % SLEIGH_FRAMES;
}

/** Room between the cats, and before the sleigh, in cat frames. */
export function paradeGaps(festive: boolean) {
  const gap = festive ? 0.3 : 0.45;
  return { gap, beforeSleigh: gap * 3 };
}

/** The parade's length in sprite pixels, nose to sleigh. */
export function spriteSpan(cats: number, festive: boolean) {
  const { gap, beforeSleigh } = paradeGaps(festive);
  const w = CAT_FRAME.width;
  return (
    cats * w +
    (cats - 1) * gap * w +
    (festive ? beforeSleigh * w + SLEIGH_FRAME.width : 0)
  );
}

/**
 * Device pixels per sprite pixel: a whole number, so every sprite pixel is a
 * crisp square. The cats stand most of the strip's height, and the whole
 * parade fits on the screen.
 */
export function pixelScale(
  widthCss: number,
  heightCss: number,
  dpr: number,
  cats: number,
  festive: boolean,
) {
  // 42 rows: a cat's ears to the ground, and the sleigh's runners to
  // Luna's ears, standing one sprite pixel above the strip's bottom
  const tall = Math.floor((heightCss * dpr) / 42);
  const wide = Math.floor((widthCss * dpr * 0.94) / spriteSpan(cats, festive));
  return Math.max(1, Math.min(tall, wide));
}
