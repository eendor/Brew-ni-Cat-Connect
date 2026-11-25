// Draws the games' pixel art with Aseprite (ADR-032).
//
//   npm run games:sprites
//
// Has Aseprite draw the editable sources (art/games/*.aseprite) with
// scripts/aseprite/game-sprites.lua, then exports the sheets the site loads
// (public/games/sprites/*.png, frames side by side) and their frame data
// (art/games/*.json). Cup Stack's 9-slice blocks are single PNGs
// (public/games/sprites/stack-block*.png). The Android app gets each frame as
// its own PNG in android/app/src/main/res/drawable-nodpi/game_*.png. Needs
// the `aseprite` command (or ASEPRITE=<path>).
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

import { GAME_ICONS } from "../src/lib/games/sprites.ts";

const aseprite = process.env.ASEPRITE ?? "aseprite";
const art = "art/games";
const sheets = "public/games/sprites";
const android = "android/app/src/main/res/drawable-nodpi";
mkdirSync(art, { recursive: true });
mkdirSync(sheets, { recursive: true });

const run = (args: string[]) =>
  execFileSync(aseprite, ["-b", ...args], { stdio: "inherit" });

run([
  "--script-param",
  `icons=${GAME_ICONS.join(",")}`,
  "--script-param",
  `out=${art}`,
  "--script-param",
  `android=${android}`,
  "--script-param",
  `web=${sheets}`,
  "--script",
  "scripts/aseprite/game-sprites.lua",
]);
for (const name of ["icons", "hiding-cup", "treat-jar"]) {
  run([
    `${art}/${name}.aseprite`,
    "--sheet",
    `${sheets}/${name}.png`,
    "--sheet-type",
    "horizontal",
    "--data",
    `${art}/${name}.json`,
    "--format",
    "json-array",
    "--list-tags",
  ]);
}
