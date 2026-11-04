/**
 * Customer reorder logic (Phase 5, FR-041).
 *
 * Adds historical order items to the cart using `addItem` at current menu prices.
 * Explicitly identifies items that are unavailable or whose prices have changed
 * rather than adding them silently with wrong/outdated prices.
 */

import { formatPrice } from "@/lib/menu/format-price";
import {
  findCatalogItem,
  findCatalogVariant,
  resolveVariantUnitPrice,
} from "@/lib/ordering/cart-pricing";
import type { OrderItemSnapshot } from "@/lib/orders/types";
import type { MenuCatalog } from "@/types/menu";
import type {
  AddCatalogSelectionResult,
  CartItemSelection,
} from "@/types/ordering";

export type ReorderNoticeType = "unavailable" | "price-changed";

export type ReorderNotice = Readonly<{
  type: ReorderNoticeType;
  itemId: string;
  itemName: string;
  variantId: string;
  variantName: string;
  flavor: string | null;
  previousPrice: number;
  currentPrice?: number;
  message: string;
}>;

export type ReorderSummary = Readonly<{
  addedCount: number;
  addedItems: readonly OrderItemSnapshot[];
  unavailableItems: readonly ReorderNotice[];
  priceChangedItems: readonly ReorderNotice[];
  notices: readonly ReorderNotice[];
  successMessage: string | null;
}>;

export type AddItemFn = (
  catalog: MenuCatalog,
  selection: CartItemSelection,
) => AddCatalogSelectionResult;

export function reorderItems(
  items: readonly OrderItemSnapshot[],
  catalog: MenuCatalog,
  addItem: AddItemFn,
): ReorderSummary {
  const addedItems: OrderItemSnapshot[] = [];
  const unavailableItems: ReorderNotice[] = [];
  const priceChangedItems: ReorderNotice[] = [];

  for (const item of items) {
    const catalogItem = findCatalogItem(catalog, item.itemId);
    if (!catalogItem) {
      unavailableItems.push({
        type: "unavailable",
        itemId: item.itemId,
        itemName: item.itemName,
        variantId: item.variantId,
        variantName: item.variantName,
        flavor: item.flavor,
        previousPrice: item.unitPrice,
        message: `${item.itemName} (${item.variantName}) is no longer on the menu and could not be added.`,
      });
      continue;
    }

    if (catalogItem.availability !== "available") {
      unavailableItems.push({
        type: "unavailable",
        itemId: item.itemId,
        itemName: item.itemName,
        variantId: item.variantId,
        variantName: item.variantName,
        flavor: item.flavor,
        previousPrice: item.unitPrice,
        message: `${item.itemName} is currently marked unavailable and could not be added.`,
      });
      continue;
    }

    const catalogVariant = findCatalogVariant(catalogItem, item.variantId);
    if (!catalogVariant) {
      unavailableItems.push({
        type: "unavailable",
        itemId: item.itemId,
        itemName: item.itemName,
        variantId: item.variantId,
        variantName: item.variantName,
        flavor: item.flavor,
        previousPrice: item.unitPrice,
        message: `${item.itemName} (${item.variantName}) size or option is no longer available.`,
      });
      continue;
    }

    const priceResolution = resolveVariantUnitPrice(
      catalogItem,
      catalogVariant,
      item.flavor,
    );
    if (!priceResolution.ok) {
      unavailableItems.push({
        type: "unavailable",
        itemId: item.itemId,
        itemName: item.itemName,
        variantId: item.variantId,
        variantName: item.variantName,
        flavor: item.flavor,
        previousPrice: item.unitPrice,
        message: `${item.itemName} (${item.variantName}${item.flavor ? ` - ${item.flavor}` : ""}) cannot be priced currently.`,
      });
      continue;
    }

    const currentPrice = priceResolution.unitPrice;
    if (currentPrice !== item.unitPrice) {
      priceChangedItems.push({
        type: "price-changed",
        itemId: item.itemId,
        itemName: item.itemName,
        variantId: item.variantId,
        variantName: item.variantName,
        flavor: item.flavor,
        previousPrice: item.unitPrice,
        currentPrice,
        message: `Price for ${item.itemName} (${item.variantName}) has changed from ${formatPrice(item.unitPrice)} to ${formatPrice(currentPrice)}.`,
      });
    }

    const addResult = addItem(catalog, {
      itemId: item.itemId,
      variantId: item.variantId,
      flavor: item.flavor,
      quantity: item.quantity,
    });

    if (addResult.ok) {
      addedItems.push(item);
    } else {
      unavailableItems.push({
        type: "unavailable",
        itemId: item.itemId,
        itemName: item.itemName,
        variantId: item.variantId,
        variantName: item.variantName,
        flavor: item.flavor,
        previousPrice: item.unitPrice,
        currentPrice,
        message: `${item.itemName} (${item.variantName}): ${addResult.message}`,
      });
    }
  }

  const notices = [...unavailableItems, ...priceChangedItems];
  const addedQuantity = addedItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const successMessage =
    addedQuantity > 0
      ? `Added ${addedQuantity} item${addedQuantity === 1 ? "" : "s"} to your cart.`
      : null;

  return {
    addedCount: addedItems.length,
    addedItems,
    unavailableItems,
    priceChangedItems,
    notices,
    successMessage,
  };
}
