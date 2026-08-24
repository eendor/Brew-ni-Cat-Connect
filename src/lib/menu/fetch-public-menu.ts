import { mapMenuCatalog } from "@/lib/menu/map-menu-catalog";
import { getPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { CategoryRow, ItemRow, MenuCatalog } from "@/types/menu";

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

  if (signal) {
    categoriesQuery = categoriesQuery.abortSignal(signal);
    itemsQuery = itemsQuery.abortSignal(signal);
  }

  const [categoriesResult, itemsResult] = await Promise.all([
    categoriesQuery.returns<CategoryRow[]>(),
    itemsQuery.returns<ItemRow[]>(),
  ]);

  if (categoriesResult.error || itemsResult.error) {
    throw new PublicMenuRetrievalError();
  }

  return mapMenuCatalog(categoriesResult.data ?? [], itemsResult.data ?? []);
}
