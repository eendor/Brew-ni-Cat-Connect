// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  applyMigration,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const MIGRATION = "20261119120000_item_ratings.sql";

const BUYER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const PENDING_BUYER = "44444444-4444-4444-8444-444444444444";

let db: PGlite;
let orderCounter = 0;

/** Save an order with these items as the table owner, then set its status. */
async function addOrder(
  customerId: string,
  status: string,
  items: ReadonlyArray<readonly [string, string]>,
): Promise<void> {
  orderCounter += 1;
  const reference = `BNC-RATE${"23456789ABCDEFGHJKMNPQRSTUVWXYZ"[orderCounter % 31]}${"23456789"[orderCounter % 8]}`;
  const topic = `order:${"r".repeat(20)}${orderCounter.toString().padStart(2, "0")}`;
  const result = await db.query<{ id: string }>(
    `insert into public.online_orders
       (reference, customer_id, customer_name, customer_phone, payment_preference,
        subtotal, item_count, idempotency_key, realtime_topic, status)
     values ($1, $2, 'Test Buyer', '+639123456789', 'Cash', 100, $3,
             gen_random_uuid(), $4, $5)
     returning id`,
    [reference, customerId, items.length, topic, status],
  );
  const id = result.rows[0]?.id;
  for (const [index, [itemId, itemName]] of items.entries()) {
    await db.query(
      `insert into public.online_order_items
         (order_id, line_number, item_id, item_name, variant_id, variant_name,
          unit_price, quantity, line_total)
       values ($1, $2, $3, $4, 'v', 'Regular', 10, 1, 10)`,
      [id, index + 1, itemId, itemName],
    );
  }
}

const rate = (userId: string, itemId: string, rating: number) =>
  commitAs<{ result: { ok: boolean; error?: string } }>(
    db,
    signedIn(userId),
    "select public.rate_item($1, $2) as result",
    [itemId, rating],
  );

async function rateResult(userId: string, itemId: string, rating: number) {
  const outcome = await rate(userId, itemId, rating);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]?.result;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(`
    insert into public.categories (id, name) values
      ('coffee', 'Coffee'), ('cat-treats', 'Cat Treats'), ('extras', 'Extras');
    insert into public.items (id, category_id, name) values
      ('latte', 'coffee', 'Latte'),
      ('mocha', 'coffee', 'Mocha'),
      ('tuna-bites', 'cat-treats', 'Tuna Bites'),
      ('box', 'extras', 'Take-out Box'),
      ('water', 'extras', 'Bottled water');
  `);
  for (const id of [BUYER, OTHER, PENDING_BUYER]) await addUser(db, { id });
  await addOrder(BUYER, "completed", [
    ["latte", "Latte"],
    ["tuna-bites", "Tuna Bites"],
    ["box", "Take-out Box"],
    ["water", "Bottled water"],
  ]);
  await addOrder(OTHER, "completed", [["latte", "Latte"]]);
  await addOrder(PENDING_BUYER, "preparing", [["mocha", "Mocha"]]);
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("Item ratings (FR-121)", () => {
  it("TC-P9-088 — a customer rates an item from a completed order, and rating again replaces it", async () => {
    expect(await rateResult(BUYER, "latte", 4)).toMatchObject({ ok: true });
    expect(await rateResult(BUYER, "latte", 5)).toMatchObject({ ok: true });
    expect(await rateResult(OTHER, "latte", 2)).toMatchObject({ ok: true });

    const summary = await runAs<{
      item_id: string;
      average: string;
      rating_count: number;
    }>(db, ANON, "select * from public.item_rating_summary()");
    expect(summary.ok && summary.rows).toEqual([
      { item_id: "latte", average: "3.5", rating_count: 2 },
    ]);
  });

  it("TC-P9-089 — refuses guests, bad stars, items not in a completed order and the shop-only items", async () => {
    const guest = await runAs<{ result: { ok: boolean; error: string } }>(
      db,
      ANON,
      "select public.rate_item('latte', 5) as result",
    );
    expect(guest.ok).toBe(false);
    if (!guest.ok) expect(guest.code).toBe(INSUFFICIENT_PRIVILEGE);

    expect(await rateResult(BUYER, "latte", 0)).toMatchObject({
      error: "invalid_rating",
    });
    expect(await rateResult(BUYER, "latte", 6)).toMatchObject({
      error: "invalid_rating",
    });
    // Never ordered, and ordered but not completed yet
    expect(await rateResult(BUYER, "mocha", 5)).toMatchObject({
      error: "not_ordered",
    });
    expect(await rateResult(PENDING_BUYER, "mocha", 5)).toMatchObject({
      error: "not_ordered",
    });
    // Bought in a completed order, but sold only at the shop
    for (const item of ["tuna-bites", "box", "water", "no-such-item"]) {
      expect(await rateResult(BUYER, item, 5), item).toMatchObject({
        error: "not_rateable",
      });
    }
  });

  it("TC-P9-090 — customers see only their own ratings and can't write the table directly", async () => {
    const own = await runAs<{ customer_id: string }>(
      db,
      signedIn(OTHER),
      "select customer_id, item_id, rating from public.item_ratings",
    );
    expect(own.ok && own.rows.map((row) => row.customer_id)).toEqual([OTHER]);

    const anonRead = await runAs(
      db,
      ANON,
      "select item_id from public.item_ratings",
    );
    expect(anonRead.ok).toBe(false);

    for (const sql of [
      "insert into public.item_ratings (customer_id, item_id, rating) values (auth.uid(), 'latte', 1)",
      "update public.item_ratings set rating = 1",
      "delete from public.item_ratings",
    ]) {
      const write = await runAs(db, signedIn(OTHER), sql);
      expect(write.ok, sql).toBe(false);
    }
  });

  it("TC-P9-091 — the rollback removes the table and functions, and the migration applies again", async () => {
    await applyRollback(db, MIGRATION);
    const gone = await db.query<{ name: string | null }>(
      "select to_regclass('public.item_ratings')::text as name",
    );
    expect(gone.rows[0]?.name).toBeNull();
    await applyMigration(db, MIGRATION);
    const back = await db.query<{ name: string | null }>(
      "select to_regclass('public.item_ratings')::text as name",
    );
    expect(back.rows[0]?.name).toBe("item_ratings");
  });
});
