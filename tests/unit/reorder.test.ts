import { describe, expect, it, vi } from "vitest";

import { reorderItems } from "@/lib/orders/reorder";
import type { OrderItemSnapshot } from "@/lib/orders/types";
import type { MenuCatalog } from "@/types/menu";
import type { AddCatalogSelectionResult, CartState } from "@/types/ordering";

const sampleCatalog: MenuCatalog = {
  categories: [
    {
      id: "coffee",
      name: "Coffee",
      items: [
        {
          id: "special-brew",
          name: "Brew Special Coffee",
          availability: "available",
          flavors: ["Caramel", "Hazelnut"],
          variants: [
            {
              id: "large-16",
              name: "16 oz",
              basePrice: 150,
              flavorPrices: [{ flavor: "Caramel", price: 160 }],
              description: null,
            },
          ],
        },
        {
          id: "matcha-latte",
          name: "Matcha Latte",
          availability: "available",
          flavors: [],
          variants: [
            {
              id: "medium-12",
              name: "12 oz",
              basePrice: 130, // Repriced from 120 to 130
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
              id: "tea-12",
              name: "12 oz",
              basePrice: 90,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

const emptyState: CartState = {
  lines: [],
  fulfillment: "pickup",
};

describe("Reorder logic (FR-041)", () => {
  it("TC-P5-010 — adds available order items at current menu price using addItem", () => {
    const addItemMock = vi.fn().mockReturnValue({
      ok: true,
      state: emptyState,
      lineKey: "special-brew::large-16::Caramel",
    } as AddCatalogSelectionResult);

    const items: OrderItemSnapshot[] = [
      {
        itemId: "special-brew",
        itemName: "Brew Special Coffee",
        variantId: "large-16",
        variantName: "16 oz",
        flavor: "Caramel",
        unitPrice: 160,
        quantity: 2,
        lineTotal: 320,
      },
    ];

    const result = reorderItems(items, sampleCatalog, addItemMock);

    expect(result.addedCount).toBe(1);
    expect(result.unavailableItems).toHaveLength(0);
    expect(result.priceChangedItems).toHaveLength(0);
    expect(result.successMessage).toBe("Added 1 item to your cart.");
    expect(addItemMock).toHaveBeenCalledWith(sampleCatalog, {
      itemId: "special-brew",
      variantId: "large-16",
      flavor: "Caramel",
      quantity: 2,
    });
  });

  it("TC-P5-011 — explicitly identifies unavailable items and does not add them silently", () => {
    const addItemMock = vi.fn();

    const items: OrderItemSnapshot[] = [
      {
        itemId: "seasonal-tea",
        itemName: "Seasonal Tea",
        variantId: "tea-12",
        variantName: "12 oz",
        flavor: null,
        unitPrice: 90,
        quantity: 1,
        lineTotal: 90,
      },
      {
        itemId: "discontinued-pastry",
        itemName: "Discontinued Pastry",
        variantId: "piece-1",
        variantName: "1 pc",
        flavor: null,
        unitPrice: 75,
        quantity: 1,
        lineTotal: 75,
      },
    ];

    const result = reorderItems(items, sampleCatalog, addItemMock);

    expect(result.addedCount).toBe(0);
    expect(result.unavailableItems).toHaveLength(2);
    expect(result.unavailableItems[0]?.itemName).toBe("Seasonal Tea");
    expect(result.unavailableItems[0]?.message).toContain(
      "currently marked unavailable",
    );
    expect(result.unavailableItems[1]?.itemName).toBe("Discontinued Pastry");
    expect(result.unavailableItems[1]?.message).toContain(
      "no longer on the menu",
    );
    expect(addItemMock).not.toHaveBeenCalled();
  });

  it("TC-P5-012 — explicitly alerts when an item's price changed and adds it at the current price", () => {
    const addItemMock = vi.fn().mockReturnValue({
      ok: true,
      state: emptyState,
      lineKey: "matcha-latte::medium-12::",
    } as AddCatalogSelectionResult);

    const items: OrderItemSnapshot[] = [
      {
        itemId: "matcha-latte",
        itemName: "Matcha Latte",
        variantId: "medium-12",
        variantName: "12 oz",
        flavor: null,
        unitPrice: 120, // Historical was 120, current menu is 130
        quantity: 1,
        lineTotal: 120,
      },
    ];

    const result = reorderItems(items, sampleCatalog, addItemMock);

    expect(result.addedCount).toBe(1);
    expect(result.priceChangedItems).toHaveLength(1);
    expect(result.priceChangedItems[0]?.previousPrice).toBe(120);
    expect(result.priceChangedItems[0]?.currentPrice).toBe(130);
    expect(result.priceChangedItems[0]?.message).toContain(
      "Price for Matcha Latte (12 oz) has changed from ₱120 to ₱130.",
    );
    expect(addItemMock).toHaveBeenCalledWith(sampleCatalog, {
      itemId: "matcha-latte",
      variantId: "medium-12",
      flavor: null,
      quantity: 1,
    });
  });

  it("TC-P5-013 — handles mixed orders with added, repriced, and unavailable items", () => {
    const addItemMock = vi.fn().mockReturnValue({
      ok: true,
      state: emptyState,
      lineKey: "mock-key",
    } as AddCatalogSelectionResult);

    const items: OrderItemSnapshot[] = [
      {
        itemId: "special-brew",
        itemName: "Brew Special Coffee",
        variantId: "large-16",
        variantName: "16 oz",
        flavor: "Caramel",
        unitPrice: 160,
        quantity: 1,
        lineTotal: 160,
      },
      {
        itemId: "matcha-latte",
        itemName: "Matcha Latte",
        variantId: "medium-12",
        variantName: "12 oz",
        flavor: null,
        unitPrice: 120, // repriced
        quantity: 1,
        lineTotal: 120,
      },
      {
        itemId: "seasonal-tea",
        itemName: "Seasonal Tea",
        variantId: "tea-12",
        variantName: "12 oz",
        flavor: null,
        unitPrice: 90, // unavailable
        quantity: 1,
        lineTotal: 90,
      },
    ];

    const result = reorderItems(items, sampleCatalog, addItemMock);

    expect(result.addedCount).toBe(2);
    expect(result.priceChangedItems).toHaveLength(1);
    expect(result.unavailableItems).toHaveLength(1);
    expect(result.notices).toHaveLength(2);
    expect(result.successMessage).toBe("Added 2 items to your cart.");
  });
});
