import type { CSSProperties } from "react";

import {
  GAME_ICON_SHEET,
  GAME_ICON_SIZE,
  GAME_ICONS,
  type GameIconName,
} from "@/lib/games/sprites";

type SheetSpriteProps = Readonly<{
  sheet: string;
  width: number;
  height: number;
  frames?: number;
  frame?: number;
  scale?: number;
  className?: string;
  /** Names the frame for tests and styles (`data-icon`). */
  icon?: string;
}>;

/**
 * One frame of an Aseprite sheet (frames side by side), drawn crisp at
 * `scale` (ADR-032).
 */
export function SheetSprite({
  sheet,
  width,
  height,
  frames = 1,
  frame = 0,
  scale = 2,
  className,
  icon,
}: SheetSpriteProps) {
  const w = width * scale;
  const h = height * scale;
  return (
    <span
      aria-hidden="true"
      data-icon={icon}
      className={`pixel-sprite inline-block shrink-0 ${className ?? ""}`}
      style={{
        width: w,
        height: h,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${w * frames}px ${h}px`,
        backgroundPosition: `${-frame * w}px 0`,
        imageRendering: "pixelated",
      }}
    />
  );
}

/** One of the games' 16 x 16 pixel-art icons. */
export function GameIcon({
  name,
  scale = 2,
  className,
}: Readonly<{ name: GameIconName; scale?: number; className?: string }>) {
  return (
    <SheetSprite
      sheet={GAME_ICON_SHEET}
      width={GAME_ICON_SIZE}
      height={GAME_ICON_SIZE}
      frames={GAME_ICONS.length}
      frame={GAME_ICONS.indexOf(name)}
      scale={scale}
      icon={name}
      className={`align-middle ${className ?? ""}`}
    />
  );
}

/**
 * Styles that draw a whole pixel-art image as a 9-slice: the `slice` px
 * corners stay crisp at `scale` and the middle stretches to the box.
 */
export function nineSlice(
  image: string,
  slice: number,
  scale: number,
): CSSProperties {
  return {
    borderStyle: "solid",
    borderWidth: 0,
    borderImage: `url(${image}) ${slice} fill / ${slice * scale}px stretch`,
    imageRendering: "pixelated",
  };
}
