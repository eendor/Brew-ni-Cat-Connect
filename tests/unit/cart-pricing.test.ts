import {
  buildCartItemKey,
  buildSelectionKey,
  calculateLineTotal,
  calculateSubtotal,
  CART_MAX_QUANTITY,
  CART_MIN_QUANTITY,
  findCatalogItem,
  findCatalogVariant,
  fromCentavos,
  isValidCartQuantity,
  normalizeFlavor,
  normalizePrice,
  resolveVariantUnitPrice,
  toCentavos,
} from "@/lib/ordering/cart-pricing";
import type { MenuCatalog, MenuItem, MenuVariant } from "@/types/menu";

function makeVariant(
  overrides: Partial<MenuVariant> & Pick<MenuVariant, "id" | "name">,
): MenuVariant {
  return {
    basePrice: null,
    flavorPrices: [],
    description: null,
    ...overrides,
  };
}

function makeItem(
  overrides: Partial<MenuItem> & Pick<MenuItem, "id" | "name">,
): MenuItem {
  return {
    availability: "available",
    flavors: [],
    variants: [],
    ...overrides,
  };
}

const catalog: MenuCatalog = {
  categories: [
    {
      id: "drinks",
      name: "Cat-Tastic Drinks",
      items: [
        makeItem({
          id: "matcha",
          name: "Matcha",
          flavors: ["Original", "Strawberry"],
          variants: [
            makeVariant({
              id: "matcha-16",
              name: "16 oz",
              basePrice: 80,
              flavorPrices: [{ flavor: "Strawberry", price: 90 }],
            }),
          ],
        }),
      ],
    },
    {
      id: "bites",
      name: "Cat-Tastic Bites",
      items: [
        makeItem({
          id: "takoyaki",
          name: "Takoyaki",
          flavors: ["Veggie", "Shrimp"],
          variants: [
            makeVariant({
              id: "takoyaki-4",
              name: "4pcs",
              basePrice: 0,
              flavorPrices: [
                { flavor: "Shrimp", price: 60 },
                { flavor: "Veggie", price: 40 },
              ],
            }),
          ],
        }),
      ],
    },
  ],
};

function requireItem(itemId: string): MenuItem {
  const item = findCatalogItem(catalog, itemId);
  if (!item) {
    throw new Error(`missing fixture item: ${itemId}`);
  }
  return item;
}

function requireVariant(item: MenuItem, variantId: string): MenuVariant {
  const variant = findCatalogVariant(item, variantId);
  if (!variant) {
    throw new Error(`missing fixture variant: ${variantId}`);
  }
  return variant;
}

describe("cart flavor normalization and identity", () => {
  it("TC-P3-001 — trims flavors and treats blank input as no flavor", () => {
    expect(normalizeFlavor(" Veggie ")).toBe("Veggie");
    expect(normalizeFlavor("   ")).toBeNull();
    expect(normalizeFlavor("")).toBeNull();
    expect(normalizeFlavor(null)).toBeNull();
    expect(normalizeFlavor(undefined)).toBeNull();
  });

  it("TC-P3-002 — builds a deterministic key that merges trims but separates flavors", () => {
    expect(buildCartItemKey("takoyaki", "takoyaki-4", "Veggie")).toBe(
      buildCartItemKey("takoyaki", "takoyaki-4", " Veggie "),
    );
    expect(buildCartItemKey("takoyaki", "takoyaki-4", "Veggie")).not.toBe(
      buildCartItemKey("takoyaki", "takoyaki-4", "Shrimp"),
    );
    expect(buildCartItemKey("takoyaki", "takoyaki-4", null)).not.toBe(
      buildCartItemKey("takoyaki", "takoyaki-4", "Veggie"),
    );
    expect(buildCartItemKey("matcha", "matcha-16", null)).not.toBe(
      buildCartItemKey("takoyaki", "takoyaki-4", null),
    );
    expect(
      buildSelectionKey({
        itemId: "matcha",
        variantId: "matcha-16",
        flavor: "Strawberry",
        quantity: 2,
      }),
    ).toBe(buildCartItemKey("matcha", "matcha-16", "Strawberry"));
  });
});

describe("cart catalog lookup", () => {
  it("TC-P3-003 — finds items across categories and returns null when absent", () => {
    expect(findCatalogItem(catalog, "matcha")?.name).toBe("Matcha");
    expect(findCatalogItem(catalog, "takoyaki")?.name).toBe("Takoyaki");
    expect(findCatalogItem(catalog, "missing")).toBeNull();
  });

  it("TC-P3-004 — finds variants within an item and returns null when absent", () => {
    const matcha = requireItem("matcha");
    expect(findCatalogVariant(matcha, "matcha-16")?.name).toBe("16 oz");
    expect(findCatalogVariant(matcha, "missing")).toBeNull();
  });
});

describe("cart unit-price resolution", () => {
  it("TC-P3-005 — resolves the base price when no flavor is selected", () => {
    const item = requireItem("matcha");
    const result = resolveVariantUnitPrice(
      item,
      requireVariant(item, "matcha-16"),
      null,
    );

    expect(result).toEqual({ ok: true, unitPrice: 80 });
  });

  it("TC-P3-006 — prefers an explicit flavor price over the base price", () => {
    const item = requireItem("matcha");
    const result = resolveVariantUnitPrice(
      item,
      requireVariant(item, "matcha-16"),
      "Strawberry",
    );

    expect(result).toEqual({ ok: true, unitPrice: 90 });
  });

  it("TC-P3-007 — falls back to the base price for a known flavor without an override", () => {
    const item = requireItem("matcha");
    const result = resolveVariantUnitPrice(
      item,
      requireVariant(item, "matcha-16"),
      "Original",
    );

    expect(result).toEqual({ ok: true, unitPrice: 80 });
  });

  it("TC-P3-008 — resolves Takoyaki flavor prices when the base is the zero placeholder", () => {
    const item = requireItem("takoyaki");
    const variant = requireVariant(item, "takoyaki-4");

    expect(resolveVariantUnitPrice(item, variant, "Veggie")).toEqual({
      ok: true,
      unitPrice: 40,
    });
    expect(resolveVariantUnitPrice(item, variant, "Shrimp")).toEqual({
      ok: true,
      unitPrice: 60,
    });
  });

  it("TC-P3-009 — rejects a bare zero-base variant that requires a flavor choice", () => {
    const item = requireItem("takoyaki");
    expect(
      resolveVariantUnitPrice(item, requireVariant(item, "takoyaki-4"), null),
    ).toEqual({ ok: false, reason: "missing-price" });
  });

  it("TC-P3-010 — resolves a flavor price when the base is null", () => {
    const item = makeItem({ id: "special", name: "Special" });
    const variant = makeVariant({
      id: "special-regular",
      name: "Regular",
      basePrice: null,
      flavorPrices: [{ flavor: "Ube", price: 75 }],
    });

    expect(resolveVariantUnitPrice(item, variant, "Ube")).toEqual({
      ok: true,
      unitPrice: 75,
    });
    expect(resolveVariantUnitPrice(item, variant, null)).toEqual({
      ok: false,
      reason: "missing-price",
    });
  });

  it("TC-P3-011 — rejects unknown flavors instead of falling back to the base", () => {
    const item = requireItem("matcha");
    expect(
      resolveVariantUnitPrice(item, requireVariant(item, "matcha-16"), "Ube"),
    ).toEqual({ ok: false, reason: "unknown-flavor" });

    const plain = makeItem({ id: "plain", name: "Plain" });
    const plainVariant = makeVariant({
      id: "plain-regular",
      name: "Regular",
      basePrice: 50,
    });
    expect(resolveVariantUnitPrice(plain, plainVariant, "Ube")).toEqual({
      ok: false,
      reason: "unknown-flavor",
    });
  });

  it("TC-P3-012 — rejects variants without any purchasable price", () => {
    const item = makeItem({ id: "priceless", name: "Priceless" });
    expect(
      resolveVariantUnitPrice(
        item,
        makeVariant({ id: "v-none", name: "No price", basePrice: null }),
        null,
      ),
    ).toEqual({ ok: false, reason: "missing-price" });
    expect(
      resolveVariantUnitPrice(
        item,
        makeVariant({ id: "v-zero", name: "Zero", basePrice: 0 }),
        null,
      ),
    ).toEqual({ ok: false, reason: "missing-price" });
  });

  it("TC-P3-013 — accepts an explicit zero flavor price as authoritative", () => {
    const item = makeItem({
      id: "promo",
      name: "Promo",
      flavors: ["Free Taste"],
    });
    const variant = makeVariant({
      id: "promo-regular",
      name: "Regular",
      basePrice: 50,
      flavorPrices: [{ flavor: "Free Taste", price: 0 }],
    });

    expect(resolveVariantUnitPrice(item, variant, "Free Taste")).toEqual({
      ok: true,
      unitPrice: 0,
    });
  });
});

describe("cart money arithmetic", () => {
  it("TC-P3-014 — converts through integer centavos without drift", () => {
    expect(toCentavos(80)).toBe(8000);
    expect(fromCentavos(8000)).toBe(80);
    expect(normalizePrice(80.555)).toBe(80.56);
    expect(calculateLineTotal(19.99, 3)).toBe(59.97);
    expect(calculateLineTotal(80.1, 3)).toBe(240.3);
  });

  it("TC-P3-015 — totals lines through centavos so fractional pesos stay exact", () => {
    expect(
      calculateSubtotal([
        { unitPrice: 80, quantity: 2 },
        { unitPrice: 40, quantity: 1 },
      ]),
    ).toBe(200);
    expect(calculateSubtotal([])).toBe(0);
    expect(
      calculateSubtotal([
        { unitPrice: 19.99, quantity: 2 },
        { unitPrice: 0.1, quantity: 3 },
      ]),
    ).toBe(40.28);
  });
});

describe("cart quantity validation", () => {
  it("TC-P3-016 — accepts only whole quantities within the interim bounds", () => {
    expect(CART_MIN_QUANTITY).toBe(1);
    expect(CART_MAX_QUANTITY).toBe(99);
    expect(isValidCartQuantity(1)).toBe(true);
    expect(isValidCartQuantity(99)).toBe(true);
    expect(isValidCartQuantity(0)).toBe(false);
    expect(isValidCartQuantity(-1)).toBe(false);
    expect(isValidCartQuantity(100)).toBe(false);
    expect(isValidCartQuantity(1.5)).toBe(false);
    expect(isValidCartQuantity(Number.NaN)).toBe(false);
    expect(isValidCartQuantity(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidCartQuantity("2")).toBe(false);
    expect(isValidCartQuantity(null)).toBe(false);
    expect(isValidCartQuantity(undefined)).toBe(false);
  });
});
