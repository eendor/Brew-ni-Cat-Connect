import { describe, expect, it } from "vitest";

import { getMenuItemImage } from "@/config/menu-item-images";

describe("getMenuItemImage", () => {
  it("resolves live Supabase-style names with parenthetical nicknames", () => {
    expect(getMenuItemImage("Matcha (The Lucky Green Neko)")?.src).toBe(
      "/images/menu/items/matcha.jpg",
    );
    expect(getMenuItemImage("Fries (Cat Claws)")?.src).toBe(
      "/images/menu/items/fries.jpg",
    );
    expect(getMenuItemImage("Oreo (The Tuxedo Cat)")?.src).toBe(
      "/images/menu/items/oreo-drink.jpg",
    );
  });

  it("is case-insensitive and matches short catalog names", () => {
    expect(getMenuItemImage("matcha")?.alt).toMatch(/matcha/i);
    expect(getMenuItemImage("Buldak Carbo")?.src).toBe(
      "/images/shop/photo_011.jpg",
    );
    expect(getMenuItemImage("Takoyaki")?.src).toBe(
      "/images/menu/items/takoyaki.jpg",
    );
    expect(getMenuItemImage("Cat-Feine")?.src).toBe(
      "/images/shop/photo_012.jpg",
    );
  });

  it("omits Cat Treats so cards stay optional without a cat photo", () => {
    expect(getMenuItemImage("Cat Treats")).toBeNull();
  });

  it("returns null when no mapping exists so cards stay optional", () => {
    expect(getMenuItemImage("Seasonal Drink")).toBeNull();
    expect(getMenuItemImage("")).toBeNull();
  });
});
