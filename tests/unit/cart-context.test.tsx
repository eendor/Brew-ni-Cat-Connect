import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  CartProvider,
  useCart,
  validateStoredCartState,
} from "@/context/cart-context";
import type { MenuCatalog } from "@/types/menu";
import type { CartState } from "@/types/ordering";

const testCatalog: MenuCatalog = {
  categories: [
    {
      id: "drinks",
      name: "Drinks",
      items: [
        {
          id: "iced-latte",
          name: "Iced Latte",
          availability: "available",
          flavors: ["Caramel", "Vanilla"],
          variants: [
            {
              id: "latte-16",
              name: "16 oz",
              basePrice: 85,
              flavorPrices: [{ flavor: "Caramel", price: 95 }],
              description: null,
            },
            {
              id: "latte-22",
              name: "22 oz",
              basePrice: 105,
              flavorPrices: [],
              description: null,
            },
          ],
        },
        {
          id: "seasonal-tea",
          name: "Seasonal Tea",
          availability: "unavailable",
          flavors: [],
          variants: [
            {
              id: "tea-16",
              name: "16 oz",
              basePrice: 70,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
    {
      id: "snacks",
      name: "Snacks",
      items: [
        {
          id: "takoyaki",
          name: "Takoyaki",
          availability: "available",
          flavors: ["Veggie", "Octopus"],
          variants: [
            {
              id: "tako-4",
              name: "4 pcs",
              basePrice: 0,
              flavorPrices: [
                { flavor: "Veggie", price: 45 },
                { flavor: "Octopus", price: 65 },
              ],
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

function createWrapper(initialState?: CartState, storageKey?: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CartProvider initialState={initialState} storageKey={storageKey}>
        {children}
      </CartProvider>
    );
  };
}

describe("CartContext & Provider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("initializes with a valid empty cart state", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.lineCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.fulfillment).toBe("pickup");
  });

  it("adds an available catalog selection with exact price and line total", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    act(() => {
      const res = result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 2,
      });
      expect(res.ok).toBe(true);
    });

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.lineCount).toBe(1);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.subtotal).toBe(170); // 85 * 2

    const line = result.current.lines[0];
    expect(line?.itemName).toBe("Iced Latte");
    expect(line?.variantName).toBe("16 oz");
    expect(line?.unitPrice).toBe(85);
    expect(line?.quantity).toBe(2);
    expect(line?.lineTotal).toBe(170);
  });

  it("applies flavor price overrides correctly", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    act(() => {
      const res = result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: "Caramel",
        quantity: 1,
      });
      expect(res.ok).toBe(true);
    });

    expect(result.current.subtotal).toBe(95); // Caramel flavor price 95
    expect(result.current.lines[0]?.flavor).toBe("Caramel");
    expect(result.current.lines[0]?.unitPrice).toBe(95);
  });

  it("merges identical configurations by adding quantities", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 1,
      });
    });

    act(() => {
      result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 3,
      });
    });

    expect(result.current.lineCount).toBe(1);
    expect(result.current.itemCount).toBe(4);
    expect(result.current.subtotal).toBe(340); // 85 * 4
    expect(result.current.lines[0]?.quantity).toBe(4);
  });

  it("keeps different variants or flavors as distinct cart lines", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 1,
      });
      result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-22",
        flavor: null,
        quantity: 1,
      });
      result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: "Caramel",
        quantity: 1,
      });
    });

    expect(result.current.lineCount).toBe(3);
    expect(result.current.itemCount).toBe(3);
    expect(result.current.subtotal).toBe(85 + 105 + 95);
  });

  it("rejects unavailable items without mutating cart state", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    let addResult: ReturnType<typeof result.current.addItem> | undefined;
    act(() => {
      addResult = result.current.addItem(testCatalog, {
        itemId: "seasonal-tea",
        variantId: "tea-16",
        flavor: null,
        quantity: 1,
      });
    });

    expect(addResult?.ok).toBe(false);
    if (addResult && !addResult.ok) {
      expect(addResult.reason).toBe("item-unavailable");
    }
    expect(result.current.isEmpty).toBe(true);
  });

  it("rejects invalid quantities or unknown flavors", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    act(() => {
      const res = result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: "Mint", // Unknown flavor
        quantity: 1,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe("unknown-flavor");
      }
    });

    act(() => {
      const res = result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 0, // Invalid quantity
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe("invalid-quantity");
      }
    });

    expect(result.current.isEmpty).toBe(true);
  });

  it("updates line quantity and recalculates subtotal", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    let lineKey = "";
    act(() => {
      const res = result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 1,
      });
      if (res.ok) lineKey = res.lineKey;
    });

    expect(result.current.subtotal).toBe(85);

    act(() => {
      result.current.updateQuantity(lineKey, 5);
    });

    expect(result.current.itemCount).toBe(5);
    expect(result.current.subtotal).toBe(425); // 85 * 5
  });

  it("removes a line item by key", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    let key1 = "";
    let key2 = "";
    act(() => {
      const res1 = result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 1,
      });
      const res2 = result.current.addItem(testCatalog, {
        itemId: "takoyaki",
        variantId: "tako-4",
        flavor: "Veggie",
        quantity: 1,
      });
      if (res1.ok) key1 = res1.lineKey;
      if (res2.ok) key2 = res2.lineKey;
    });

    expect(result.current.lineCount).toBe(2);

    act(() => {
      result.current.removeItem(key1);
    });

    expect(result.current.lineCount).toBe(1);
    expect(result.current.lines[0]?.key).toBe(key2);
  });

  it("sets fulfillment mode between pickup and external-rider", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fulfillment).toBe("pickup");

    act(() => {
      result.current.setFulfillment("external-rider");
    });
    expect(result.current.fulfillment).toBe("external-rider");

    act(() => {
      result.current.setFulfillment("pickup");
    });
    expect(result.current.fulfillment).toBe("pickup");
  });

  it("clears cart lines while preserving current fulfillment mode", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setFulfillment("external-rider");
      result.current.addItem(testCatalog, {
        itemId: "iced-latte",
        variantId: "latte-16",
        flavor: null,
        quantity: 2,
      });
    });

    expect(result.current.isEmpty).toBe(false);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.fulfillment).toBe("external-rider");
  });

  it("persists cart state to localStorage and restores on next mount", () => {
    const customKey = "test_cart_storage";
    const { result: firstSession } = renderHook(() => useCart(), {
      wrapper: createWrapper(undefined, customKey),
    });

    act(() => {
      firstSession.current.setFulfillment("external-rider");
      firstSession.current.addItem(testCatalog, {
        itemId: "takoyaki",
        variantId: "tako-4",
        flavor: "Octopus",
        quantity: 2,
      });
    });

    const storedRaw = window.localStorage.getItem(customKey);
    expect(storedRaw).not.toBeNull();

    // Re-mount new session with same storage key
    const { result: secondSession } = renderHook(() => useCart(), {
      wrapper: createWrapper(undefined, customKey),
    });

    expect(secondSession.current.isEmpty).toBe(false);
    expect(secondSession.current.fulfillment).toBe("external-rider");
    expect(secondSession.current.lines[0]?.itemName).toBe("Takoyaki");
    expect(secondSession.current.lines[0]?.flavor).toBe("Octopus");
    expect(secondSession.current.subtotal).toBe(130); // 65 * 2
  });

  it("validates and safely discards corrupted or tampered storage data", () => {
    expect(validateStoredCartState(null)).toBeNull();
    expect(validateStoredCartState("invalid-json")).toBeNull();
    expect(validateStoredCartState({ lines: "not-array" })).toBeNull();
    expect(
      validateStoredCartState({
        lines: [
          {
            key: "tampered",
            itemId: "iced-latte",
            variantId: "latte-16",
            itemName: "Iced Latte",
            variantName: "16 oz",
            unitPrice: 85,
            quantity: 2,
            lineTotal: 999999, // tampered line total mismatch
          },
        ],
        fulfillment: "pickup",
      }),
    ).toBeNull();
  });
});
