import { mapMenuCatalog } from "@/lib/menu/map-menu-catalog";
import { getPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { AddOnRow, CategoryRow, ItemRow, MenuCatalog } from "@/types/menu";

export class PublicMenuRetrievalError extends Error {
  constructor() {
    super("The current menu could not be retrieved.");
    this.name = "PublicMenuRetrievalError";
  }
}

export async function fetchPublicMenu(
  signal?: AbortSignal,
): Promise<MenuCatalog> {
  const client = getPublicSupabaseClient();

  let categoriesQuery = client
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });
  let itemsQuery = client
    .from("items")
    .select("id, category_id, name, flavors, variants_json, is_available")
    .order("name", { ascending: true });

  let addOnsQuery = client
    .from("menu_add_ons")
    .select("id, category_id, label, price, sort_order")
    .eq("is_available", true);

  if (signal) {
    categoriesQuery = categoriesQuery.abortSignal(signal);
    itemsQuery = itemsQuery.abortSignal(signal);
    addOnsQuery = addOnsQuery.abortSignal(signal);
  }

  const [categoriesResult, itemsResult, addOnsResult] = await Promise.all([
    categoriesQuery.returns<CategoryRow[]>(),
    itemsQuery.returns<ItemRow[]>(),
    addOnsQuery.returns<AddOnRow[]>(),
  ]);

  if (categoriesResult.error || itemsResult.error) {
    throw new PublicMenuRetrievalError();
  }

  // Add-ons are extras: if they can't load, the menu still shows without them.
  return mapMenuCatalog(
    categoriesResult.data ?? [],
    itemsResult.data ?? [],
    addOnsResult.error ? [] : (addOnsResult.data ?? []),
  );
}
