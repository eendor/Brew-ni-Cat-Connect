import { mapMenuCatalog, websiteMenu } from "@/lib/menu/map-menu-catalog";
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

  let dealsQuery = client
    .from("menu_deals")
    .select("item_id, percent_off")
    .eq("active", true);
  if (signal) dealsQuery = dealsQuery.abortSignal(signal);
  const [categoriesResult, itemsResult, addOnsResult, dealsResult] =
    await Promise.all([
      categoriesQuery.returns<CategoryRow[]>(),
      itemsQuery.returns<ItemRow[]>(),
      addOnsQuery.returns<AddOnRow[]>(),
      dealsQuery.returns<{ item_id: string; percent_off: number }[]>(),
    ]);

  if (categoriesResult.error || itemsResult.error) {
    throw new PublicMenuRetrievalError();
  }

  // Add-ons are extras: if they can't load, the menu still shows without them.
  // The website doesn't list the shop-only take-out box and cat treats, so the
  // menu, cart and reorder all work from the same list.
  const catalog = websiteMenu(
    mapMenuCatalog(
      categoriesResult.data ?? [],
      itemsResult.data ?? [],
      addOnsResult.error ? [] : (addOnsResult.data ?? []),
    ),
  );
  const deals = new Map(
    (dealsResult.data ?? [])
      .filter(
        ({ percent_off }) =>
          Number.isInteger(percent_off) &&
          percent_off >= 1 &&
          percent_off <= 99,
      )
      .map(({ item_id, percent_off }) => [item_id, percent_off]),
  );
  if (deals.size === 0) return catalog;
  return {
    categories: catalog.categories.map((category) => ({
      ...category,
      items: category.items.map((item) => {
        const dealPercent = deals.get(item.id);
        return dealPercent === undefined ? item : { ...item, dealPercent };
      }),
    })),
  };
}
