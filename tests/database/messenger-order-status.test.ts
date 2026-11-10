// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANON,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const MIGRATION = "20261110120000_messenger_order_status.sql";

// One customer's token is shared by all their Messenger orders (FR-110).
const TOKEN = "M".repeat(43);
const OTHER_TOKEN = "N".repeat(43);

const MENU_SQL = `
  insert into public.categories (id, name) values ('coffee', 'Coffee');
  insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
    ('latte', 'coffee', 'Latte', '',
     '[{"id":"latte-16","name":"16 oz","basePrice":120}]', true);
`;

type Listed = {
  reference: string;
  status: string;
  subtotal: number;
  items: { itemName: string; quantity: number }[];
};

let db: PGlite;
let keyCounter = 0;

function request(trackingToken: string, quantity: number) {
  keyCounter += 1;
  return {
    idempotencyKey: `00000000-0000-4000-8000-${keyCounter.toString(16).padStart(12, "0")}`,
    trackingToken,
    fulfillment: "pickup",
    customer: {
      name: "Messenger customer",
      phone: "09123456789",
      notes: "Messenger order. Pickup: as soon as possible.",
      paymentPreference: "Cash",
    },
    lines: [{ itemId: "latte", variantId: "latte-16", flavor: null, quantity }],
    expectedSubtotal: 120 * quantity,
  };
}

async function place(trackingToken: string, quantity = 1): Promise<string> {
  const outcome = await commitAs<{ result: { reference: string } }>(
    db,
    ANON,
    "select public.place_online_order($1::jsonb, $2::uuid) as result",
    [JSON.stringify(request(trackingToken, quantity)), null],
  );
  if (!outcome.ok) throw new Error(`place_online_order: ${outcome.message}`);
  return String(outcome.rows[0]?.result.reference);
}

async function list(
  token: string | null,
  limit: number | null = null,
  actor = ANON,
): Promise<Listed[]> {
  const outcome = await runAs<{ orders: Listed[] }>(
    db,
    actor,
    limit === null
      ? "select public.list_online_orders_by_token($1) as orders"
      : "select public.list_online_orders_by_token($1, $2) as orders",
    limit === null ? [token] : [token, limit],
  );
  if (!outcome.ok) throw new Error(`list failed: ${outcome.message}`);
  return outcome.rows[0]?.orders ?? [];
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(MENU_SQL);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("listing a Messenger customer's orders by their token (FR-110)", () => {
  it("TC-P7-051 — lists only that customer's orders, newest first, shaped like the order page", async () => {
    const first = await place(TOKEN, 1);
    const second = await place(TOKEN, 2);
    const stranger = await place(OTHER_TOKEN, 3);
    // The first order is an hour older, so the order of the list is certain.
    await db.query(
      "update public.online_orders set created_at = created_at - interval '1 hour' where reference = $1",
      [first],
    );

    const mine = await list(TOKEN);
    expect(mine.map((order) => order.reference)).toEqual([second, first]);
    expect(mine[0]).toMatchObject({
      status: "pending",
      subtotal: 240,
      items: [{ itemName: "Latte", quantity: 2 }],
    });
    expect(mine.map((order) => order.reference)).not.toContain(stranger);
    expect((await list(OTHER_TOKEN)).map((order) => order.reference)).toEqual([
      stranger,
    ]);
  });

  it("TC-P7-051 — shows the status the shop sets on the POS", async () => {
    const [latest] = await list(TOKEN);
    await db.query(
      "update public.online_orders set status = 'preparing' where reference = $1",
      [latest?.reference],
    );
    expect((await list(TOKEN))[0]?.status).toBe("preparing");
  });

  it("TC-P7-051 — returns an empty list, not an error, for an unknown or malformed token", async () => {
    expect(await list("Z".repeat(43))).toEqual([]);
    expect(await list("too-short")).toEqual([]);
    expect(await list(`${"M".repeat(42)}!`)).toEqual([]);
    expect(await list(null)).toEqual([]);
  });

  it("TC-P7-051 — keeps the list between 1 and 10 orders", async () => {
    expect(await list(TOKEN, 1)).toHaveLength(1);
    expect(await list(TOKEN, 0)).toHaveLength(1);
    expect(await list(TOKEN, -4)).toHaveLength(1);
    expect(await list(TOKEN, 99)).toHaveLength(2);
  });

  it("TC-P7-051 — can be called by the website's roles only, and changes nothing", async () => {
    const before = await db.query<{ count: number }>(
      "select count(*)::int as count from public.online_orders",
    );
    expect(
      await list(TOKEN, null, signedIn("55555555-5555-4555-8555-555555555555")),
    ).toHaveLength(2);
    const after = await db.query<{ count: number }>(
      "select count(*)::int as count from public.online_orders",
    );
    expect(after.rows).toEqual(before.rows);

    const privileges = await db.query<{
      anon: boolean;
      signed_in: boolean;
      server: boolean;
      definer: boolean;
      settings: string[];
    }>(`
      select
        has_function_privilege('anon', p.oid, 'execute') as anon,
        has_function_privilege('authenticated', p.oid, 'execute') as signed_in,
        has_function_privilege('service_role', p.oid, 'execute') as server,
        p.prosecdef as definer,
        p.proconfig as settings
      from pg_proc as p
      where p.oid = 'public.list_online_orders_by_token(text, integer)'::regprocedure
    `);
    expect(privileges.rows).toEqual([
      {
        anon: true,
        signed_in: true,
        server: false,
        definer: true,
        settings: ['search_path=""'],
      },
    ]);
    const direct = await runAs(
      db,
      ANON,
      "select token_hash from private.online_order_tokens",
    );
    expect(direct.ok).toBe(false);
    if (!direct.ok) expect(direct.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("undoing the Messenger order status migration", () => {
  it("TC-P7-051 — removes the function and keeps the orders", async () => {
    const fresh = await createMigratedDatabase(MIGRATION);
    try {
      await fresh.exec(MENU_SQL);
      const outcome = await fresh.query<{ result: { reference: string } }>(
        "select public.place_online_order($1::jsonb) as result",
        [JSON.stringify(request(TOKEN, 1))],
      );
      expect(outcome.rows).toHaveLength(1);

      await applyRollback(fresh, MIGRATION);
      const gone = await fresh.query(`
        select
          to_regprocedure('public.list_online_orders_by_token(text, integer)') is null as no_list,
          to_regprocedure('public.get_online_order(text, text)') is not null as has_get,
          (select count(*)::int from public.online_orders) as orders
      `);
      expect(gone.rows).toEqual([{ no_list: true, has_get: true, orders: 1 }]);
    } finally {
      await fresh.close();
    }
  }, 60_000);
});
