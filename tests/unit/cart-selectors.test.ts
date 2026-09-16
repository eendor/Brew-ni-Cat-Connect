import { addCatalogSelection } from "@/lib/ordering/cart-reducer";
import {
  buildOrderDraft,
  getCartItemCount,
  getCartLine,
  getCartLineCount,
  getCartLines,
  getCartSubtotal,
  hasCartLine,
  isCartEmpty,
} from "@/lib/ordering/cart-selectors";
import { createInitialCartState } from "@/lib/ordering/cart-reducer";
import type { MenuCatalog } from "@/types/menu";
import type { CartState } from "@/types/ordering";

const catalog: MenuCatalog = {
  categories: [
    {
      id: "menu",
      name: "Menu",
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
          ],
        },
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

function populatedCart(): CartState {
  let state = createInitialCartState();
  for (const selection of [
    {
      itemId: "matcha",
      variantId: "matcha-16",
      flavor: "Strawberry",
      quantity: 2,
    },
    {
      itemId: "takoyaki",
      variantId: "takoyaki-4",
      flavor: "Veggie",
      quantity: 1,
    },
  ] as const) {
    const result = addCatalogSelection(state, catalog, selection);
    if (!result.ok) {
      throw new Error(`fixture add failed: ${result.reason}`);
    }
    state = result.state;
  }
  return state;
}

describe("cart selectors", () => {
  it("TC-P3-040 — reports an empty cart with zero counts and subtotal", () => {
    const empty = createInitialCartState();

    expect(isCartEmpty(empty)).toBe(true);
    expect(getCartLines(empty)).toEqual([]);
    expect(getCartLineCount(empty)).toBe(0);
    expect(getCartItemCount(empty)).toBe(0);
    expect(getCartSubtotal(empty)).toBe(0);
    expect(hasCartLine(empty, "matcha::matcha-16::Strawberry")).toBe(false);
    expect(getCartLine(empty, "matcha::matcha-16::Strawberry")).toBeUndefined();
  });

  it("TC-P3-041 — derives line count, item count, and subtotal from lines", () => {
    const state = populatedCart();

    expect(isCartEmpty(state)).toBe(false);
    expect(getCartLines(state)).toHaveLength(2);
    expect(getCartLineCount(state)).toBe(2);
    expect(getCartItemCount(state)).toBe(3);
    // 2 × ₱90 plus 1 × ₱40.
    expect(getCartSubtotal(state)).toBe(220);
    expect(hasCartLine(state, "matcha::matcha-16::Strawberry")).toBe(true);
    expect(getCartLine(state, "takoyaki::takoyaki-4::Veggie")).toMatchObject({
      unitPrice: 40,
      quantity: 1,
      lineTotal: 40,
    });
    expect(getCartLine(state, "missing")).toBeUndefined();
  });

  it("TC-P3-042 — builds an itemized draft that matches selector derivations", () => {
    const state = populatedCart();
    const draft = buildOrderDraft(state);

    expect(draft.fulfillment).toBe("pickup");
    expect(draft.lines).toEqual(getCartLines(state));
    expect(draft.lineCount).toBe(getCartLineCount(state));
    expect(draft.itemCount).toBe(getCartItemCount(state));
    expect(draft.subtotal).toBe(getCartSubtotal(state));
    expect(draft.subtotal).toBe(
      draft.lines.reduce((total, line) => total + line.lineTotal, 0),
    );
  });

  it("TC-P3-043 — reflects fulfillment changes in the draft without altering totals", () => {
    const state: CartState = {
      ...populatedCart(),
      fulfillment: "external-rider",
    };
    const draft = buildOrderDraft(state);

    expect(draft.fulfillment).toBe("external-rider");
    expect(draft.subtotal).toBe(220);
    expect(draft.lineCount).toBe(2);
    expect(draft.itemCount).toBe(3);
  });
});
