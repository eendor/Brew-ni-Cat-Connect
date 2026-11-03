// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";

import {
  addUser,
  ANON,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  signedIn,
} from "./support/database";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const TOKEN = "B".repeat(43);

type Answer = Record<string, unknown>;

let db: PGlite;
let counter = 0;

function uuid(prefix: string): string {
  counter += 1;
  return `00000000-0000-4000-${prefix}-${counter.toString(16).padStart(12, "0")}`;
}

async function placeOrder(): Promise<string> {
  const outcome = await commitAs<{ result: Answer }>(
    db,
    ANON,
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
        lines: [
          { itemId: "latte", variantId: "latte-16", flavor: null, quantity: 1 },
        ],
        expectedSubtotal: 120,
      }),
    ],
  );
  if (!outcome.ok || outcome.rows[0]?.result.ok !== true) {
    throw new Error(`could not place the order: ${JSON.stringify(outcome)}`);
  }
  return String(outcome.rows[0].result.reference);
}

async function call(
  sql: string,
  params: unknown[],
  actor = signedIn(STAFF),
): Promise<Answer> {
  const outcome = await commitAs<{ result: Answer }>(db, actor, sql, params);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]?.result ?? {};
}

const move = (reference: string, from: string, to: string, reason?: string) =>
  call(
    "select public.set_online_order_status($1, $2, $3, $4, $5::uuid) as result",
    [reference, from, to, reason ?? null, uuid("9000")],
  );

const undo = (reference: string, from: string, correlation = uuid("a000")) =>
  call("select public.undo_online_order_status($1, $2, $3::uuid) as result", [
    reference,
    from,
    correlation,
  ]);

async function walk(reference: string, to: string): Promise<void> {
  const path = ["pending", "accepted", "preparing", "ready", "completed"];
  for (let i = 1; i <= path.indexOf(to); i += 1) {
    await move(reference, path[i - 1] ?? "", path[i] ?? "");
  }
}

async function state(reference: string): Promise<Answer> {
  const result = await db.query<Answer>(
    `select o.status,
       (select count(*)::int from public.online_order_status_history h
        where h.order_id = o.id) as history,
       (select s.sale_id::text from private.online_order_sales s
        where s.order_id = o.id) as sale_id
     from public.online_orders o where o.reference = $1`,
    [reference],
  );
  return result.rows[0] ?? {};
}

async function sales(reference: string): Promise<Answer[]> {
  const result = await db.query<Answer>(
    `select id::text as id, is_voided, void_reason from public.orders
     where table_label = 'Online ' || $1 order by id`,
    [reference],
  );
  return result.rows;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(`
    insert into public.categories (id, name) values ('coffee', 'Coffee');
    insert into public.items (id, category_id, name, flavors, variants_json, is_available)
    values ('latte', 'coffee', 'Latte', '',
      '[{"id":"latte-16","name":"16 oz","basePrice":120}]', true);
  `);
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("undoing an online order status (FR-095)", () => {
  it("steps back one status at a time and keeps the history (TC-P6-200)", async () => {
    const reference = await placeOrder();
    await walk(reference, "ready");

    expect(await undo(reference, "ready")).toMatchObject({
      ok: true,
      replayed: false,
      status: "preparing",
    });
    expect(await undo(reference, "preparing")).toMatchObject({
      ok: false,
      error: "not_allowed",
    });
    expect(await state(reference)).toMatchObject({
      status: "preparing",
      history: 5,
    });
    // the next step forward works again
    expect(await move(reference, "preparing", "ready")).toMatchObject({
      ok: true,
    });
  });

  it("voids the sale of an undone Complete and adds a new one when completed again (TC-P6-201)", async () => {
    const reference = await placeOrder();
    await walk(reference, "completed");
    const first = await state(reference);
    expect(first.sale_id).toBeTruthy();

    const answer = await undo(reference, "completed");
    expect(answer).toMatchObject({ ok: true, status: "ready" });
    expect(String(answer.voidedSaleId)).toBe(first.sale_id);
    expect(await state(reference)).toMatchObject({ sale_id: null });
    expect(await sales(reference)).toEqual([
      expect.objectContaining({ id: first.sale_id, is_voided: true }),
    ]);

    await move(reference, "ready", "completed");
    const rows = await sales(reference);
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => !row.is_voided)).toHaveLength(1);
  });

  it("refuses after five minutes, for rejections and from an old status (TC-P6-202)", async () => {
    const late = await placeOrder();
    await walk(late, "accepted");
    await db.query(
      `update public.online_order_status_history set changed_at = now() - interval '6 minutes'
       where order_id = (select id from public.online_orders where reference = $1)`,
      [late],
    );
    expect(await undo(late, "accepted")).toMatchObject({
      ok: false,
      error: "too_late",
    });

    const rejected = await placeOrder();
    await move(rejected, "pending", "rejected", "Out of milk");
    expect(await undo(rejected, "rejected")).toMatchObject({
      ok: false,
      error: "not_allowed",
    });

    const fresh = await placeOrder();
    expect(await undo(fresh, "pending")).toMatchObject({
      ok: false,
      error: "not_allowed",
    });
    await walk(fresh, "accepted");
    expect(await undo(fresh, "preparing")).toMatchObject({
      ok: false,
      error: "stale",
      status: "accepted",
    });

    const audit = await db.query<{ n: number }>(
      `select count(*)::int as n from private.staff_audit_log
       where action = 'online-order-undo' and result = 'refused'`,
    );
    expect(audit.rows[0]?.n).toBeGreaterThanOrEqual(4);
  });

  it("answers a retry with the same correlation id without stepping back twice (TC-P6-203)", async () => {
    const reference = await placeOrder();
    await walk(reference, "preparing");
    const correlation = uuid("b000");
    expect(await undo(reference, "preparing", correlation)).toMatchObject({
      ok: true,
      replayed: false,
      status: "accepted",
    });
    expect(await undo(reference, "preparing", correlation)).toMatchObject({
      ok: true,
      replayed: true,
      status: "accepted",
    });
    expect(await state(reference)).toMatchObject({
      status: "accepted",
      history: 4,
    });
  });

  it("lets only shop staff undo (TC-P6-204)", async () => {
    const reference = await placeOrder();
    await walk(reference, "accepted");
    for (const actor of [ANON, signedIn(CUSTOMER)]) {
      const outcome = await commitAs(
        db,
        actor,
        "select public.undo_online_order_status($1, $2, null)",
        [reference, "accepted"],
      );
      expect(outcome).toMatchObject({
        ok: false,
        code: INSUFFICIENT_PRIVILEGE,
      });
    }
    expect(await state(reference)).toMatchObject({ status: "accepted" });
  });
});
