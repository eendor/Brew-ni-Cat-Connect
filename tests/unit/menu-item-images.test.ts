import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getMenuFlavorImage,
  getMenuItemImage,
  menuFlavorImageSources,
  menuItemImageSources,
} from "@/config/menu-item-images";

describe("getMenuItemImage", () => {
  it("TC-P3-048 — maps each approved item to its own product photo", () => {
    expect(getMenuItemImage("Takoyaki")?.src).toBe(
      "/images/menu/items/takoyaki-pawsome-balls.jpg",
    );
    expect(getMenuItemImage("Takoyaki (Pawsome Balls)")?.src).toBe(
      "/images/menu/items/takoyaki-pawsome-balls.jpg",
    );
    expect(getMenuItemImage("Buldak Carbo")?.src).toBe(
      "/images/menu/items/buldak-carbo.jpg",
    );
    expect(getMenuItemImage("Buldak Cheese")?.src).toBe(
      "/images/menu/items/buldak-cheese.jpg",
    );
    expect(getMenuItemImage("Fries (Cat Claws)")?.src).toBe(
      "/images/menu/items/fries-cat-claws.jpg",
    );
    expect(getMenuItemImage("Cat-Feine (Classic Coffee)")?.src).toBe(
      "/images/menu/items/cat-feine-iced-latte.jpg",
    );
    expect(getMenuItemImage("Matcha (The Lucky Green Neko)")?.src).toBe(
      "/images/menu/items/lucky-green-neko-matcha.jpg",
    );
    expect(getMenuItemImage("Oreo (The Tuxedo Cat)")?.src).toBe(
      "/images/menu/items/vanilla-oreo-whisker.jpg",
    );
  });

  it("TC-P3-049 — never reuses one photo for two items", () => {
    expect(new Set(menuItemImageSources).size).toBe(
      menuItemImageSources.length,
    );
    expect(getMenuItemImage("Buldak Carbo")?.src).not.toBe(
      getMenuItemImage("Buldak Cheese")?.src,
    );
  });

  it("TC-P3-050 — keeps Sedaap and unphotographed items imageless", () => {
    for (const name of [
      "Sedaap Original",
      "Sedaap Spicy Chicken",
      "Nachos",
      "Soda",
      "Cat Association",
      "Couple of Cats",
      "Single-Paw-rtner Combos",
      "Take-out Box",
      "Cat Treats",
      "Matcha Latte Float",
      "Seasonal Drink",
      "",
    ]) {
      expect(getMenuItemImage(name)).toBeNull();
    }
  });
});

describe("getMenuFlavorImage", () => {
  it("TC-P4-038 — maps each photographed flavor to its own photo", () => {
    const matcha = "Matcha (The Lucky Green Neko)";
    expect(getMenuFlavorImage(matcha, "Dirty Neko")?.src).toBe(
      "/images/menu/items/dirty-neko-matcha.jpg",
    );
    expect(getMenuFlavorImage(matcha, "Vanilla Matcha Meow")?.src).toBe(
      "/images/menu/items/vanilla-matcha-meow.jpg",
    );
    expect(getMenuFlavorImage("Matcha", "  caramel  matcha tail ")?.src).toBe(
      "/images/menu/items/caramel-matcha-tail.jpg",
    );
    expect(
      getMenuFlavorImage("Oreo (The Tuxedo Cat)", "Vanilla Oreo Whisker")?.src,
    ).toBe("/images/menu/items/vanilla-oreo-whisker.jpg");
    expect(new Set(menuFlavorImageSources).size).toBe(4);
    for (const src of [...menuItemImageSources, ...menuFlavorImageSources]) {
      expect(existsSync(path.join(process.cwd(), "public", src))).toBe(true);
    }
  });

  it("TC-P4-039 — leaves other flavors and items without a flavor photo", () => {
    expect(
      getMenuFlavorImage(
        "Matcha (The Lucky Green Neko)",
        "Salted Caramel Meow-cha",
      ),
    ).toBeNull();
    expect(
      getMenuFlavorImage("Oreo (The Tuxedo Cat)", "Oreo Iced Paw-tte"),
    ).toBeNull();
    expect(
      getMenuFlavorImage("Cat-Feine (Classic Coffee)", "Dirty Neko"),
    ).toBeNull();
    expect(getMenuFlavorImage("Matcha", null)).toBeNull();
    expect(getMenuFlavorImage("Matcha", "")).toBeNull();
    expect(getMenuFlavorImage("", "Dirty Neko")).toBeNull();
  });
});
