// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  type Actor,
  applyMigration,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";
import { seedPosData } from "./support/pos-data";

const ITEM_ICON_MIGRATION = "20261031120000_item_icon_and_image.sql";
const CHECK_VIOLATION = "23514";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const STAFF_ACTOR: Actor = signedIn(STAFF);
const CUSTOMER_ACTOR: Actor = signedIn(CUSTOMER);

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await seedPosData(db);
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("public.items icon and image_url columns (FR-093)", () => {
  it("TC-P4-243 — existing items start with null icon and image_url, and everyone can read them", async () => {
    for (const actor of [ANON, CUSTOMER_ACTOR, STAFF_ACTOR]) {
      const res = await runAs<{
        id: string;
        icon: string | null;
        image_url: string | null;
      }>(db, actor, "select id, icon, image_url from public.items order by id");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.rows.length).toBeGreaterThan(0);
        for (const row of res.rows) {
          expect(row.icon).toBeNull();
          expect(row.image_url).toBeNull();
        }
      }
    }
  });

  it("TC-P4-244 — staff can set and clear icon and image_url on existing and new items", async () => {
    const updateRes = await commitAs(
      db,
      STAFF_ACTOR,
      `update public.items
       set icon = 'cup_soda',
           image_url = '/images/menu/matcha-series.webp'
       where id = 'latte'`,
    );
    expect(updateRes).toMatchObject({ ok: true, affectedRows: 1 });

    const insertRes = await commitAs(
      db,
      STAFF_ACTOR,
      `insert into public.items (id, category_id, name, flavors, variants_json, is_available, icon, image_url)
       values ('drink_strawberry_milk', 'coffee', 'Strawberry Milk', '', '[{"id":"sm_16","name":"16oz","basePrice":95}]', true, 'milk', 'https://example.com/menu/strawberry-milk.webp')`,
    );
    expect(insertRes).toMatchObject({ ok: true, affectedRows: 1 });

    const readBack = await runAs<{
      id: string;
      icon: string | null;
      image_url: string | null;
    }>(
      db,
      ANON,
      `select id, icon, image_url
       from public.items
       where id in ('latte', 'drink_strawberry_milk')
       order by id`,
    );
    expect(readBack).toMatchObject({
      ok: true,
      rows: [
        {
          id: "drink_strawberry_milk",
          icon: "milk",
          image_url: "https://example.com/menu/strawberry-milk.webp",
        },
        {
          id: "latte",
          icon: "cup_soda",
          image_url: "/images/menu/matcha-series.webp",
        },
      ],
    });

    const clearRes = await commitAs(
      db,
      STAFF_ACTOR,
      `update public.items
       set icon = null, image_url = null
       where id = 'latte'`,
    );
    expect(clearRes).toMatchObject({ ok: true, affectedRows: 1 });
  });

  it("TC-P4-245 — visitors and signed-in customers cannot modify icon or image_url", async () => {
    const anonRes = await runAs(
      db,
      ANON,
      "update public.items set icon = 'coffee' where id = 'latte'",
    );
    expect(anonRes).toMatchObject({
      ok: false,
      code: INSUFFICIENT_PRIVILEGE,
    });

    const custRes = await runAs(
      db,
      CUSTOMER_ACTOR,
      "update public.items set icon = 'coffee' where id = 'latte'",
    );
    expect(custRes).toMatchObject({ ok: true, affectedRows: 0 });
  });

  it.each([
    { column: "icon", label: "empty string", value: "" },
    { column: "icon", label: "uppercase letters", value: "Coffee" },
    { column: "icon", label: "hyphenated key", value: "cup-soda" },
    { column: "icon", label: "spaces", value: "cup soda" },
    { column: "icon", label: "over 40 characters", value: "a".repeat(41) },
    { column: "image_url", label: "empty string", value: "" },
    {
      column: "image_url",
      label: "http instead of https",
      value: "http://example.com/item.webp",
    },
    {
      column: "image_url",
      label: "local path outside /images/",
      value: "/assets/item.webp",
    },
    {
      column: "image_url",
      label: "path traversal",
      value: "/images/../secret.webp",
    },
    {
      column: "image_url",
      label: "double slash in local path",
      value: "/images//menu/item.webp",
    },
    {
      column: "image_url",
      label: "unsupported file extension on local path",
      value: "/images/menu/item.exe",
    },
    {
      column: "image_url",
      label: "over 500 characters",
      value: `https://example.com/${"a".repeat(490)}.webp`,
    },
  ])(
    "TC-P4-246 — invalid $column ($label) is refused with check_violation",
    async ({ column, value }) => {
      const res = await runAs(
        db,
        STAFF_ACTOR,
        `update public.items set ${column} = $1 where id = 'latte'`,
        [value],
      );
      expect(res).toMatchObject({
        ok: false,
        code: CHECK_VIOLATION,
      });
    },
  );

  it("TC-P4-247 — the rollback script drops icon and image_url cleanly and the migration re-applies", async () => {
    const fresh = await createMigratedDatabase(ITEM_ICON_MIGRATION);
    await seedPosData(fresh);

    await applyRollback(fresh, ITEM_ICON_MIGRATION);
    const colsAfterRollback = await fresh.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'items'
         and column_name in ('icon', 'image_url')`,
    );
    expect(colsAfterRollback.rows).toEqual([]);

    const itemCount = await fresh.query<{ count: number }>(
      "select count(*)::int as count from public.items",
    );
    expect(itemCount.rows[0]?.count).toBeGreaterThan(0);

    await applyMigration(fresh, ITEM_ICON_MIGRATION);
    const colsAfterReapply = await fresh.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'items'
         and column_name in ('icon', 'image_url')
       order by column_name`,
    );
    expect(colsAfterReapply.rows).toEqual([
      { column_name: "icon" },
      { column_name: "image_url" },
    ]);
    await fresh.close();
  }, 60_000);
});
