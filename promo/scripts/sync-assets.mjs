// Copies the shop photos, menu photos, logo and app screenshots the video uses
// from the main project, so the repo keeps one copy of each image.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const promo = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(promo, "..");
const pub = join(promo, "public");

const copies = {
  brand: [["public/images/branding/brew-ni-cat-logo.png", "logo.png"]],
  menu: [
    "buldak-carbo",
    "caramel-matcha-tail",
    "cat-feine-iced-latte",
    "dirty-neko-matcha",
    "fries-cat-claws",
    "lucky-green-neko-matcha",
    "takoyaki-pawsome-balls",
    "vanilla-matcha-meow",
    "vanilla-oreo-whisker",
  ].map((name) => [`public/images/menu/items/${name}.jpg`, `${name}.jpg`]),
  // Cat-only photos: no customers appear in the video.
  shop: ["006", "007", "008", "009", "016", "017"].map((n) => [
    `public/images/shop/photo_${n}.jpg`,
    `cat-${n}.jpg`,
  ]),
  app: [
    "redesign-home-light",
    "redesign-home-dark",
    "redesign-menu-light",
    "redesign-item-light",
    "redesign-order-light",
    "redesign-orders-light",
    "redesign-rewards-light",

    "arcade-sheet-light",
    "arcade-catch-light",
    "arcade-memory-light",
    "arcade-simon-dark",
  ].map((name) => [
    `docs/evidence/phase-8/android-app/${name}.png`,
    `${name}.png`,
  ]),
};

for (const [dir, files] of Object.entries(copies)) {
  mkdirSync(join(pub, dir), { recursive: true });
  for (const [from, to] of files) cpSync(join(root, from), join(pub, dir, to));
}
console.log("Promo assets copied.");
