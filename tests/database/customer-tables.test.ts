// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";

import {
  addUser,
  ANON,
  type Actor,
  applyMigration,
  applyRollback,
  commitAs,
  createBaselineDatabase,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  type Outcome,
  runAs,
  signedIn,
} from "./support/database";
import { seedPosData } from "./support/pos-data";

const TABLES = "20261024064600_customer_tables.sql";
const FUNCTIONS = "20261024064700_online_order_functions.sql";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const OTHER_CUSTOMER = "33333333-3333-4333-8333-333333333333";

const NEW_TABLES = [
  "private.online_order_tokens",
  "public.customer_profiles",
  "public.data_requests",
  "public.favorites",
  "public.loyalty_transactions",
  "public.online_order_items",
  "public.online_order_status_history",
  "public.online_orders",
] as const;

const ORDER_TABLES = [
  "public.online_orders",
  "public.online_order_items",
  "public.online_order_status_history",
] as const;

let db: PGlite;
let orderCounter = 0;

/** Save an order as the table owner, the way place_online_order() does. */
async function addOrder(
  database: PGlite,
  customerId: string | null,
): Promise<string> {
  orderCounter += 1;
  const suffix = orderCounter.toString().padStart(2, "0");
  const reference = `BNC-AAAA${"23456789ABCDEFGHJKMNPQRSTUVWXYZ"[orderCounter % 31]}${"23456789"[orderCounter % 8]}`;
  const result = await database.query<{ id: string }>(
    `insert into public.online_orders
       (reference, customer_id, customer_name, customer_phone, payment_preference,
        subtotal, item_count, idempotency_key, realtime_topic)
     values ($1, $2, 'Juan Dela Cruz', '+639123456789', 'Cash', 120, 1,
             gen_random_uuid(), $3)
     returning id`,
    [reference, customerId, `order:${"x".repeat(20)}${suffix}`],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error("Could not add the order");
  }
  await database.query(
    `insert into public.online_order_items
       (order_id, line_number, item_id, item_name, variant_id, variant_name,
        unit_price, quantity, line_total)
     values ($1, 1, 'latte', 'Latte', 'latte-16', '16 oz', 120, 1, 120)`,
    [id],
  );
  await database.query(
    `insert into public.online_order_status_history
       (order_id, from_status, to_status, actor, correlation_id)
     values ($1, null, 'pending', 'customer', gen_random_uuid())`,
    [id],
  );
  await database.query(
    `insert into private.online_order_tokens (order_id, token_hash)
     values ($1, sha256('token'::bytea))`,
    [id],
  );
  return id;
}

async function countAs(actor: Actor, table: string): Promise<number> {
  const outcome = await runAs<{ rows: number }>(
    db,
    actor,
    `select count(*)::int as rows from ${table}`,
  );
  if (!outcome.ok) {
    throw new Error(`Could not count ${table}: ${outcome.message}`);
  }
  return outcome.rows[0]?.rows ?? Number.NaN;
}

function expectDenied(outcome: Outcome<unknown>, label: string): void {
  expect(outcome, label).toMatchObject({
    ok: false,
    code: INSUFFICIENT_PRIVILEGE,
  });
}

function expectChanged(
  outcome: Outcome<unknown>,
  rows: number,
  label: string,
): void {
  expect(outcome, label).toMatchObject({ ok: true, affectedRows: rows });
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await seedPosData(db);
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER });
  await addUser(db, { id: OTHER_CUSTOMER });
  // One guest order and one order each for the two customers.
  await addOrder(db, null);
  await addOrder(db, CUSTOMER);
  await addOrder(db, OTHER_CUSTOMER);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("the online order and customer tables", () => {
  it("turn on RLS for every new table, with only the planned policies (TC-P4-074)", async () => {
    const tables = await db.query<{ table: string; rls: boolean }>(`
      select n.nspname || '.' || c.relname as table, c.relrowsecurity as rls
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname in ('public', 'private') and c.relkind in ('r', 'p')
      order by 1
    `);
    for (const table of NEW_TABLES) {
      expect(tables.rows, table).toContainEqual({ table, rls: true });
    }
    expect(tables.rows.filter((row) => !row.rls)).toEqual([]);

    const policies = await db.query(`
      select tablename as table, policyname as name, cmd, roles::text[] as roles
      from pg_policies
      where tablename in (
        'online_orders', 'online_order_items', 'online_order_status_history',
        'online_order_tokens', 'customer_profiles', 'favorites',
        'loyalty_transactions', 'data_requests'
      )
      order by tablename, policyname
    `);
    const signedInOnly = ["authenticated"];
    expect(policies.rows).toEqual([
      {
        table: "customer_profiles",
        name: "customer_adds_own",
        cmd: "INSERT",
        roles: signedInOnly,
      },
      {
        table: "customer_profiles",
        name: "customer_reads_own",
        cmd: "SELECT",
        roles: signedInOnly,
      },
      {
        table: "customer_profiles",
        name: "customer_updates_own",
        cmd: "UPDATE",
        roles: signedInOnly,
      },
      {
        table: "data_requests",
        name: "customer_adds_own",
        cmd: "INSERT",
        roles: signedInOnly,
      },
      {
        table: "data_requests",
        name: "customer_or_staff_reads",
        cmd: "SELECT",
        roles: signedInOnly,
      },
      {
        table: "data_requests",
        name: "staff_updates",
        cmd: "UPDATE",
        roles: signedInOnly,
      },
      {
        table: "favorites",
        name: "customer_adds_own",
        cmd: "INSERT",
        roles: signedInOnly,
      },
      {
        table: "favorites",
        name: "customer_reads_own",
        cmd: "SELECT",
        roles: signedInOnly,
      },
      {
        table: "favorites",
        name: "customer_removes_own",
        cmd: "DELETE",
        roles: signedInOnly,
      },
      {
        table: "loyalty_transactions",
        name: "customer_reads_own",
        cmd: "SELECT",
        roles: signedInOnly,
      },
      {
        table: "online_order_items",
        name: "readable_with_the_order",
        cmd: "SELECT",
        roles: signedInOnly,
      },
      {
        table: "online_order_status_history",
        name: "readable_with_the_order",
        cmd: "SELECT",
        roles: signedInOnly,
      },
      {
        table: "online_orders",
        name: "readable_by_customer_or_staff",
        cmd: "SELECT",
        roles: signedInOnly,
      },
    ]);
  });

  it("give guests no table access at all (TC-P4-075)", async () => {
    for (const table of NEW_TABLES) {
      expectDenied(
        await runAs(db, ANON, `select * from ${table}`),
        `read ${table}`,
      );
    }
    expectDenied(
      await runAs(
        db,
        ANON,
        "insert into public.favorites (customer_id, item_id) values (gen_random_uuid(), 'latte')",
      ),
      "add a favorite",
    );
    expectDenied(
      await runAs(
        db,
        ANON,
        "update public.online_orders set status = 'cancelled'",
      ),
      "change an order",
    );
  });

  it("show a customer only their own orders, and staff every order (TC-P4-076)", async () => {
    for (const table of ORDER_TABLES) {
      expect(await countAs(signedIn(CUSTOMER), table), table).toBe(1);
      expect(await countAs(signedIn(STAFF), table), table).toBe(3);
    }
    const own = await runAs<{ customer_id: string }>(
      db,
      signedIn(CUSTOMER),
      "select customer_id from public.online_orders",
    );
    expect(own).toMatchObject({ ok: true, rows: [{ customer_id: CUSTOMER }] });

    // A role only in the access token is not staff.
    expect(
      await countAs(
        signedIn(CUSTOMER, { app_metadata: { role: "staff" } }),
        "public.online_orders",
      ),
    ).toBe(1);
  });

  it("let nobody write orders directly, and keep the tokens closed (TC-P4-077)", async () => {
    for (const actor of [signedIn(CUSTOMER), signedIn(STAFF)]) {
      const label = actor.role === "authenticated" ? actor.userId : actor.role;
      expectDenied(
        await runAs(
          db,
          actor,
          `insert into public.online_orders
             (reference, customer_name, customer_phone, payment_preference,
              subtotal, item_count, idempotency_key, realtime_topic)
           values ('BNC-ZZZZZZ', 'X', '+639123456789', 'Cash', 1, 1,
                   gen_random_uuid(), 'order:zzzzzzzzzzzzzzzzzzzzzz')`,
        ),
        `${label} adds an order`,
      );
      for (const table of ORDER_TABLES) {
        expectDenied(
          await runAs(db, actor, `delete from ${table}`),
          `${label} deletes ${table}`,
        );
      }
      expectDenied(
        await runAs(
          db,
          actor,
          "update public.online_orders set status = 'cancelled'",
        ),
        `${label} changes a status`,
      );
      expectDenied(
        await runAs(
          db,
          actor,
          "update public.online_order_items set unit_price = 0",
        ),
        `${label} changes a price`,
      );
    }

    for (const actor of [
      signedIn(CUSTOMER),
      signedIn(STAFF),
      { role: "service_role" } as const,
    ]) {
      expectDenied(
        await runAs(db, actor, "select * from private.online_order_tokens"),
        `${actor.role} reads the tokens`,
      );
    }
  });

  it("keep each profile to its customer (TC-P4-078)", async () => {
    const customer = signedIn(CUSTOMER);

    expectChanged(
      await commitAs(
        db,
        customer,
        "insert into public.customer_profiles (full_name, phone) values ('Juan Dela Cruz', '+639123456789')",
      ),
      1,
      "add own profile",
    );
    expectDenied(
      await runAs(
        db,
        customer,
        "insert into public.customer_profiles (user_id, full_name) values ($1, 'Someone Else')",
        [OTHER_CUSTOMER],
      ),
      "add a profile for someone else",
    );
    expectDenied(
      await runAs(
        db,
        signedIn(OTHER_CUSTOMER),
        "insert into public.customer_profiles (full_name, created_at) values ('X', '2000-01-01')",
      ),
      "set created_at",
    );

    expect(await countAs(customer, "public.customer_profiles")).toBe(1);
    expect(
      await countAs(signedIn(OTHER_CUSTOMER), "public.customer_profiles"),
    ).toBe(0);
    expect(await countAs(signedIn(STAFF), "public.customer_profiles")).toBe(0);

    expectChanged(
      await runAs(
        db,
        customer,
        "update public.customer_profiles set full_name = 'Juan D. Cruz'",
      ),
      1,
      "change own profile",
    );
    expectChanged(
      await runAs(
        db,
        signedIn(OTHER_CUSTOMER),
        "update public.customer_profiles set full_name = 'X'",
      ),
      0,
      "change someone else's profile",
    );
    expectDenied(
      await runAs(db, customer, "delete from public.customer_profiles"),
      "delete a profile",
    );

    // The table checks the same rules as the API.
    for (const [label, sql] of [
      [
        "untrimmed name",
        "update public.customer_profiles set full_name = ' Juan '",
      ],
      [
        "long name",
        `update public.customer_profiles set full_name = '${"x".repeat(101)}'`,
      ],
      [
        "bad phone",
        "update public.customer_profiles set phone = '0912 345 6789'",
      ],
    ] as const) {
      expect(await runAs(db, customer, sql), label).toMatchObject({
        ok: false,
        code: "23514",
      });
    }
  });

  it("keep each customer's favorites to them (TC-P4-079)", async () => {
    const customer = signedIn(CUSTOMER);

    expectChanged(
      await commitAs(
        db,
        customer,
        "insert into public.favorites (item_id) values ('latte')",
      ),
      1,
      "add a favorite",
    );
    expectDenied(
      await runAs(
        db,
        customer,
        "insert into public.favorites (customer_id, item_id) values ($1, 'croissant')",
        [OTHER_CUSTOMER],
      ),
      "add a favorite for someone else",
    );
    expect(await countAs(customer, "public.favorites")).toBe(1);
    expect(await countAs(signedIn(OTHER_CUSTOMER), "public.favorites")).toBe(0);
    expectChanged(
      await runAs(db, signedIn(OTHER_CUSTOMER), "delete from public.favorites"),
      0,
      "remove someone else's favorite",
    );
    expectDenied(
      await runAs(
        db,
        customer,
        "update public.favorites set item_id = 'croissant'",
      ),
      "change a favorite",
    );
    expectChanged(
      await runAs(db, customer, "delete from public.favorites"),
      1,
      "remove own favorite",
    );
  });

  it("show loyalty points to their customer, and never change a row (TC-P4-080)", async () => {
    const orders = await db.query<{ id: string; customer_id: string }>(
      "select id, customer_id from public.online_orders where customer_id = $1",
      [CUSTOMER],
    );
    const orderId = orders.rows[0]?.id;
    await db.query(
      `insert into public.loyalty_transactions (customer_id, points, reason, order_id)
       values ($1, 10, 'order-completed', $2)`,
      [CUSTOMER, orderId],
    );

    expect(
      await countAs(signedIn(CUSTOMER), "public.loyalty_transactions"),
    ).toBe(1);
    expect(
      await countAs(signedIn(OTHER_CUSTOMER), "public.loyalty_transactions"),
    ).toBe(0);
    expectDenied(
      await runAs(
        db,
        signedIn(CUSTOMER),
        "insert into public.loyalty_transactions (customer_id, points, reason) values ($1, 100, 'adjustment')",
        [CUSTOMER],
      ),
      "give yourself points",
    );

    // Even the owner cannot change or repeat an award.
    await expect(
      db.query("update public.loyalty_transactions set points = 1000"),
    ).rejects.toThrow("Loyalty transactions cannot be changed");
    await expect(
      db.query(
        `insert into public.loyalty_transactions (customer_id, points, reason, order_id)
         values ($1, 10, 'order-completed', $2)`,
        [CUSTOMER, orderId],
      ),
    ).rejects.toThrow("loyalty_transactions_one_award_per_order");
    await expect(
      db.query(
        "insert into public.loyalty_transactions (customer_id, points, reason) values ($1, 5, 'reward-redeemed')",
        [CUSTOMER],
      ),
    ).rejects.toThrow("loyalty_transactions_reason_rules");
  });

  it("let customers ask for a correction, and only staff answer it (TC-P4-081)", async () => {
    const customer = signedIn(CUSTOMER);

    expectChanged(
      await commitAs(
        db,
        customer,
        "insert into public.data_requests (kind, message) values ('correction', 'Please fix my name.')",
      ),
      1,
      "ask for a correction",
    );
    expectDenied(
      await runAs(
        db,
        customer,
        "insert into public.data_requests (kind, message, status) values ('deletion', 'Delete me.', 'resolved')",
      ),
      "set the status",
    );
    expectDenied(
      await runAs(
        db,
        customer,
        "insert into public.data_requests (customer_id, kind, message) values ($1, 'deletion', 'Delete them.')",
        [OTHER_CUSTOMER],
      ),
      "ask for someone else",
    );

    expect(await countAs(customer, "public.data_requests")).toBe(1);
    expect(
      await countAs(signedIn(OTHER_CUSTOMER), "public.data_requests"),
    ).toBe(0);
    expect(await countAs(signedIn(STAFF), "public.data_requests")).toBe(1);

    expectChanged(
      await runAs(
        db,
        customer,
        "update public.data_requests set status = 'resolved'",
      ),
      0,
      "customer closes own request",
    );
    expectDenied(
      await runAs(
        db,
        signedIn(STAFF),
        "update public.data_requests set message = 'changed'",
      ),
      "staff rewrites the message",
    );
    expectChanged(
      await runAs(
        db,
        signedIn(STAFF),
        "update public.data_requests set status = 'resolved'",
      ),
      1,
      "staff closes the request",
    );
  });

  it("remove an account's data but keep its orders as guest orders (TC-P4-082)", async () => {
    const fresh = await createMigratedDatabase();
    try {
      await seedPosData(fresh);
      await addUser(fresh, { id: CUSTOMER });
      const orderId = await addOrder(fresh, CUSTOMER);
      await fresh.query(
        "insert into public.customer_profiles (user_id, full_name) values ($1, 'Juan')",
        [CUSTOMER],
      );
      await fresh.query(
        "insert into public.favorites (customer_id, item_id) values ($1, 'latte')",
        [CUSTOMER],
      );
      await fresh.query(
        "insert into public.data_requests (customer_id, kind, message) values ($1, 'deletion', 'Delete my account.')",
        [CUSTOMER],
      );
      await fresh.query(
        `insert into public.loyalty_transactions (customer_id, points, reason, order_id)
         values ($1, 10, 'order-completed', $2)`,
        [CUSTOMER, orderId],
      );

      await fresh.query("delete from auth.users where id = $1", [CUSTOMER]);

      const left = await fresh.query(`
        select
          (select count(*)::int from public.customer_profiles) as profiles,
          (select count(*)::int from public.favorites) as favorites,
          (select count(*)::int from public.data_requests) as requests,
          (select count(*)::int from public.loyalty_transactions) as loyalty,
          (select count(*)::int from public.online_orders where customer_id is null) as guest_orders,
          (select count(*)::int from public.online_order_items) as order_lines
      `);
      expect(left.rows).toEqual([
        {
          profiles: 0,
          favorites: 0,
          requests: 0,
          loyalty: 0,
          guest_orders: 1,
          order_lines: 1,
        },
      ]);
    } finally {
      await fresh.close();
    }
  }, 60_000);
});

describe("applying and undoing the table migration", () => {
  it("undoes cleanly, leaves the POS tables, and applies again (TC-P4-083)", async () => {
    const fresh = await createMigratedDatabase();
    try {
      await seedPosData(fresh);
      await addOrder(fresh, null);

      await applyRollback(fresh, FUNCTIONS);
      await applyRollback(fresh, TABLES);
      const state = await fresh.query(`
        select
          (select count(*)::int from pg_class as c
           join pg_namespace as n on n.oid = c.relnamespace
           where n.nspname in ('public', 'private')
             and c.relname in ('online_orders', 'online_order_items',
               'online_order_status_history', 'online_order_tokens',
               'customer_profiles', 'favorites', 'loyalty_transactions',
               'data_requests')) as new_tables,
          to_regprocedure('private.stamp_row()') is null as no_stamp,
          (select count(*)::int from public.orders) as pos_orders,
          (select count(*)::int from public.items) as menu_items
      `);
      expect(state.rows).toEqual([
        { new_tables: 0, no_stamp: true, pos_orders: 2, menu_items: 3 },
      ]);

      await applyMigration(fresh, TABLES);
      await applyMigration(fresh, FUNCTIONS);
      await addOrder(fresh, null);
      const orders = await fresh.query(
        "select count(*)::int as count from public.online_orders",
      );
      expect(orders.rows).toEqual([{ count: 1 }]);
    } finally {
      await fresh.close();
    }
  }, 60_000);

  it("changes nothing when a table would keep RLS off (TC-P4-083)", async () => {
    const fresh = await createBaselineDatabase();
    try {
      await applyMigration(fresh, "20261024011051_restore_rls.sql");
      await fresh.exec("create table private.scratch (id int primary key)");

      await expect(applyMigration(fresh, TABLES)).rejects.toThrow(
        "Row Level Security is still off on: private.scratch",
      );
      const state = await fresh.query(
        "select to_regclass('public.online_orders') is null as no_orders",
      );
      expect(state.rows).toEqual([{ no_orders: true }]);
    } finally {
      await fresh.close();
    }
  }, 60_000);
});
