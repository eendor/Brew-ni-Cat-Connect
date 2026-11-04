// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { CategoryRow, ItemRow } from "@/types/menu";

const getPublicSupabaseClient = vi.hoisted(() => vi.fn());
const getServerReadClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/public-client", () => ({ getPublicSupabaseClient }));
vi.mock("@/lib/supabase/server-read-client", () => ({ getServerReadClient }));

import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { loadMenuFacts } from "@/lib/menu/load-menu-facts";
import {
  isShopOnlyName,
  mapMenuCatalog,
  websiteMenu,
} from "@/lib/menu/map-menu-catalog";

const item = (
  id: string,
  categoryId: string,
  name: string,
  price: number,
): ItemRow => ({
  id,
  category_id: categoryId,
  name,
  flavors: null,
  variants_json: [{ id: `${id}-regular`, name: "Regular", basePrice: price }],
  is_available: true,
});

/** The POS menu as the database has it, with both shop-only categories. */
const categories: readonly CategoryRow[] = [
  { id: "bites", name: "Cat-Tastic Bites" },
  { id: "box", name: "Take-out Box" },
  { id: "treats", name: "Cat Treats" },
];
const items: readonly ItemRow[] = [
  item("nachos", "bites", "Nachos (Kitty Litter Crisps)", 99),
  item("box", "box", "Take-out Box", 10),
  item("treats", "treats", "Cat Treats", 5),
];

/** A stand-in Supabase client that answers every menu read with the rows. */
function menuClient() {
  const answer = (data: readonly unknown[]) => {
    const query = {
      select: () => query,
      order: () => query,
      eq: () => query,
      abortSignal: () => query,
      returns: async () => ({ data, error: null }),
    };
    return query;
  };
  return {
    from: (table: string) =>
      answer(
        table === "categories" ? categories : table === "items" ? items : [],
      ),
  };
}

const names = (catalog: ReturnType<typeof mapMenuCatalog>) =>
  catalog.categories.map((category) => [
    category.name,
    category.items.map((entry) => entry.name),
  ]);

describe("The website menu leaves out what is sold only at the shop", () => {
  it("TC-P6-214 — the take-out box and cat treats are left out however they are spelled", () => {
    for (const name of [
      "Take-out Box",
      "takeout box",
      " TAKE OUT BOX ",
      "Cat Treats",
      "cat-treats",
    ]) {
      expect(isShopOnlyName(name), name).toBe(true);
    }
    for (const name of ["Cat-Tastic Bites", "Box Combo", "Treats for Two"]) {
      expect(isShopOnlyName(name), name).toBe(false);
    }

    const catalog = mapMenuCatalog(
      [
        { id: "drinks", name: "Cat-Tastic Drinks" },
        { id: "extras", name: "Extras" },
        { id: "packaging", name: "Packaging" },
        { id: "treats", name: "CAT TREATS" },
      ],
      [
        item("matcha", "drinks", "Matcha (The Lucky Green Neko)", 59),
        item("fries", "extras", "Fries (Cat Claws)", 30),
        item("box", "extras", "Takeout box", 10),
        item("box-2", "packaging", "Take-out Box", 10),
        item("salmon", "treats", "Salmon Bites", 5),
      ],
    );

    expect(names(websiteMenu(catalog))).toEqual([
      ["Cat-Tastic Drinks", ["Matcha (The Lucky Green Neko)"]],
      ["Extras", ["Fries (Cat Claws)"]],
      // the Menu page already leaves out a category with no items
      ["Packaging", []],
    ]);
    // the full catalog itself is unchanged
    expect(names(catalog)).toContainEqual(["CAT TREATS", ["Salmon Bites"]]);
  });

  it("TC-P6-215 — the Menu, cart and reorder read leaves both out, while the takeout box fee still comes from the POS item", async () => {
    getPublicSupabaseClient.mockReturnValue(menuClient());
    getServerReadClient.mockReturnValue(menuClient());

    expect(names(await fetchPublicMenu())).toEqual([
      ["Cat-Tastic Bites", ["Nachos (Kitty Litter Crisps)"]],
    ]);
    // the checkout and Contact page text reads the full menu (FR-084)
    expect((await loadMenuFacts()).takeoutBoxPrice).toBe(10);
  });
});
