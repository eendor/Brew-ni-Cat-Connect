import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import { mapMenuCatalog } from "@/lib/menu/map-menu-catalog";
import type { CategoryRow, ItemRow } from "@/types/menu";

const categories: readonly CategoryRow[] = [
  { id: "cat-drinks", name: "Cat-Tastic Drinks" },
  { id: "combos", name: "Combos & Packages" },
];

describe("mapMenuCatalog", () => {
  it("TC-P2-007 — normalizes pipe flavors, base prices, and flavor-specific prices", () => {
    const items: readonly ItemRow[] = [
      {
        id: "matcha",
        category_id: "cat-drinks",
        name: " Matcha ",
        flavors: "Original | Strawberry | Original |  ",
        variants_json: [
          {
            id: "matcha-16",
            name: "16 oz",
            basePrice: "80",
            priceByFlavor: {
              Strawberry: "90",
              Original: 80,
              Invalid: "not-a-price",
            },
          },
        ],
        is_available: true,
      },
    ];

    const catalog = mapMenuCatalog(categories, items);
    const matcha = catalog.categories
      .find((category) => category.id === "cat-drinks")
      ?.items.at(0);

    expect(matcha).toMatchObject({
      id: "matcha",
      name: "Matcha",
      availability: "available",
      flavors: ["Original", "Strawberry"],
    });
    expect(matcha?.variants).toEqual([
      {
        id: "matcha-16",
        name: "16 oz",
        basePrice: 80,
        flavorPrices: [
          { flavor: "Original", price: 80 },
          { flavor: "Strawberry", price: 90 },
        ],
        description: null,
      },
    ]);
  });

  it("TC-P2-008 — preserves combo descriptions from JSON text and unavailable status", () => {
    const items: readonly ItemRow[] = [
      {
        id: "combo-a",
        category_id: "combos",
        name: "Cat Combo",
        flavors: null,
        variants_json: JSON.stringify([
          {
            name: "Set A",
            basePrice: 149,
            description: "Includes one drink and one snack.",
          },
        ]),
        is_available: false,
      },
    ];

    const catalog = mapMenuCatalog(categories, items);
    const combo = catalog.categories
      .find((category) => category.id === "combos")
      ?.items.at(0);

    expect(combo?.availability).toBe("unavailable");
    expect(combo?.variants.at(0)).toMatchObject({
      id: "combo-a-variant-1",
      name: "Set A",
      basePrice: 149,
      description: "Includes one drink and one snack.",
    });
  });

  it("TC-P2-009 — handles null and malformed records without fabricating data", () => {
    const invalidCategoryRows: readonly CategoryRow[] = [
      ...categories,
      { id: "blank", name: "  " },
    ];
    const items: readonly ItemRow[] = [
      {
        id: "unknown",
        category_id: "cat-drinks",
        name: "No-price item",
        flavors: null,
        variants_json: "not valid JSON",
        is_available: null,
      },
      {
        id: "blank-name",
        category_id: "cat-drinks",
        name: null,
        flavors: "One | Two",
        variants_json: [],
        is_available: true,
      },
      {
        id: "orphan",
        category_id: null,
        name: "Orphan item",
        flavors: null,
        variants_json: null,
        is_available: true,
      },
    ];

    const catalog = mapMenuCatalog(invalidCategoryRows, items);
    const drinks = catalog.categories.find(
      (category) => category.id === "cat-drinks",
    );

    expect(catalog.categories.some((category) => category.id === "blank")).toBe(
      false,
    );
    expect(drinks?.items).toEqual([
      {
        id: "unknown",
        name: "No-price item",
        availability: "unknown",
        flavors: [],
        variants: [],
      },
    ]);
    expect(
      catalog.categories.flatMap((category) => category.items),
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "orphan" })]),
    );
  });
});

describe("menu price helpers", () => {
  it("TC-P2-010 — formats Philippine peso values and finds the lowest valid price", () => {
    expect(formatPrice(80)).toBe("₱80");
    expect(formatPrice(80.5)).toBe("₱80.5");
    expect(getLowestItemPrice([null, 95, 80, Number.NaN])).toBe(80);
    expect(getLowestItemPrice([null, Number.NaN])).toBeNull();
  });
});
