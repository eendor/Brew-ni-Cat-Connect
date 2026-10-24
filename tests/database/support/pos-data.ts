/**
 * Sample POS rows for database tests, in the shapes the POS saves them.
 */

import type { PGlite } from "@electric-sql/pglite";

/** Rows `seedPosData` adds to each table. */
export const SEEDED_ROWS = {
  categories: 2,
  items: 3,
  orders: 2,
  order_items: 3,
  inventory: 2,
  recipe_mappings: 2,
  expenses: 1,
  app_release: 1,
} as const;

export type PosTable = keyof typeof SEEDED_ROWS;

export const POS_TABLES = Object.keys(SEEDED_ROWS) as readonly PosTable[];

/** Add the sample rows as the table owner, which RLS does not limit. */
export async function seedPosData(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.categories (id, name) values
      ('coffee', 'Coffee'),
      ('pastries', 'Pastries');

    insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
      ('latte', 'coffee', 'Latte', '',
       '[{"id":"latte-16","name":"16 oz","basePrice":120}]', true),
      ('croissant', 'pastries', 'Croissant', '',
       '[{"id":"croissant-1","name":"Regular","basePrice":85}]', true),
      ('mocha', 'coffee', 'Mocha', '',
       '[{"id":"mocha-16","name":"16 oz","basePrice":130}]', false);

    insert into public.orders
      (id, device_id, "timestamp", subtotal, discount_deduction, discount_label, total, payment_method)
    values
      (1001, 'pos-1', 1761264000000, 205, 0, '', 205, 'Cash'),
      (1002, 'pos-1', 1761267600000, 120, 0, '', 120, 'GCash');

    insert into public.order_items
      (id, order_id, item_id, item_name, variant_id, variant_name, quantity, unit_price, total_price)
    values
      (1, 1001, 'latte', 'Latte', 'latte-16', '16 oz', 1, 120, 120),
      (2, 1001, 'croissant', 'Croissant', 'croissant-1', 'Regular', 1, 85, 85),
      (3, 1002, 'latte', 'Latte', 'latte-16', '16 oz', 1, 120, 120);

    insert into public.inventory (id, item_name, unit, current_stock, reorder_threshold) values
      ('milk', 'Fresh milk', 'ml', 5000, 1000),
      ('beans', 'Espresso beans', 'g', 2000, 500);

    insert into public.recipe_mappings
      (id, menu_item_id, size_variant_name, inventory_item_id, deduction_quantity)
    values
      ('latte-16-milk', 'latte', '16 oz', 'milk', 250),
      ('latte-16-beans', 'latte', '16 oz', 'beans', 18);

    insert into public.expenses (id, "timestamp", description, amount) values
      ('expense-1', 1761264000000, 'Ice', 150);

    insert into public.app_release (version_code, version_name, apk_url, mandatory) values
      (10135, '1.1.0', 'https://example.com/BrewNiCatPOS.apk', false);
  `);
}

type WriteStatements = Readonly<{
  insert: string;
  update: string;
  delete: string;
}>;

/**
 * One insert, update and delete per table, like the POS sync and the POS web
 * dashboard send. Each update and delete touches exactly one seeded row.
 */
export const POS_WRITES: Readonly<Record<PosTable, WriteStatements>> = {
  categories: {
    insert: "insert into public.categories (id, name) values ('tea', 'Tea')",
    update:
      "update public.categories set name = 'Coffee drinks' where id = 'coffee'",
    delete: "delete from public.categories where id = 'pastries'",
  },
  items: {
    insert:
      "insert into public.items (id, category_id, name) values ('americano', 'coffee', 'Americano')",
    update: "update public.items set is_available = false where id = 'latte'",
    delete: "delete from public.items where id = 'croissant'",
  },
  orders: {
    insert: `insert into public.orders
      (id, device_id, "timestamp", subtotal, discount_deduction, discount_label, total, payment_method)
      values (1003, 'pos-2', 1761271200000, 85, 0, '', 85, 'Cash')`,
    update: "update public.orders set is_served = true where id = 1001",
    delete: "delete from public.orders where id = 1002",
  },
  order_items: {
    insert: `insert into public.order_items
      (id, order_id, item_id, item_name, variant_id, variant_name, quantity, unit_price, total_price)
      values (4, 1002, 'croissant', 'Croissant', 'croissant-1', 'Regular', 1, 85, 85)`,
    update:
      "update public.order_items set quantity = 2, total_price = 240 where id = 3",
    delete: "delete from public.order_items where id = 2",
  },
  inventory: {
    insert:
      "insert into public.inventory (id, item_name, unit) values ('cups', 'Paper cups', 'pcs')",
    update:
      "update public.inventory set current_stock = 4750 where id = 'milk'",
    delete: "delete from public.inventory where id = 'beans'",
  },
  recipe_mappings: {
    insert: `insert into public.recipe_mappings (id, menu_item_id, inventory_item_id, deduction_quantity)
      values ('croissant-1-milk', 'croissant', 'milk', 10)`,
    update:
      "update public.recipe_mappings set deduction_quantity = 20 where id = 'latte-16-beans'",
    delete: "delete from public.recipe_mappings where id = 'latte-16-milk'",
  },
  expenses: {
    insert: `insert into public.expenses (id, "timestamp", description, amount)
      values ('expense-2', 1761267600000, 'Sugar', 95)`,
    update:
      "update public.expenses set is_deleted = true where id = 'expense-1'",
    delete: "delete from public.expenses where id = 'expense-1'",
  },
  app_release: {
    insert: `insert into public.app_release (version_code, version_name, apk_url)
      values (10136, '1.1.1', 'https://example.com/BrewNiCatPOS.apk')`,
    update:
      "update public.app_release set mandatory = true where version_code = 10135",
    delete: "delete from public.app_release where version_code = 10135",
  },
};
