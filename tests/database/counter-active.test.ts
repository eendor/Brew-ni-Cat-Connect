// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANON,
  applyRollback,
  createMigratedDatabase,
  runAs,
} from "./support/database";

const MIGRATION = "20261117130000_counter_active_today.sql";
const ASK = "select public.shop_counter_active_today() as active";

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
}, 60_000);

afterAll(async () => {
  await db.close();
});

const MANILA_MIDNIGHT =
  "(date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila')";

/** A POS sale made at `when` (an SQL time expression). */
const insertOrder = (id: number, when: string, voided = false) =>
  db.query(
    `insert into public.orders (id, device_id, "timestamp", subtotal, discount_deduction, discount_label, total, payment_method, created_at, is_voided)
     values ($1, 'pos-1', 0, 100, 0, '', 100, 'Cash', ${when}, $2)`,
    [id, voided],
  );

describe("Counter active today (FR-112)", () => {
  it("TC-P9-065 — says no until the POS has a sale today in Manila, ignoring voided sales; guests may ask", async () => {
    await db.exec("delete from public.order_items; delete from public.orders;");
    await expect(runAs(db, ANON, ASK)).resolves.toMatchObject({
      ok: true,
      rows: [{ active: false }],
    });

    // A sale just before midnight in Manila, and a voided sale today, don't count.
    await insertOrder(2001, `${MANILA_MIDNIGHT} - interval '1 minute'`);
    await insertOrder(2002, "now()", true);
    await expect(runAs(db, ANON, ASK)).resolves.toMatchObject({
      rows: [{ active: false }],
    });

    await insertOrder(2003, "now()");
    await expect(runAs(db, ANON, ASK)).resolves.toMatchObject({
      rows: [{ active: true }],
    });
  });

  it("TC-P9-065 — the rollback removes it", async () => {
    await applyRollback(db, MIGRATION);
    const result = await runAs(db, ANON, ASK);
    expect(result.ok).toBe(false);
  });
});
