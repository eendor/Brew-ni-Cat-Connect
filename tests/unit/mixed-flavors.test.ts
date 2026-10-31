import { describe, expect, it } from "vitest";

import {
  isAllowedFlavor,
  joinFlavorMix,
  resolveVariantUnitPrice,
  splitFlavorMix,
} from "@/lib/ordering/cart-pricing";
import type { MenuItem } from "@/types/menu";

const medium = {
  id: "fries-m",
  name: "Medium",
  basePrice: 50,
  flavorPrices: [],
  description: null,
};
const fries: MenuItem = {
  id: "fries",
  name: "Fries",
  availability: "available",
  flavors: ["BBQ Scratch", "Cheesy Purr", "Sour Cream"],
  variants: [medium],
};
const soda12 = {
  id: "soda-12",
  name: "12oz",
  basePrice: 0,
  flavorPrices: [
    { flavor: "Yogurt Yarn", price: 39 },
    { flavor: "Honey Peach Paws", price: 45 },
  ],
  description: null,
};
const soda: MenuItem = {
  id: "soda",
  name: "Soda",
  availability: "available",
  flavors: ["Yogurt Yarn", "Honey Peach Paws", "Lychee"],
  variants: [soda12],
};

describe("mixed flavors", () => {
  it("stores a mix the same way as the POS (TC-P4-255)", () => {
    expect(joinFlavorMix(["BBQ Scratch", "Cheesy Purr"])).toBe(
      "BBQ Scratch / Cheesy Purr",
    );
    expect(splitFlavorMix(" BBQ Scratch / Cheesy Purr ")).toEqual([
      "BBQ Scratch",
      "Cheesy Purr",
    ]);
    expect(joinFlavorMix([])).toBeNull();
  });

  it("allows up to 2 different listed flavors only (TC-P4-255)", () => {
    expect(isAllowedFlavor(fries, "BBQ Scratch / Cheesy Purr")).toBe(true);
    expect(isAllowedFlavor(fries, "BBQ Scratch / BBQ Scratch")).toBe(false);
    expect(
      isAllowedFlavor(fries, "BBQ Scratch / Cheesy Purr / Sour Cream"),
    ).toBe(false);
    expect(isAllowedFlavor(fries, "BBQ Scratch / Truffle")).toBe(false);
    expect(
      resolveVariantUnitPrice(fries, medium, "BBQ Scratch / Truffle"),
    ).toEqual({
      ok: false,
      reason: "unknown-flavor",
    });
  });

  it("prices a mix at the size price, or the dearest flavor price (TC-P4-255)", () => {
    expect(
      resolveVariantUnitPrice(fries, medium, "BBQ Scratch / Cheesy Purr"),
    ).toEqual({
      ok: true,
      unitPrice: 50,
    });
    expect(
      resolveVariantUnitPrice(soda, soda12, "Yogurt Yarn / Honey Peach Paws"),
    ).toEqual({
      ok: true,
      unitPrice: 45,
    });
    // Lychee has no price of its own on a size that needs one.
    expect(
      resolveVariantUnitPrice(soda, soda12, "Yogurt Yarn / Lychee"),
    ).toEqual({
      ok: false,
      reason: "missing-price",
    });
  });
});
