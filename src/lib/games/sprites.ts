// The games' pixel art, drawn in Aseprite by scripts/aseprite/game-sprites.lua
// (ADR-032). `npm run games:sprites` redraws it.

/** The 16 x 16 icons, in the order of the sheet's frames (and its tags). */
export const GAME_ICONS = [
  "fish",
  "tea",
  "chili",
  "mouse",
  "mouse-gold",
  "cup",
  "paw",
  "card",
  "cat",
  "fries",
  "milk",
  "ramen",
  "coffee",
  "heart",
  "heart-empty",
  "trophy",
  "flame",
  "sparkle",
  "clock",
  "paw-white",
] as const;

export type GameIconName = (typeof GAME_ICONS)[number];

export const GAME_ICON_SIZE = 16;
export const GAME_ICON_SHEET = "/games/sprites/icons.png";

/** Cat Cups' cup, upside down on the table; `cup-lit` is the picked one. */
export const HIDING_CUP = {
  sheet: "/games/sprites/hiding-cup.png",
  width: 40,
  height: 36,
  tags: ["cup", "cup-lit"],
} as const;

/** Lucky Paw's treat jar. */
export const TREAT_JAR = {
  sheet: "/games/sprites/treat-jar.png",
  width: 48,
  height: 56,
} as const;

/**
 * Cup Stack's block, drawn as a 9-slice (`slice` px corners) so a block can be
 * any width; `lit` is the one still sliding.
 */
export const STACK_BLOCK = {
  sheet: "/games/sprites/stack-block.png",
  lit: "/games/sprites/stack-block-lit.png",
  width: 16,
  height: 12,
  slice: 4,
} as const;

/** The Android app's copy of a frame: res/drawable-nodpi/<name>.png. */
export function androidDrawable(name: string): string {
  return `game_${name.replaceAll("-", "_")}`;
}
