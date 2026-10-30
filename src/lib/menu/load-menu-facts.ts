import { cache } from "react";

import {
  showcaseItems,
  type ShowcaseId,
  type ShowcasePrices,
} from "@/components/three/showcase-data";
import { getServerReadClient } from "@/lib/supabase/server-read-client";
import type { CategoryRow, ItemRow, MenuCatalog } from "@/types/menu";

import { mapMenuCatalog } from "./map-menu-catalog";
import { findMenuItem, findTakeoutBoxPrice, lowestPrice } from "./menu-facts";

/** Server only: menu prices that pages outside the Menu page show. */

export type MenuFacts = Readonly<{
  takeoutBoxPrice: number | null;
  /** The lowest price of each home showcase item. */
  showcasePrices: ShowcasePrices;
}>;

async function readCatalog(): Promise<MenuCatalog | null> {
  const client = getServerReadClient();
  if (!client) return null;
  const [categories, items] = await Promise.all([
    client.from("categories").select("id, name").returns<CategoryRow[]>(),
    client
      .from("items")
      .select("id, category_id, name, flavors, variants_json, is_available")
      .returns<ItemRow[]>(),
  ]);
  if (categories.error || items.error) return null;
  return mapMenuCatalog(categories.data ?? [], items.data ?? []);
}

/**
 * Prices come only from the live menu. When it can't be read they are null
 * and pages leave the price out rather than show an old one.
 */
export async function loadMenuFacts(
  read: () => Promise<MenuCatalog | null> = readCatalog,
): Promise<MenuFacts> {
  let catalog: MenuCatalog | null = null;
  try {
    catalog = await read();
  } catch {
    catalog = null;
  }

  const showcasePrices = Object.fromEntries(
    showcaseItems.map((item) => [
      item.id,
      catalog ? lowestPrice(findMenuItem(catalog, item.menuNames)) : null,
    ]),
  ) as Record<ShowcaseId, number | null>;

  return {
    takeoutBoxPrice: catalog ? findTakeoutBoxPrice(catalog) : null,
    showcasePrices,
  };
}

/** One read per render, shared by the layout and the page. */
export const getMenuFacts = cache(() => loadMenuFacts());
