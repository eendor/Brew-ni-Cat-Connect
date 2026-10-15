import { describe, expect, it } from "vitest";

import {
  getMenuItemImage,
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
      "Oreo (The Tuxedo Cat)",
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
