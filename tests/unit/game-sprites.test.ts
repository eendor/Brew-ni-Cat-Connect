import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ARCADE_GAMES, MEMORY_FACES, TREATS } from "@/lib/games/arcade";
import {
  androidDrawable,
  GAME_ICON_SHEET,
  GAME_ICON_SIZE,
  GAME_ICONS,
  HIDING_CUP,
  STACK_BLOCK,
  TREAT_JAR,
} from "@/lib/games/sprites";

/** A PNG's width and height, from its IHDR chunk. */
function size(file: string) {
  const png = readFileSync(file);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function tags(name: string) {
  const data = JSON.parse(readFileSync(`art/games/${name}.json`, "utf8")) as {
    meta: { frameTags: { name: string; from: number; to: number }[] };
  };
  return data.meta.frameTags.map(({ name, from, to }) => ({ name, from, to }));
}

describe("the games' pixel art", () => {
  it("TC-P9-115 every game sprite is drawn in Aseprite, with editable sources, a tag a frame and an Android copy", () => {
    for (const name of ["icons", "hiding-cup", "treat-jar", "stack-block"]) {
      expect(existsSync(`art/games/${name}.aseprite`)).toBe(true);
    }
    expect(size(`public${GAME_ICON_SHEET}`)).toEqual([
      GAME_ICON_SIZE * GAME_ICONS.length,
      GAME_ICON_SIZE,
    ]);
    expect(tags("icons")).toEqual(
      GAME_ICONS.map((name, i) => ({ name, from: i, to: i })),
    );
    expect(size(`public${HIDING_CUP.sheet}`)).toEqual([
      HIDING_CUP.width * HIDING_CUP.tags.length,
      HIDING_CUP.height,
    ]);
    expect(tags("hiding-cup").map((t) => t.name)).toEqual([...HIDING_CUP.tags]);
    expect(size(`public${TREAT_JAR.sheet}`)).toEqual([
      TREAT_JAR.width,
      TREAT_JAR.height,
    ]);
    for (const file of [STACK_BLOCK.sheet, STACK_BLOCK.lit]) {
      expect(size(`public${file}`)).toEqual([
        STACK_BLOCK.width,
        STACK_BLOCK.height,
      ]);
    }

    // no emoji are left in the games' data
    expect(JSON.stringify([ARCADE_GAMES, MEMORY_FACES, TREATS])).not.toMatch(
      /\p{Extended_Pictographic}/u,
    );

    // the Android app has its own copy of every frame
    const res = "android/app/src/main/res/drawable-nodpi";
    for (const name of [
      ...GAME_ICONS,
      "hiding-cup",
      "hiding-cup-lit",
      "treat-jar",
      "stack-block",
      "stack-block-lit",
    ]) {
      expect(existsSync(`${res}/${androidDrawable(name)}.png`)).toBe(true);
    }
    expect(size(`${res}/game_fish.png`)).toEqual([16, 16]);
    expect(androidDrawable("mouse-gold")).toBe("game_mouse_gold");
  });
});
