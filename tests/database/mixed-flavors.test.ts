// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applyRollback, createMigratedDatabase } from "./support/database";
import { seedPosData } from "./support/pos-data";

const MIXED_FLAVORS_MIGRATION = "20261101120000_mixed_flavors.sql";
const THREE_FLAVOR_MIXES_MIGRATION = "20261105120000_three_flavor_mixes.sql";

type Priced = {
  problems: { index: number; reason: string }[];
  lines: { flavor: string | null; unitCentavos: number }[];
};

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await seedPosData(db);
  await db.exec(`
    insert into public.categories (id, name) values ('bites', 'Cat-Tastic Bites');
    insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
      ('fries', 'bites', 'Fries', 'BBQ Scratch|Cheesy Purr|Sour Cream|Spicy Claw',
       '[{"id":"fries-m","name":"Medium","basePrice":50}]', true),
      ('soda', 'bites', 'Loaded Fries', 'Yogurt Yarn|Honey Peach Paws|Lychee',
       '[{"id":"soda-12","name":"12oz","basePrice":0,"priceByFlavor":{"Yogurt Yarn":39,"Honey Peach Paws":45}}]', true);
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

// Runs before the TC-P4-256 cases, which undo the older mixed flavors migration.
describe("3-flavor fries mixes in the database (TC-P6-220)", () => {
  const three = "BBQ Scratch / Cheesy Purr / Sour Cream";

  it("prices a 3-flavor fries mix at the size price and refuses 4", async () => {
    const mix = await price("fries", "fries-m", three);
    expect(mix.problems).toEqual([]);
    expect(mix.lines[0]).toMatchObject({ flavor: three, unitCentavos: 5000 });
    expect(
      (await price("fries", "fries-m", `${three} / Spicy Claw`)).problems[0]
        ?.reason,
    ).toBe("unknown-flavor");
    expect(
      (
        await price(
          "soda",
          "soda-12",
          "Yogurt Yarn / Honey Peach Paws / Lychee",
        )
      ).problems[0]?.reason,
    ).toBe("missing-price");
  });

  it("goes back to 2 flavors after its rollback", async () => {
    await applyRollback(db, THREE_FLAVOR_MIXES_MIGRATION);
    expect((await price("fries", "fries-m", three)).problems[0]?.reason).toBe(
      "unknown-flavor",
    );
    expect(
      (await price("fries", "fries-m", "BBQ Scratch / Cheesy Purr")).problems,
    ).toEqual([]);
  });
});

describe("mixed flavors in the database (TC-P4-256)", () => {
  it("prices a 2-flavor mix like the website", async () => {
    const fries = await price("fries", "fries-m", "BBQ Scratch / Cheesy Purr");
    expect(fries.problems).toEqual([]);
    expect(fries.lines[0]).toMatchObject({
      flavor: "BBQ Scratch / Cheesy Purr",
      unitCentavos: 5000,
    });

    const soda = await price(
      "soda",
      "soda-12",
      "Yogurt Yarn / Honey Peach Paws",
    );
    expect(soda.lines[0]?.unitCentavos).toBe(4500);
    expect(
      (await price("soda", "soda-12", "Yogurt Yarn")).lines[0]?.unitCentavos,
    ).toBe(3900);
  });

  it("rejects repeated, unlisted, too many and unpriced flavors", async () => {
    for (const flavor of [
      "BBQ Scratch / BBQ Scratch",
      "BBQ Scratch / Truffle",
      "BBQ Scratch / Cheesy Purr / Sour Cream / Spicy Claw",
    ]) {
      expect(
        (await price("fries", "fries-m", flavor)).problems[0]?.reason,
      ).toBe("unknown-flavor");
    }
    expect(
      (await price("soda", "soda-12", "Yogurt Yarn / Lychee")).problems[0]
        ?.reason,
    ).toBe("missing-price");
  });

  it("goes back to single flavors after the rollback", async () => {
    await applyRollback(db, MIXED_FLAVORS_MIGRATION);
    expect(
      (await price("fries", "fries-m", "BBQ Scratch / Cheesy Purr")).problems[0]
        ?.reason,
    ).toBe("unknown-flavor");
    expect((await price("fries", "fries-m", "BBQ Scratch")).problems).toEqual(
      [],
    );
  });
});
