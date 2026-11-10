// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_A = "22222222-2222-4222-8222-222222222222";
const CUSTOMER_B = "33333333-3333-4333-8333-333333333333";
const TOKEN = "L".repeat(43);

type Answer = Record<string, unknown>;

let db: PGlite;
let counter = 0;

function uuid(prefix: string): string {
  counter += 1;
  return `00000000-0000-4000-${prefix}-${counter.toString(16).padStart(12, "0")}`;
}

async function placeOrder({
  actor = signedIn(CUSTOMER_A),
  itemId = "latte",
  variantId = "latte-16",
  quantity = 1,
  expectedSubtotal = 120,
}: {
  actor?: ReturnType<typeof signedIn> | typeof ANON;
  itemId?: string;
  variantId?: string;
  quantity?: number;
  expectedSubtotal?: number;
} = {}): Promise<string> {
  const outcome = await commitAs<{ result: Answer }>(
    db,
    actor,
    "select public.place_online_order($1::jsonb) as result",
    [
      JSON.stringify({
        idempotencyKey: uuid("8000"),
        trackingToken: TOKEN,
        fulfillment: "pickup",
        customer: {
          name: "Juan Dela Cruz",
          phone: "0912 345 6789",
          notes: "",
          paymentPreference: "Cash",
        },
        lines: [{ itemId, variantId, flavor: null, quantity }],
        expectedSubtotal,
      }),
    ],
  );

  if (!outcome.ok || outcome.rows[0]?.result.ok !== true) {
    throw new Error(`could not place order: ${JSON.stringify(outcome)}`);
  }
  return String(outcome.rows[0].result.reference);
}

async function moveStatus(
  reference: string,
  from: string,
  to: string,
  reason?: string,
): Promise<Answer> {
  const outcome = await commitAs<{ result: Answer }>(
    db,
    signedIn(STAFF),
    "select public.set_online_order_status($1, $2, $3, $4, $5::uuid) as result",
    [reference, from, to, reason ?? null, uuid("9000")],
  );
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]?.result ?? {};
}

async function undoStatus(reference: string, from: string): Promise<Answer> {
  const outcome = await commitAs<{ result: Answer }>(
    db,
    signedIn(STAFF),
    "select public.undo_online_order_status($1, $2, $3::uuid) as result",
    [reference, from, uuid("a000")],
  );
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]?.result ?? {};
}

async function completeOrder(reference: string): Promise<void> {
  await moveStatus(reference, "pending", "accepted");
  await moveStatus(reference, "accepted", "preparing");
  await moveStatus(reference, "preparing", "ready");
  await moveStatus(reference, "ready", "completed");
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(`
    insert into public.categories (id, name) values ('coffee', 'Coffee'), ('snacks', 'Snacks');
    insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
      ('latte', 'coffee', 'Latte', '', '[{"id":"latte-16","name":"16 oz","basePrice":120}]', true),
      ('cheap', 'snacks', 'Candy', '', '[{"id":"cheap-1","name":"Single","basePrice":5}]', true),
      ('medium', 'coffee', 'Brew', '', '[{"id":"brew-16","name":"16 oz","basePrice":255}]', true);
  `);

  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER_A });
  await addUser(db, { id: CUSTOMER_B });
}, 60_000);

describe("Loyalty points earning and transactions (FR-050 to FR-054)", () => {
  it("TC-P5-098 — earned points match the rule for known subtotals (1 pt per ₱50)", async () => {
    // ₱120 -> 2 points
    const ref1 = await placeOrder({
      itemId: "latte",
      variantId: "latte-16",
      expectedSubtotal: 120,
    });
    await completeOrder(ref1);

    const txRes1 = await db.query<{ points: number; reason: string }>(
      `select points, reason from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref1],
    );
    expect(txRes1.rows).toHaveLength(1);
    expect(txRes1.rows[0]?.points).toBe(2);
    expect(txRes1.rows[0]?.reason).toBe("order-completed");

    // ₱255 -> 5 points (floor(255 / 50))
    const ref2 = await placeOrder({
      itemId: "medium",
      variantId: "brew-16",
      expectedSubtotal: 255,
    });
    await completeOrder(ref2);

    const txRes2 = await db.query<{ points: number; reason: string }>(
      `select points, reason from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref2],
    );
    expect(txRes2.rows).toHaveLength(1);
    expect(txRes2.rows[0]?.points).toBe(5);
  });

  it("TC-P5-099 — one award per order even when completion is retried", async () => {
    const ref = await placeOrder({ expectedSubtotal: 120 });
    await moveStatus(ref, "pending", "accepted");
    await moveStatus(ref, "accepted", "preparing");
    await moveStatus(ref, "preparing", "ready");

    const completeCorrelation = uuid("c000");
    const firstComplete = await commitAs<{ result: Answer }>(
      db,
      signedIn(STAFF),
      "select public.set_online_order_status($1, $2, $3, $4, $5::uuid) as result",
      [ref, "ready", "completed", null, completeCorrelation],
    );
    expect(firstComplete.ok).toBe(true);
    if (!firstComplete.ok) throw new Error(firstComplete.message);
    expect(firstComplete.rows[0]?.result.ok).toBe(true);
    expect(firstComplete.rows[0]?.result.replayed).toBe(false);

    // Replay with identical correlation
    const retry = await commitAs<{ result: Answer }>(
      db,
      signedIn(STAFF),
      "select public.set_online_order_status($1, $2, $3, $4, $5::uuid) as result",
      [ref, "ready", "completed", null, completeCorrelation],
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) throw new Error(retry.message);
    expect(retry.rows[0]?.result.ok).toBe(true);
    expect(retry.rows[0]?.result.replayed).toBe(true);

    const sumRes = await db.query<{ sum: number; count: number }>(
      `select coalesce(sum(points), 0)::int as sum, count(*)::int as count
       from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref],
    );
    expect(sumRes.rows[0]?.count).toBe(1);
    expect(sumRes.rows[0]?.sum).toBe(2);
  });

  it("TC-P5-100 — complete then undo leaves 0 points", async () => {
    const ref = await placeOrder({ expectedSubtotal: 120 });
    await completeOrder(ref);

    // Undo completion back to 'ready'
    const undoRes = await undoStatus(ref, "completed");
    expect(undoRes.ok).toBe(true);

    const sumRes = await db.query<{ sum: number; count: number }>(
      `select coalesce(sum(points), 0)::int as sum, count(*)::int as count
       from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref],
    );
    // 1 'order-completed' (+2) and 1 'adjustment' (-2)
    expect(sumRes.rows[0]?.count).toBe(2);
    expect(sumRes.rows[0]?.sum).toBe(0);
  });

  it("TC-P5-101 — complete, undo, complete leaves the points once", async () => {
    const ref = await placeOrder({ expectedSubtotal: 120 });
    await completeOrder(ref);
    await undoStatus(ref, "completed");

    // Complete again
    await moveStatus(ref, "ready", "completed");

    const sumRes = await db.query<{ sum: number; count: number }>(
      `select coalesce(sum(points), 0)::int as sum, count(*)::int as count
       from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref],
    );
    // 1 'order-completed' (+2), 1 'adjustment' (-2), 1 'adjustment' (+2)
    expect(sumRes.rows[0]?.count).toBe(3);
    expect(sumRes.rows[0]?.sum).toBe(2);
  });

  it("TC-P5-102 — rejected and cancelled orders earn nothing", async () => {
    // Rejected
    const ref1 = await placeOrder({ expectedSubtotal: 120 });
    await moveStatus(ref1, "pending", "rejected", "Item out of stock");

    const tx1 = await db.query(
      `select * from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref1],
    );
    expect(tx1.rows).toHaveLength(0);

    // Cancelled
    const ref2 = await placeOrder({ expectedSubtotal: 120 });
    await moveStatus(ref2, "pending", "accepted");
    await moveStatus(
      ref2,
      "accepted",
      "cancelled",
      "Customer requested cancellation",
    );

    const tx2 = await db.query(
      `select * from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref2],
    );
    expect(tx2.rows).toHaveLength(0);
  });

  it("TC-P5-103 — guest orders earn nothing", async () => {
    const ref = await placeOrder({ actor: ANON, expectedSubtotal: 120 });
    await completeOrder(ref);

    const tx = await db.query(
      `select * from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref],
    );
    expect(tx.rows).toHaveLength(0);
  });

  it("TC-P5-104 — a subtotal under ₱10 adds no row and does not block completion", async () => {
    const ref = await placeOrder({
      itemId: "cheap",
      variantId: "cheap-1",
      expectedSubtotal: 5,
    });
    await completeOrder(ref);

    const tx = await db.query(
      `select * from public.loyalty_transactions
       where order_id = (select id from public.online_orders where reference = $1)`,
      [ref],
    );
    expect(tx.rows).toHaveLength(0);

    const orderRes = await db.query<{ status: string }>(
      "select status from public.online_orders where reference = $1",
      [ref],
    );
    expect(orderRes.rows[0]?.status).toBe("completed");
  });

  it("TC-P5-105 — customer reads only their own rows and cannot insert, update or delete", async () => {
    // Customer A can read Customer A's rows
    const aRes = await runAs<{ count: number }>(
      db,
      signedIn(CUSTOMER_A),
      "select count(*)::int as count from public.loyalty_transactions",
    );
    expect(aRes.ok).toBe(true);
    if (!aRes.ok) throw new Error(aRes.message);
    expect(aRes.rows[0]?.count).toBeGreaterThan(0);

    // Customer B cannot see Customer A's rows
    const bRes = await runAs<{ count: number }>(
      db,
      signedIn(CUSTOMER_B),
      "select count(*)::int as count from public.loyalty_transactions",
    );
    expect(bRes.ok).toBe(true);
    if (!bRes.ok) throw new Error(bRes.message);
    expect(bRes.rows[0]?.count).toBe(0);

    // Direct insert by customer fails
    const insertOutcome = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      "insert into public.loyalty_transactions (customer_id, points, reason) values ($1, 100, 'order-completed')",
      [CUSTOMER_A],
    );
    expect(insertOutcome.ok).toBe(false);
    if (!insertOutcome.ok)
      expect(insertOutcome.code).toBe(INSUFFICIENT_PRIVILEGE);

    // Direct update by customer fails
    const updateOutcome = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      "update public.loyalty_transactions set points = 999 where customer_id = $1",
      [CUSTOMER_A],
    );
    expect(updateOutcome.ok).toBe(false);
    if (!updateOutcome.ok)
      expect(updateOutcome.code).toBe(INSUFFICIENT_PRIVILEGE);

    // Direct delete by customer fails
    const deleteOutcome = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      "delete from public.loyalty_transactions where customer_id = $1",
      [CUSTOMER_A],
    );
    expect(deleteOutcome.ok).toBe(false);
    if (!deleteOutcome.ok)
      expect(deleteOutcome.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("TC-P5-106 — loyalty_rewards() returns only active rewards", async () => {
    const res = await runAs<{ r: Answer[] }>(
      db,
      ANON,
      "select public.loyalty_rewards() as r",
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(res.message);
    const rewards = res.rows[0]?.r ?? [];
    expect(rewards.length).toBeGreaterThanOrEqual(3);

    const ids = rewards.map((r: Answer) => r.id);
    expect(ids).toContain("reward-kiwi-soda");
    expect(ids).toContain("reward-spanish-latte");
    expect(ids).toContain("reward-buldak-carbonara");
  });
});

describe("Reward redemption stretch goal (FR-055)", () => {
  it("TC-P5-107 — balance cannot go below zero", async () => {
    // Customer B has 0 balance
    const outcome = await commitAs<{ result: Answer }>(
      db,
      signedIn(CUSTOMER_B),
      "select public.redeem_reward($1) as result",
      ["reward-spanish-latte"],
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error(outcome.message);
    expect(outcome.rows[0]?.result.ok).toBe(false);
    expect(outcome.rows[0]?.result.error).toBe("insufficient_points");

    // Check balance is still 0
    const bRes = await runAs<{ sum: number }>(
      db,
      signedIn(CUSTOMER_B),
      "select coalesce(sum(points), 0)::int as sum from public.loyalty_transactions",
    );
    expect(bRes.ok).toBe(true);
    if (!bRes.ok) throw new Error(bRes.message);
    expect(bRes.rows[0]?.sum).toBe(0);
  });

  it("TC-P5-108 — enforces the weekly redemption limit", async () => {
    // Place orders for Customer B to earn 300 points (e.g. 3 orders of subtotal ₱5000 = 100 points each)
    for (let i = 0; i < 3; i++) {
      const ref = await placeOrder({
        actor: signedIn(CUSTOMER_B),
        itemId: "medium",
        variantId: "brew-16",
        quantity: 20,
        expectedSubtotal: 5100, // 5100 / 50 = 102 points
      });
      await completeOrder(ref);
    }

    // Customer B now has over 300 points.
    // Weekly limit is 2 rewards.
    // 1st redemption (50 pts): OK
    const r1 = await commitAs<{ result: Answer }>(
      db,
      signedIn(CUSTOMER_B),
      "select public.redeem_reward($1) as result",
      ["reward-spanish-latte"],
    );
    expect(r1.ok).toBe(true);
    if (!r1.ok) throw new Error(r1.message);
    expect(r1.rows[0]?.result.ok).toBe(true);
    expect(String(r1.rows[0]?.result.code)).toMatch(/^RWD-[A-Z0-9]{6}$/);

    // 2nd redemption (50 pts): OK
    const r2 = await commitAs<{ result: Answer }>(
      db,
      signedIn(CUSTOMER_B),
      "select public.redeem_reward($1) as result",
      ["reward-spanish-latte"],
    );
    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error(r2.message);
    expect(r2.rows[0]?.result.ok).toBe(true);

    // 3rd redemption in same week: refused by weekly limit
    const r3 = await commitAs<{ result: Answer }>(
      db,
      signedIn(CUSTOMER_B),
      "select public.redeem_reward($1) as result",
      ["reward-spanish-latte"],
    );
    expect(r3.ok).toBe(true);
    if (!r3.ok) throw new Error(r3.message);
    expect(r3.rows[0]?.result.ok).toBe(false);
    expect(r3.rows[0]?.result.error).toBe("weekly_limit_reached");
  });

  it("TC-P5-109 — rollback script cleanly drops functions and triggers", async () => {
    await applyRollback(db, "20261113120000_loyalty_points.sql");

    // public.loyalty_rewards should no longer exist
    const outcome = await runAs(db, ANON, "select public.loyalty_rewards()");
    expect(outcome.ok).toBe(false);
  });
});
