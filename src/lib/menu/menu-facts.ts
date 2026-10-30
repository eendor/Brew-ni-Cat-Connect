import type { MenuCatalog, MenuItem } from "@/types/menu";

import { getItemPrices, getLowestItemPrice } from "./format-price";

/** Lowercase with single spaces, for matching names. */
const normalize = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

/** "Fries (Cat Claws)" answers to "fries" and "cat claws". */
function namesOf(item: MenuItem) {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(item.name.trim());
  return match
    ? [normalize(match[1] ?? ""), normalize(match[2] ?? "")]
    : [normalize(item.name)];
}

/** The first item whose name or nickname is one of `names`, exactly. */
export function findMenuItem(
  catalog: MenuCatalog,
  names: readonly string[],
): MenuItem | null {
  const wanted = new Set(names.map(normalize));
  for (const category of catalog.categories) {
    for (const item of category.items) {
      if (namesOf(item).some((name) => wanted.has(name))) return item;
    }
  }
  return null;
}

/** The lowest price an item is sold at, or null when it has none. */
export const lowestPrice = (item: MenuItem | null) =>
  item ? getLowestItemPrice(getItemPrices(item)) : null;

/**
 * The takeout box is an item on the POS menu, so its price is the owner's
 * (FR-084): the "Take-out Box" item, however it is spelled.
 */
export function findTakeoutBoxPrice(catalog: MenuCatalog): number | null {
  const compact = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
  for (const category of catalog.categories) {
    for (const item of category.items) {
      if (compact(item.name) === "takeoutbox") return lowestPrice(item);
    }
  }
  return null;
}
