import { describe, expect, it } from "vitest";

import { getMenuItemImage } from "@/config/menu-item-images";

describe("getMenuItemImage", () => {
  it("maps noodle items to the shop food plate still", () => {
    expect(getMenuItemImage("Buldak Carbo")?.src).toBe(
      "/images/shop/photo_011.jpg",
    );
    expect(getMenuItemImage("Buldak Cheese")?.src).toBe(
      "/images/shop/photo_011.jpg",
    );
    expect(getMenuItemImage("Sedaap Original")?.src).toBe(
      "/images/shop/photo_011.jpg",
    );
    expect(getMenuItemImage("Sedaap Spicy Chicken")?.src).toBe(
      "/images/shop/photo_011.jpg",
    );
  });

  it("maps Cat-Feine to the shop iced-coffee still", () => {
    expect(getMenuItemImage("Cat-Feine")?.src).toBe(
      "/images/shop/photo_012.jpg",
    );
    expect(getMenuItemImage("Cat-Feine (Classic Coffee)")?.src).toBe(
      "/images/shop/photo_012.jpg",
    );
  });

  it("omits items without a shop food-only still (no stock photos)", () => {
    expect(getMenuItemImage("Matcha (The Lucky Green Neko)")).toBeNull();
    expect(getMenuItemImage("Fries (Cat Claws)")).toBeNull();
    expect(getMenuItemImage("Oreo (The Tuxedo Cat)")).toBeNull();
    expect(getMenuItemImage("Takoyaki")).toBeNull();
    expect(getMenuItemImage("Nachos")).toBeNull();
    expect(getMenuItemImage("Soda")).toBeNull();
    expect(getMenuItemImage("Cat Association")).toBeNull();
    expect(getMenuItemImage("Couple of Cats")).toBeNull();
    expect(getMenuItemImage("Single-Paw-rtner Combos")).toBeNull();
    expect(getMenuItemImage("Take-out Box")).toBeNull();
    expect(getMenuItemImage("Cat Treats")).toBeNull();
  });

  it("returns null when no mapping exists so cards stay optional", () => {
    expect(getMenuItemImage("Seasonal Drink")).toBeNull();
    expect(getMenuItemImage("")).toBeNull();
  });
});
