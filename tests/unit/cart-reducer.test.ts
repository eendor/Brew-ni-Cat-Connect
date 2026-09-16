import {
  addCatalogSelection,
  cartReducer,
  clearCart,
  createInitialCartState,
  getAddItemFailureMessage,
  removeCartLine,
  setCartFulfillment,
  updateCartLineQuantity,
} from "@/lib/ordering/cart-reducer";
import type { MenuCatalog } from "@/types/menu";
import type {
  CartAction,
  CartItemSelection,
  CartState,
} from "@/types/ordering";

const catalog: MenuCatalog = {
  categories: [
    {
      id: "drinks",
      name: "Cat-Tastic Drinks",
      items: [
        {
          id: "matcha",
          name: "Matcha",
          availability: "available",
          flavors: ["Original", "Strawberry"],
          variants: [
            {
              id: "matcha-16",
              name: "16 oz",
              basePrice: 80,
              flavorPrices: [{ flavor: "Strawberry", price: 90 }],
              description: null,
            },
            {
              id: "matcha-22",
              name: "22 oz",
              basePrice: 95,
              flavorPrices: [{ flavor: "Strawberry", price: 105 }],
              description: null,
            },
          ],
        },
        {
          id: "seasonal",
          name: "Seasonal Drink",
          availability: "unavailable",
          flavors: [],
          variants: [
            {
              id: "seasonal-regular",
              name: "Regular",
              basePrice: 70,
              flavorPrices: [],
              description: null,
            },
          ],
        },
        {
          id: "mystery",
          name: "Mystery Drink",
          availability: "unknown",
          flavors: [],
          variants: [
            {
              id: "mystery-regular",
              name: "Regular",
              basePrice: 65,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
    {
      id: "bites",
      name: "Cat-Tastic Bites",
      items: [
        {
          id: "takoyaki",
          name: "Takoyaki",
          availability: "available",
          flavors: ["Veggie", "Shrimp"],
          variants: [
            {
              id: "takoyaki-4",
              name: "4pcs",
              basePrice: 0,
              flavorPrices: [
                { flavor: "Shrimp", price: 60 },
                { flavor: "Veggie", price: 40 },
              ],
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

function addMatcha(
  state: CartState,
  overrides: Partial<{
    variantId: string;
    flavor: string | null;
    quantity: number;
  }> = {},
): CartState {
  const result = addCatalogSelection(state, catalog, {
    itemId: "matcha",
    variantId: overrides.variantId ?? "matcha-16",
    flavor: overrides.flavor ?? null,
    quantity: overrides.quantity ?? 1,
  });

  if (!result.ok) {
    throw new Error(`fixture add failed: ${result.reason}`);
  }

  return result.state;
}

describe("cart catalog add", () => {
  it("TC-P3-020 — adds a valid configured product with resolved unit and line totals", () => {
    const result = addCatalogSelection(createInitialCartState(), catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: "Strawberry",
      quantity: 2,
    });

    if (!result.ok) {
      throw new Error(`expected success, got ${result.reason}`);
    }

    expect(result.lineKey).toBe("matcha::matcha-16::Strawberry");
    expect(result.state.lines).toHaveLength(1);
    expect(result.state.lines[0]).toMatchObject({
      key: "matcha::matcha-16::Strawberry",
      itemId: "matcha",
      itemName: "Matcha",
      variantId: "matcha-16",
      variantName: "16 oz",
      flavor: "Strawberry",
      unitPrice: 90,
      quantity: 2,
      lineTotal: 180,
    });
  });

  it("TC-P3-021 — merges identical configurations by adding quantities", () => {
    let state = createInitialCartState();
    state = addMatcha(state, { flavor: "Strawberry", quantity: 1 });
    state = addMatcha(state, { flavor: "Strawberry", quantity: 2 });

    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]).toMatchObject({ quantity: 3, lineTotal: 270 });
  });

  it("TC-P3-022 — keeps different flavors and variants on separate lines", () => {
    let state = createInitialCartState();
    state = addMatcha(state, { flavor: "Strawberry", quantity: 1 });
    state = addMatcha(state, { flavor: "Original", quantity: 1 });
    state = addMatcha(state, {
      variantId: "matcha-22",
      flavor: "Strawberry",
      quantity: 1,
    });

    expect(state.lines.map((line) => line.key)).toEqual([
      "matcha::matcha-16::Strawberry",
      "matcha::matcha-16::Original",
      "matcha::matcha-22::Strawberry",
    ]);
    expect(state.lines.map((line) => line.lineTotal)).toEqual([90, 80, 105]);
  });

  it("TC-P3-023 — keeps Takoyaki flavors separate with flavor-derived prices", () => {
    const initial = createInitialCartState();
    const veggie = addCatalogSelection(initial, catalog, {
      itemId: "takoyaki",
      variantId: "takoyaki-4",
      flavor: "Veggie",
      quantity: 2,
    });
    if (!veggie.ok) {
      throw new Error(`expected success, got ${veggie.reason}`);
    }
    const shrimp = addCatalogSelection(veggie.state, catalog, {
      itemId: "takoyaki",
      variantId: "takoyaki-4",
      flavor: "Shrimp",
      quantity: 1,
    });
    if (!shrimp.ok) {
      throw new Error(`expected success, got ${shrimp.reason}`);
    }

    expect(shrimp.state.lines).toHaveLength(2);
    expect(shrimp.state.lines[0]).toMatchObject({
      flavor: "Veggie",
      unitPrice: 40,
      quantity: 2,
      lineTotal: 80,
    });
    expect(shrimp.state.lines[1]).toMatchObject({
      flavor: "Shrimp",
      unitPrice: 60,
      quantity: 1,
      lineTotal: 60,
    });
  });

  it("TC-P3-024 — sums merged quantities without an owner-unconfirmed cap", () => {
    let state = createInitialCartState();
    state = addMatcha(state, { quantity: 98 });
    state = addMatcha(state, { quantity: 5 });

    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]).toMatchObject({ quantity: 103, lineTotal: 8240 });
  });

  it("TC-P3-025 — rejects unavailable and unknown-availability products", () => {
    const initial = createInitialCartState();
    const unavailable = addCatalogSelection(initial, catalog, {
      itemId: "seasonal",
      variantId: "seasonal-regular",
      flavor: null,
      quantity: 1,
    });
    const unknown = addCatalogSelection(initial, catalog, {
      itemId: "mystery",
      variantId: "mystery-regular",
      flavor: null,
      quantity: 1,
    });

    if (unavailable.ok || unknown.ok) {
      throw new Error("expected both adds to fail");
    }

    expect(unavailable.reason).toBe("item-unavailable");
    expect(unknown.reason).toBe("availability-unknown");
    expect(unavailable.state).toBe(initial);
    expect(unknown.state).toBe(initial);
    expect(getAddItemFailureMessage("item-unavailable")).toContain(
      "temporarily unavailable",
    );
  });

  it("TC-P3-026 — rejects unknown references, missing prices, and invalid quantities", () => {
    const initial = createInitialCartState();

    const unknownItem = addCatalogSelection(initial, catalog, {
      itemId: "missing",
      variantId: "matcha-16",
      flavor: null,
      quantity: 1,
    });
    const unknownVariant = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "missing",
      flavor: null,
      quantity: 1,
    });
    const unknownFlavor = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: "Ube",
      quantity: 1,
    });
    const missingPrice = addCatalogSelection(initial, catalog, {
      itemId: "takoyaki",
      variantId: "takoyaki-4",
      flavor: null,
      quantity: 1,
    });
    const invalidQuantity = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 0,
    });

    if (
      unknownItem.ok ||
      unknownVariant.ok ||
      unknownFlavor.ok ||
      missingPrice.ok ||
      invalidQuantity.ok
    ) {
      throw new Error("expected all invalid adds to fail");
    }

    expect(unknownItem.reason).toBe("unknown-item");
    expect(unknownVariant.reason).toBe("unknown-variant");
    expect(unknownFlavor.reason).toBe("unknown-flavor");
    expect(missingPrice.reason).toBe("missing-price");
    expect(invalidQuantity.reason).toBe("invalid-quantity");
    for (const result of [
      unknownItem,
      unknownVariant,
      unknownFlavor,
      missingPrice,
      invalidQuantity,
    ]) {
      expect(result.state).toBe(initial);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("TC-P3-027 — normalizes flavor whitespace before identity and pricing", () => {
    const result = addCatalogSelection(createInitialCartState(), catalog, {
      itemId: "takoyaki",
      variantId: "takoyaki-4",
      flavor: "  Veggie  ",
      quantity: 1,
    });

    if (!result.ok) {
      throw new Error(`expected success, got ${result.reason}`);
    }

    expect(result.lineKey).toBe("takoyaki::takoyaki-4::Veggie");
    expect(result.state.lines[0]).toMatchObject({
      flavor: "Veggie",
      unitPrice: 40,
    });
  });

  it("TC-P3-028 — derives prices from the supplied catalog rather than constants", () => {
    const pricedCatalog: MenuCatalog = {
      categories: [
        {
          id: "drinks",
          name: "Drinks",
          items: [
            {
              id: "matcha",
              name: "Matcha Renamed",
              availability: "available",
              flavors: [],
              variants: [
                {
                  id: "matcha-16",
                  name: "16 oz Renamed",
                  basePrice: 123,
                  flavorPrices: [],
                  description: null,
                },
              ],
            },
          ],
        },
      ],
    };
    const result = addCatalogSelection(
      createInitialCartState(),
      pricedCatalog,
      {
        itemId: "matcha",
        variantId: "matcha-16",
        flavor: null,
        quantity: 2,
      },
    );

    if (!result.ok) {
      throw new Error(`expected success, got ${result.reason}`);
    }

    expect(result.state.lines[0]).toMatchObject({
      itemName: "Matcha Renamed",
      variantName: "16 oz Renamed",
      unitPrice: 123,
      lineTotal: 246,
    });
  });
});

describe("cart line management", () => {
  it("TC-P3-029 — removes a line and keeps removal of an unknown key a no-op", () => {
    let state = addMatcha(createInitialCartState(), { quantity: 2 });
    const key = state.lines[0]?.key ?? "";
    state = addMatcha(state, { flavor: "Strawberry", quantity: 1 });

    const removed = removeCartLine(state, key);
    expect(removed.lines.map((line) => line.key)).toEqual([
      "matcha::matcha-16::Strawberry",
    ]);

    expect(removeCartLine(removed, "missing")).toBe(removed);
    expect(
      removeCartLine(removeCartLine(removed, removed.lines[0]?.key ?? ""), "x")
        .lines,
    ).toEqual([]);
  });

  it("TC-P3-030 — updates quantities and never allows an invalid quantity", () => {
    const state = addMatcha(createInitialCartState(), { quantity: 1 });
    const key = state.lines[0]?.key ?? "";

    const updated = updateCartLineQuantity(state, key, 4);
    expect(updated.lines[0]).toMatchObject({ quantity: 4, lineTotal: 320 });

    expect(updateCartLineQuantity(updated, key, 0)).toBe(updated);
    expect(updateCartLineQuantity(updated, key, -2)).toBe(updated);
    expect(updateCartLineQuantity(updated, key, 2.5)).toBe(updated);
    expect(updateCartLineQuantity(updated, key, Number.NaN)).toBe(updated);
    expect(updateCartLineQuantity(updated, key, Number.POSITIVE_INFINITY)).toBe(
      updated,
    );
    expect(updateCartLineQuantity(updated, "missing", 2)).toBe(updated);
    expect(updateCartLineQuantity(updated, key, 4)).toBe(updated);

    const large = updateCartLineQuantity(updated, key, 100);
    expect(large.lines[0]).toMatchObject({ quantity: 100, lineTotal: 8000 });
  });

  it("TC-P3-031 — rejects invalid quantities through the public add boundary", () => {
    const initial = createInitialCartState();

    for (const quantity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = addCatalogSelection(initial, catalog, {
        itemId: "matcha",
        variantId: "matcha-16",
        flavor: null,
        quantity,
      });

      if (result.ok) {
        throw new Error(`quantity ${String(quantity)} should have failed`);
      }

      expect(result.reason).toBe("invalid-quantity");
      expect(result.state).toBe(initial);
    }

    const large = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 100,
    });
    if (!large.ok) {
      throw new Error(`quantity 100 should have succeeded`);
    }
    expect(large.state.lines[0]).toMatchObject({ quantity: 100 });

    expect(initial.lines).toEqual([]);
  });

  it("TC-P3-035 — ignores caller-supplied prices and resolves from the catalog", () => {
    const initial = createInitialCartState();
    const hostileSelection = {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 2,
      unitPrice: 1,
      itemName: "Fake Name",
      variantName: "Fake Size",
      lineTotal: 2,
    } as unknown as CartItemSelection;

    // The public selection contract carries no price or name fields.
    expect("unitPrice" in hostileSelection).toBe(true);
    expect(
      Object.keys({
        itemId: "matcha",
        variantId: "matcha-16",
        flavor: null,
        quantity: 2,
      } satisfies CartItemSelection),
    ).not.toContain("unitPrice");

    const result = addCatalogSelection(initial, catalog, hostileSelection);

    if (!result.ok) {
      throw new Error(`expected success, got ${result.reason}`);
    }

    expect(result.state.lines[0]).toMatchObject({
      itemName: "Matcha",
      variantName: "16 oz",
      unitPrice: 80,
      quantity: 2,
      lineTotal: 160,
    });
  });

  it("TC-P3-036 — follows catalog price changes instead of caller-fixed prices", () => {
    const selection: CartItemSelection = {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 1,
    };
    const repricedCatalog: MenuCatalog = {
      categories: [
        {
          id: "drinks",
          name: "Drinks",
          items: [
            {
              id: "matcha",
              name: "Matcha",
              availability: "available",
              flavors: [],
              variants: [
                {
                  id: "matcha-16",
                  name: "16 oz",
                  basePrice: 250,
                  flavorPrices: [],
                  description: null,
                },
              ],
            },
          ],
        },
      ],
    };

    const before = addCatalogSelection(
      createInitialCartState(),
      catalog,
      selection,
    );
    const after = addCatalogSelection(
      createInitialCartState(),
      repricedCatalog,
      selection,
    );

    if (!before.ok || !after.ok) {
      throw new Error("expected both catalog-priced adds to succeed");
    }

    expect(before.state.lines[0]?.unitPrice).toBe(80);
    expect(after.state.lines[0]?.unitPrice).toBe(250);
    expect(after.state.lines[0]?.lineTotal).toBe(250);
  });

  it("TC-P3-038 — refreshes an existing line to the current catalog price on re-add", () => {
    const repricedCatalog: MenuCatalog = {
      categories: [
        {
          id: "drinks",
          name: "Drinks",
          items: [
            {
              id: "matcha",
              name: "Matcha Renamed",
              availability: "available",
              flavors: [],
              variants: [
                {
                  id: "matcha-16",
                  name: "16 oz Renamed",
                  basePrice: 250,
                  flavorPrices: [],
                  description: null,
                },
              ],
            },
          ],
        },
      ],
    };
    const selection: CartItemSelection = {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 1,
    };

    const first = addCatalogSelection(
      createInitialCartState(),
      catalog,
      selection,
    );
    if (!first.ok) {
      throw new Error(`expected first add to succeed`);
    }
    expect(first.state.lines[0]).toMatchObject({
      unitPrice: 80,
      quantity: 1,
      lineTotal: 80,
    });

    const second = addCatalogSelection(first.state, repricedCatalog, selection);
    if (!second.ok) {
      throw new Error(`expected repriced add to succeed`);
    }

    expect(second.state.lines).toHaveLength(1);
    expect(second.state.lines[0]).toMatchObject({
      itemName: "Matcha Renamed",
      variantName: "16 oz Renamed",
      unitPrice: 250,
      quantity: 2,
      lineTotal: 500,
    });
  });

  it("TC-P3-032 — clears all lines while retaining fulfillment", () => {
    let state = addMatcha(createInitialCartState(), { quantity: 1 });
    state = setCartFulfillment(state, "external-rider");
    const cleared = clearCart(state);

    expect(cleared.lines).toEqual([]);
    expect(cleared.fulfillment).toBe("external-rider");
    expect(clearCart(cleared)).toBe(cleared);
  });
});

describe("cart fulfillment and reducer boundary", () => {
  it("TC-P3-033 — defaults to pickup and switches only between supported modes", () => {
    expect(createInitialCartState().fulfillment).toBe("pickup");

    const initial = createInitialCartState();
    const rider = setCartFulfillment(initial, "external-rider");
    expect(rider.fulfillment).toBe("external-rider");
    expect(setCartFulfillment(rider, "external-rider")).toBe(rider);
    expect(
      setCartFulfillment(rider, "drone" as unknown as typeof rider.fulfillment),
    ).toBe(rider);
  });

  it("TC-P3-034 — applies reducer actions for price-free updates only", () => {
    const initial = createInitialCartState();
    let state = addMatcha(initial, { quantity: 2 });
    expect(state.lines[0]).toMatchObject({ quantity: 2, lineTotal: 160 });
    expect(initial.lines).toEqual([]);

    const key = state.lines[0]?.key ?? "";
    state = cartReducer(state, {
      type: "update-quantity",
      key,
      quantity: 3,
    });
    expect(state.lines[0]).toMatchObject({ quantity: 3, lineTotal: 240 });

    state = cartReducer(state, {
      type: "set-fulfillment",
      fulfillment: "external-rider",
    });
    expect(state.fulfillment).toBe("external-rider");

    state = cartReducer(state, { type: "remove", key });
    expect(state.lines).toEqual([]);
    expect(state.fulfillment).toBe("external-rider");

    state = addMatcha(state, { quantity: 1 });
    expect(state.lines).toHaveLength(1);
    expect(cartReducer(state, { type: "clear" }).lines).toEqual([]);
    expect(initial.lines).toEqual([]);
  });

  it("TC-P3-037 — ignores legacy price-injecting reducer payloads", () => {
    const initial = addMatcha(createInitialCartState(), { quantity: 1 });
    const hostileAdd = {
      type: "add",
      entry: {
        itemId: "matcha",
        itemName: "Matcha",
        variantId: "matcha-16",
        variantName: "16 oz",
        flavor: null,
        unitPrice: 1,
        quantity: 99,
      },
    } as unknown as CartAction;

    expect(cartReducer(initial, hostileAdd)).toBe(initial);
    expect(initial.lines[0]).toMatchObject({ unitPrice: 80, quantity: 1 });
  });

  it("TC-P3-039 — rejects money-unsafe adds and merges without changing the cart", () => {
    const initial = createInitialCartState();

    const unsafeSingle = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: Number.MAX_SAFE_INTEGER,
    });
    if (unsafeSingle.ok) {
      throw new Error("MAX_SAFE_INTEGER at ₱80 should be money-unsafe");
    }
    expect(unsafeSingle.reason).toBe("invalid-quantity");
    expect(unsafeSingle.state).toBe(initial);

    const largeSafe = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 1_000_000_000_000,
    });
    if (!largeSafe.ok) {
      throw new Error(`large safe quantity should succeed`);
    }
    expect(largeSafe.state.lines[0]).toMatchObject({
      unitPrice: 80,
      quantity: 1_000_000_000_000,
      lineTotal: 80_000_000_000_000,
    });

    const maxSafeQuantity = Math.floor(Number.MAX_SAFE_INTEGER / (80 * 100));
    const filled = addCatalogSelection(initial, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: maxSafeQuantity,
    });
    if (!filled.ok) {
      throw new Error(`max money-safe quantity should succeed`);
    }

    const overflowMerge = addCatalogSelection(filled.state, catalog, {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: null,
      quantity: 1,
    });
    if (overflowMerge.ok) {
      throw new Error("merging past money safety should fail");
    }
    expect(overflowMerge.reason).toBe("invalid-quantity");
    expect(overflowMerge.state).toBe(filled.state);
    expect(filled.state.lines[0]?.quantity).toBe(maxSafeQuantity);
  });

  it("TC-P3-044 — rejects money-unsafe quantity updates and keeps normal updates", () => {
    const state = addMatcha(createInitialCartState(), { quantity: 1 });
    const key = state.lines[0]?.key ?? "";

    const normal = updateCartLineQuantity(state, key, 2);
    expect(normal.lines[0]).toMatchObject({ quantity: 2, lineTotal: 160 });

    expect(updateCartLineQuantity(normal, key, Number.MAX_SAFE_INTEGER)).toBe(
      normal,
    );
    expect(normal.lines[0]).toMatchObject({ quantity: 2, lineTotal: 160 });

    const largeSafe = updateCartLineQuantity(normal, key, 1_000_000_000_000);
    expect(largeSafe.lines[0]).toMatchObject({
      quantity: 1_000_000_000_000,
      lineTotal: 80_000_000_000_000,
    });
  });
});
