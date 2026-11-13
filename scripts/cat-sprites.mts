// Draws the parade's pixel-art cats with Aseprite (FR-099, ADR-032).
//
//   npm run cats:sprites
//
// Writes the coats from src/lib/cats/cats.ts to a temporary file, has
// Aseprite draw the editable sources (art/cats/*.aseprite) with
// scripts/aseprite/cat-sprites.lua, then exports the sprite sheets the site
// loads (public/cats/sprites/*.png, one tag a row) and their frame data
// (art/cats/*.json). Needs the `aseprite` command (or ASEPRITE=<path>).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  KITTEN_COATS,
  PARADE_ORDER,
  SHOP_CATS,
  SLEIGH_RIDER,
} from "../src/lib/cats/cats.ts";
import { SLEIGH_FRAMES, WALK_FRAMES } from "../src/lib/cats/sprites.ts";

const aseprite = process.env.ASEPRITE ?? "aseprite";
const art = "art/cats";
const sheets = "public/cats/sprites";
mkdirSync(art, { recursive: true });
mkdirSync(sheets, { recursive: true });

const look = (id: string) => SHOP_CATS.find((cat) => cat.id === id)!.look;
const work = mkdtempSync(join(tmpdir(), "cat-sprites-"));
const looks = join(work, "looks.json");
writeFileSync(
  looks,
  JSON.stringify({
    walkers: PARADE_ORDER.map((id) => ({ id, look: look(id) })),
    luna: look(SLEIGH_RIDER),
    kittens: KITTEN_COATS.map(look),
  }),
);

const run = (args: string[]) =>
  execFileSync(aseprite, ["-b", ...args], { stdio: "inherit" });

try {
  run([
    "--script-param",
    `looks=${looks}`,
    "--script-param",
    `out=${art}`,
    "--script",
    "scripts/aseprite/cat-sprites.lua",
  ]);
  for (const [id, columns] of [
    ...PARADE_ORDER.map((id) => [id, WALK_FRAMES] as const),
    ["sleigh", SLEIGH_FRAMES] as const,
  ]) {
    run([
      `${art}/${id}.aseprite`,
      "--sheet",
      `${sheets}/${id}.png`,
      "--sheet-type",
      "rows",
      "--sheet-columns",
      String(columns),
      "--data",
      `${art}/${id}.json`,
      "--format",
      "json-array",
      "--list-tags",
    ]);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
