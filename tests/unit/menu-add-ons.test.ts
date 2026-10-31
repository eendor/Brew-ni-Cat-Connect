import { describe, expect, it } from "vitest";

import { mapMenuCatalog } from "@/lib/menu/map-menu-catalog";
import {
  allowsFlavorMix,
  encodeLineFlavor,
  isAllowedFlavor,
  resolveVariantUnitPrice,
  splitAddOns,
} from "@/lib/ordering/cart-pricing";
import type { MenuItem } from "@/types/menu";

const regular = {
  id: "regular",
  name: "Regular",
  basePrice: 69,
  flavorPrices: [],
  description: null,
};
const addOns = [
  { id: "egg_boiled", label: "Egg (Boiled)", price: 15 },
  { id: "hotdog", label: "Hotdog", price: 20 },
];
const sedaap: MenuItem = {
  id: "sedaap_spicy_chicken",
  name: "Sedaap Spicy Chicken",
  availability: "available",
  flavors: ["1 Paw (Mild)", "2 Paws (Medium)"],
  variants: [regular],
  addOns,
};
const carbo: MenuItem = {
  ...sedaap,
  id: "buldak_carbo",
  name: "Buldak Carbo",
  flavors: [],
};

describe("noodle add-ons (TC-P4-258)", () => {
  it("stores add-ons the same way as the POS", () => {
    expect(encodeLineFlavor("1 Paw (Mild)", ["Egg (Boiled)", "Hotdog"])).toBe(
      "1 Paw (Mild) + Egg (Boiled), Hotdog",
    );
    expect(encodeLineFlavor(null, ["Egg (Boiled)"])).toBe("+ Egg (Boiled)");
    expect(encodeLineFlavor("1 Paw (Mild)", [])).toBe("1 Paw (Mild)");
    expect(splitAddOns("+ Egg (Boiled)")).toEqual({
      flavor: null,
      addOns: ["Egg (Boiled)"],
      hasAddOnPart: true,
    });
  });

  it("adds each add-on price to the size price", () => {
    expect(
      resolveVariantUnitPrice(carbo, regular, "+ Egg (Boiled), Hotdog"),
    ).toEqual({
      ok: true,
      unitPrice: 104,
    });
    expect(
      resolveVariantUnitPrice(
        sedaap,
        regular,
        "2 Paws (Medium) + Egg (Boiled)",
      ),
    ).toEqual({
      ok: true,
      unitPrice: 84,
    });
  });

  it("rejects unknown or repeated add-ons", () => {
    for (const flavor of ["+ Cheese", "+ Hotdog, Hotdog", "1 Paw (Mild) + "]) {
      expect(resolveVariantUnitPrice(sedaap, regular, flavor)).toEqual({
        ok: false,
        reason: "unknown-flavor",
      });
    }
  });

  it("attaches a category's available add-ons to its items", () => {
    const catalog = mapMenuCatalog(
      [{ id: "cat_buldak", name: "Buldak & Sedaap" }],
      [
        {
          id: "buldak_carbo",
          category_id: "cat_buldak",
          name: "Buldak Carbo",
          flavors: "",
          variants_json: [{ id: "regular", name: "Regular", basePrice: 119 }],
          is_available: true,
        },
      ],
      [
        {
          id: "hotdog",
          category_id: "cat_buldak",
          label: "Hotdog",
          price: 20,
          sort_order: 2,
        },
        {
          id: "egg",
          category_id: "cat_buldak",
          label: "Egg (Boiled)",
          price: 15,
          sort_order: 1,
        },
        {
          id: "other",
          category_id: "cat_drinks",
          label: "Nata",
          price: 10,
          sort_order: 1,
        },
      ],
    );
    expect(
      catalog.categories[0]?.items[0]?.addOns?.map((a) => a.label),
    ).toEqual(["Egg (Boiled)", "Hotdog"]);
  });
});

describe("fries-only mixing (TC-P4-257)", () => {
  it("allows a mix on fries only", () => {
    expect(
      allowsFlavorMix({ id: "bite_fries", name: "Fries (Cat Claws)" }),
    ).toBe(true);
    expect(
      allowsFlavorMix({
        id: "bite_takoyaki",
        name: "Takoyaki (Pawsome Balls)",
      }),
    ).toBe(false);
    expect(isAllowedFlavor(sedaap, "1 Paw (Mild) / 2 Paws (Medium)")).toBe(
      false,
    );
  });
});
