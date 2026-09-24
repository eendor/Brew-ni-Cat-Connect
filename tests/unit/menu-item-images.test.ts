import { describe, expect, it } from "vitest";

import { getMenuItemImage } from "@/config/menu-item-images";

describe("getMenuItemImage", () => {
  it("resolves live Supabase-style names with parenthetical nicknames", () => {
    expect(getMenuItemImage("Matcha (The Lucky Green Neko)")?.src).toBe(
      "/images/shop/photo_148.jpg",
    );
    expect(getMenuItemImage("Fries (Cat Claws)")?.src).toBe(
      "/images/shop/photo_041.jpg",
    );
    expect(getMenuItemImage("Oreo (The Tuxedo Cat)")?.src).toBe(
      "/images/shop/photo_152.jpg",
    );
  });

  it("is case-insensitive and matches short catalog names", () => {
    expect(getMenuItemImage("matcha")?.alt).toMatch(/matcha/i);
    expect(getMenuItemImage("Buldak Carbo")?.src).toBe(
      "/images/shop/photo_011.jpg",
    );
    expect(getMenuItemImage("Takoyaki")?.src).toBe(
      "/images/shop/photo_155.jpg",
    );
  });

  it("returns null when no mapping exists so cards stay optional", () => {
    expect(getMenuItemImage("Seasonal Drink")).toBeNull();
    expect(getMenuItemImage("")).toBeNull();
  });
});
