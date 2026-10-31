// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANON,
  applyRollback,
  createMigratedDatabase,
  runAs,
} from "./support/database";
import { seedPosData } from "./support/pos-data";

const MENU_ADD_ONS_MIGRATION = "20261101130000_menu_add_ons.sql";

type Priced = {
  problems: { index: number; reason: string }[];
  lines: { flavor: string | null; unitCentavos: number }[];
};

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await seedPosData(db);
  await db.exec(`
    insert into public.categories (id, name) values ('noodles', 'Buldak & Sedaap'), ('bites', 'Bites');
    insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
      ('sedaap_spicy', 'noodles', 'Sedaap Spicy Chicken', '1 Paw (Mild)|2 Paws (Medium)',
       '[{"id":"regular","name":"Regular","basePrice":69}]', true),
      ('buldak_carbo', 'noodles', 'Buldak Carbo', '',
       '[{"id":"carbo_milk","name":"Carbo Samyang w/ Milk","basePrice":129}]', true),
      ('bite_fries', 'bites', 'Fries', 'BBQ|Cheesy',
       '[{"id":"small","name":"Small","basePrice":30}]', true);
    insert into public.menu_add_ons (id, category_id, label, price, sort_order, is_available) values
      ('egg_boiled', 'noodles', 'Egg (Boiled)', 15, 1, true),
      ('hotdog', 'noodles', 'Hotdog', 20, 2, true),
      ('seaweed', 'noodles', '3pcs Seaweed', 25, 3, false);
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

async function price(
  itemId: string,
  variantId: string,
  flavor: string,
): Promise<Priced> {
  const lines = JSON.stringify([{ itemId, variantId, flavor, quantity: 1 }]);
  const result = await db.query<{ priced: Priced }>(
    "select private.price_cart($1::jsonb) as priced",
    [lines],
  );
  const priced = result.rows[0]?.priced;
  if (!priced) throw new Error("price_cart returned nothing");
  return priced;
}

describe("noodle add-ons in the database (TC-P4-259)", () => {
  it("lets visitors read add-ons", async () => {
    const rows = await runAs(
      db,
      ANON,
      "select label from public.menu_add_ons order by sort_order",
    );
    expect(rows.ok ? rows.rows.length : -1).toBe(3);
  });

  it("charges add-ons on top of the size price, like the website", async () => {
    const carbo = await price("buldak_carbo", "carbo_milk", "+ Egg (Boiled)");
    expect(carbo.problems).toEqual([]);
    expect(carbo.lines[0]).toMatchObject({
      flavor: "+ Egg (Boiled)",
      unitCentavos: 14400,
    });
    const sedaap = await price(
      "sedaap_spicy",
      "regular",
      "2 Paws (Medium) + Egg (Boiled), Hotdog",
    );
    expect(sedaap.lines[0]?.unitCentavos).toBe(10400);
  });

  it("rejects unknown, repeated, unavailable and other-category add-ons", async () => {
    for (const [item, variant, flavor] of [
      ["sedaap_spicy", "regular", "+ Cheese"],
      ["sedaap_spicy", "regular", "+ Hotdog, Hotdog"],
      ["sedaap_spicy", "regular", "+ 3pcs Seaweed"],
      ["bite_fries", "small", "BBQ + Hotdog"],
    ] as const) {
      expect((await price(item, variant, flavor)).problems[0]?.reason).toBe(
        "unknown-flavor",
      );
    }
  });

  it("allows mixing on fries only", async () => {
    expect(
      (await price("bite_fries", "small", "BBQ / Cheesy")).problems,
    ).toEqual([]);
    expect(
      (await price("sedaap_spicy", "regular", "1 Paw (Mild) / 2 Paws (Medium)"))
        .problems[0]?.reason,
    ).toBe("unknown-flavor");
  });

  it("drops the table and add-on pricing after the rollback", async () => {
    await applyRollback(db, MENU_ADD_ONS_MIGRATION);
    const exists = await db.query<{ t: string | null }>(
      "select to_regclass('public.menu_add_ons')::text as t",
    );
    expect(exists.rows[0]?.t).toBeNull();
    expect(
      (await price("sedaap_spicy", "regular", "1 Paw (Mild)")).problems,
    ).toEqual([]);
  });
});
