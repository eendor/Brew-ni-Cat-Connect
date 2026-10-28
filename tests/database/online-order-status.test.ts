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
  listMigrations,
  type Outcome,
  runAs,
  signedIn,
} from "./support/database";

const STATUS = "20261028153552_online_order_status.sql";

const STAFF = "11111111-1111-4111-8111-111111111111";
const OTHER_STAFF = "55555555-5555-4555-8555-555555555555";
const BANNED_STAFF = "66666666-6666-4666-8666-666666666666";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";

const TOKEN = "A".repeat(43);
const FIRST_SALE_ID = 2_000_000_000_000_001;

const SHOP_DATA_SQL = `
  insert into public.categories (id, name) values
    ('coffee', 'Coffee'),
    ('snacks', 'Snacks');

  insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
    ('latte', 'coffee', 'Latte', '',
     '[{"id":"latte-16","name":"16 oz","basePrice":120}]', true),
    ('tako', 'snacks', 'Takoyaki', 'Original|Cheese',
     '[{"name":"6 pcs","basePrice":0,"priceByFlavor":{"Original":80.5,"Cheese":95}}]', true);

  insert into public.inventory (id, item_name, unit, current_stock, reorder_threshold) values
    ('milk', 'Fresh milk', 'ml', 5000, 1000),
    ('beans', 'Espresso beans', 'g', 2000, 500);
`;

const ALL_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

const ALLOWED_STEPS = [
  "pending>accepted",
  "pending>rejected",
  "accepted>preparing",
  "accepted>cancelled",
  "preparing>ready",
  "preparing>cancelled",
  "ready>completed",
  "ready>cancelled",
];

type Answer = Record<string, unknown>;

let db: PGlite;
let keyCounter = 0;
let correlationCounter = 0;

function newKey(): string {
  keyCounter += 1;
  return `00000000-0000-4000-8000-${keyCounter.toString(16).padStart(12, "0")}`;
}

function newCorrelationId(): string {
  correlationCounter += 1;
  return `00000000-0000-4000-9000-${correlationCounter.toString(16).padStart(12, "0")}`;
}

/** Place a pickup order as a guest and return its reference. */
async function placeOrder(
  database: PGlite = db,
  paymentPreference = "Cash",
): Promise<string> {
  const request = {
    idempotencyKey: newKey(),
    trackingToken: TOKEN,
    fulfillment: "pickup",
    customer: {
      name: "Juan Dela Cruz",
      phone: "0912 345 6789",
      notes: "Less ice",
      paymentPreference,
    },
    lines: [
      { itemId: "latte", variantId: "latte-16", flavor: null, quantity: 2 },
      {
        itemId: "tako",
        variantId: "tako-variant-1",
        flavor: "Original",
        quantity: 3,
      },
    ],
    expectedSubtotal: 481.5,
  };
  const outcome = await commitAs<{ result: Answer }>(
    database,
    ANON,
    "select public.place_online_order($1::jsonb) as result",
    [JSON.stringify(request)],
  );
  if (!outcome.ok || outcome.rows[0]?.result.ok !== true) {
    throw new Error(
      `could not place the test order: ${JSON.stringify(outcome)}`,
    );
  }
  return String(outcome.rows[0].result.reference);
}

/** Call set_online_order_status() as `actor` and keep the change. */
async function setStatus(
  actor: Actor,
  reference: string | null,
  from: string | null,
  to: string | null,
  reason: string | null = null,
  correlationId: string | null = newCorrelationId(),
  database: PGlite = db,
): Promise<Outcome<{ result: Answer }>> {
  return commitAs<{ result: Answer }>(
    database,
    actor,
    "select public.set_online_order_status($1, $2, $3, $4, $5::uuid) as result",
    [reference, from, to, reason, correlationId],
  );
}

/** Like `setStatus`, as staff, returning the answer. */
async function move(
  reference: string,
  from: string,
  to: string,
  reason: string | null = null,
  correlationId: string | null = newCorrelationId(),
  database: PGlite = db,
): Promise<Answer> {
  const outcome = await setStatus(
    signedIn(STAFF),
    reference,
    from,
    to,
    reason,
    correlationId,
    database,
  );
  if (!outcome.ok) {
    throw new Error(`set_online_order_status failed: ${outcome.message}`);
  }
  return outcome.rows[0]?.result ?? {};
}

/** Walk an order through the allowed steps up to `status`. */
async function bringTo(reference: string, status: string): Promise<void> {
  const path = ["pending", "accepted", "preparing", "ready", "completed"];
  if (status === "rejected") {
    await move(reference, "pending", "rejected", "Out of milk");
    return;
  }
  if (status === "cancelled") {
    await move(reference, "pending", "accepted");
    await move(reference, "accepted", "cancelled");
    return;
  }
  for (let i = 1; i <= path.indexOf(status); i += 1) {
    await move(reference, path[i - 1] ?? "", path[i] ?? "");
  }
}

async function orderState(reference: string): Promise<Answer | undefined> {
  const result = await db.query<Answer>(
    `select o.status, o.rejection_reason,
       (select count(*)::int from public.online_order_status_history as h
        where h.order_id = o.id) as history
     from public.online_orders as o
     where o.reference = $1`,
    [reference],
  );
  return result.rows[0];
}

async function auditRows(reference: string): Promise<Answer[]> {
  const result = await db.query<Answer>(
    `select actor_id, action, result, details
     from private.staff_audit_log
     where target = $1
     order by id`,
    [reference],
  );
  return result.rows;
}

async function posSales(reference: string): Promise<Answer[]> {
  const result = await db.query<Answer>(
    `select id::text as id, device_id, "timestamp"::float8 as timestamp,
       subtotal::float8 as subtotal, discount_deduction::float8 as discount,
       discount_label, total::float8 as total, payment_method,
       payment_reference, cashier_id, cashier_name, table_label, is_served,
       status, is_voided
     from public.orders
     where table_label = 'Online ' || $1`,
    [reference],
  );
  return result.rows;
}

async function count(sql: string): Promise<number> {
  const result = await db.query<{ count: number }>(sql);
  return result.rows[0]?.count ?? Number.NaN;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(SHOP_DATA_SQL);
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: OTHER_STAFF, appMetadata: { role: "staff" } });
  await addUser(db, {
    id: BANNED_STAFF,
    appMetadata: { role: "staff" },
    bannedUntil: "2999-01-01T00:00:00Z",
  });
  await addUser(db, { id: CUSTOMER });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

// ---------------------------------------------------------------------------
// The status steps

describe("moving an online order through its statuses", () => {
  it("takes an order from pending to completed one step at a time (TC-P6-180)", async () => {
    const reference = await placeOrder();
    const steps = [
      ["pending", "accepted"],
      ["accepted", "preparing"],
      ["preparing", "ready"],
      ["ready", "completed"],
    ] as const;

    for (const [from, to] of steps) {
      const answer = await move(reference, from, to);
      expect(answer, `${from} > ${to}`).toMatchObject({
        ok: true,
        replayed: false,
        reference,
        status: to,
        changedAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/),
      });
    }

    const history = await db.query(
      `select h.from_status, h.to_status, h.actor
       from public.online_order_status_history as h
       join public.online_orders as o on o.id = h.order_id
       where o.reference = $1
       order by h.id`,
      [reference],
    );
    expect(history.rows).toEqual([
      { from_status: null, to_status: "pending", actor: "customer" },
      { from_status: "pending", to_status: "accepted", actor: "shop" },
      { from_status: "accepted", to_status: "preparing", actor: "shop" },
      { from_status: "preparing", to_status: "ready", actor: "shop" },
      { from_status: "ready", to_status: "completed", actor: "shop" },
    ]);

    const columns = await db.query<{ name: string }>(`
      select column_name as name from information_schema.columns
      where table_schema = 'public' and table_name = 'online_order_status_history'
      order by ordinal_position
    `);
    expect(columns.rows.map((column) => column.name)).toEqual([
      "id",
      "order_id",
      "from_status",
      "to_status",
      "actor",
      "changed_at",
      "correlation_id",
    ]);

    const audit = await auditRows(reference);
    expect(audit).toHaveLength(4);
    for (const [index, [from, to]] of steps.entries()) {
      expect(audit[index]).toMatchObject({
        actor_id: STAFF,
        action: "online-order-status",
        result: "done",
        details: { from, to },
      });
    }

    const messages = await count(`
      select count(*)::int as count from realtime.messages as m
      join public.online_orders as o on o.realtime_topic = m.topic
      where o.reference = '${reference}'
    `);
    expect(messages).toBe(4);
  });

  it("allows only the planned steps (TC-P6-181)", async () => {
    const allowed: string[] = [];
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const result = await db.query<{ allowed: boolean }>(
          "select private.is_allowed_shop_step($1, $2) as allowed",
          [from, to],
        );
        if (result.rows[0]?.allowed) {
          allowed.push(`${from}>${to}`);
        }
      }
    }
    expect(allowed.sort()).toEqual([...ALLOWED_STEPS].sort());
    const nulls = await db.query(
      "select private.is_allowed_shop_step(null, 'accepted') as a, private.is_allowed_shop_step('pending', null) as b",
    );
    expect(nulls.rows).toEqual([{ a: false, b: false }]);
  });

  it("refuses skipped, backward and final-status steps without changing the order (TC-P6-181)", async () => {
    const cases = [
      { at: "pending", to: "ready" },
      { at: "pending", to: "completed" },
      { at: "pending", to: "cancelled" },
      { at: "accepted", to: "rejected" },
      { at: "accepted", to: "pending" },
      { at: "preparing", to: "accepted" },
      { at: "ready", to: "preparing" },
      { at: "completed", to: "cancelled" },
      { at: "rejected", to: "accepted" },
      { at: "cancelled", to: "accepted" },
    ];

    for (const { at, to } of cases) {
      const reference = await placeOrder();
      await bringTo(reference, at);
      const before = await orderState(reference);
      const auditBefore = (await auditRows(reference)).length;

      const reason = to === "rejected" ? "Out of milk" : null;
      const answer = await move(reference, at, to, reason);

      expect(answer, `${at} > ${to}`).toEqual({
        ok: false,
        error: "not_allowed",
        status: at,
      });
      expect(await orderState(reference), `${at} > ${to}`).toEqual(before);
      const audit = await auditRows(reference);
      expect(audit).toHaveLength(auditBefore + 1);
      expect(audit.at(-1)).toMatchObject({
        actor_id: STAFF,
        result: "refused",
        details: { from: at, to, error: "not_allowed", current: at },
      });
    }
  }, 60_000);

  it("refuses a change made from a status the order has left (TC-P6-182)", async () => {
    const reference = await placeOrder();
    await move(reference, "pending", "accepted");

    const late = await setStatus(
      signedIn(OTHER_STAFF),
      reference,
      "pending",
      "rejected",
      "Out of milk",
    );
    expect(late).toMatchObject({
      ok: true,
      rows: [{ result: { ok: false, error: "stale", status: "accepted" } }],
    });
    expect(await orderState(reference)).toEqual({
      status: "accepted",
      rejection_reason: null,
      history: 2,
    });
    expect((await auditRows(reference)).at(-1)).toMatchObject({
      actor_id: OTHER_STAFF,
      result: "refused",
      details: {
        from: "pending",
        to: "rejected",
        error: "stale",
        current: "accepted",
      },
    });
  });

  it("needs a reason to reject, and shows it to the customer (TC-P6-183)", async () => {
    const reference = await placeOrder();

    expect(await move(reference, "pending", "rejected")).toEqual({
      ok: false,
      error: "reason_required",
      status: "pending",
    });
    expect(await move(reference, "pending", "rejected", "   ")).toEqual({
      ok: false,
      error: "reason_required",
      status: "pending",
    });
    expect(
      await move(reference, "pending", "rejected", "x".repeat(301)),
    ).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await move(reference, "pending", "accepted", "Sure")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await orderState(reference)).toEqual({
      status: "pending",
      rejection_reason: null,
      history: 1,
    });

    expect(
      await move(reference, "pending", "rejected", "  Out of milk today  "),
    ).toMatchObject({ ok: true, status: "rejected" });
    expect(await orderState(reference)).toEqual({
      status: "rejected",
      rejection_reason: "Out of milk today",
      history: 2,
    });

    const page = await runAs<{ order: Answer }>(
      db,
      ANON,
      "select public.get_online_order($1, $2) as order",
      [reference, TOKEN],
    );
    expect(page).toMatchObject({
      ok: true,
      rows: [
        { order: { status: "rejected", rejectionReason: "Out of milk today" } },
      ],
    });
  });

  it("keeps a cancel note only in the audit log (TC-P6-183)", async () => {
    const reference = await placeOrder();
    await bringTo(reference, "ready");

    expect(
      await move(reference, "ready", "cancelled", "Customer did not come"),
    ).toMatchObject({ ok: true, status: "cancelled" });
    expect(await orderState(reference)).toMatchObject({
      status: "cancelled",
      rejection_reason: null,
    });
    expect((await auditRows(reference)).at(-1)).toMatchObject({
      result: "done",
      details: {
        from: "ready",
        to: "cancelled",
        reason: "Customer did not come",
      },
    });
  });

  it("answers a retry with the same correlation id without changing anything (TC-P6-184)", async () => {
    const reference = await placeOrder();
    const accept = newCorrelationId();

    expect(
      await move(reference, "pending", "accepted", null, accept),
    ).toMatchObject({
      ok: true,
      replayed: false,
    });
    const afterFirst = await orderState(reference);
    const auditAfterFirst = (await auditRows(reference)).length;

    expect(await move(reference, "pending", "accepted", null, accept)).toEqual({
      ok: true,
      replayed: true,
      reference,
      status: "accepted",
    });
    expect(await orderState(reference)).toEqual(afterFirst);
    expect(await auditRows(reference)).toHaveLength(auditAfterFirst);

    expect(
      await move(reference, "pending", "accepted", null, newCorrelationId()),
    ).toEqual({ ok: false, error: "stale", status: "accepted" });

    await move(reference, "accepted", "preparing");
    await move(reference, "preparing", "ready");
    const complete = newCorrelationId();
    const done = await move(reference, "ready", "completed", null, complete);
    const again = await move(reference, "ready", "completed", null, complete);
    expect(again).toEqual({
      ok: true,
      replayed: true,
      reference,
      status: "completed",
      saleId: done.saleId,
    });
    expect(await posSales(reference)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Who may change orders

describe("who may change an online order", () => {
  it("lets only shop staff change orders (TC-P6-185)", async () => {
    const reference = await placeOrder();
    const before = await orderState(reference);

    const refused: [string, Actor][] = [
      ["guest", ANON],
      ["customer", signedIn(CUSTOMER)],
      ["banned staff", signedIn(BANNED_STAFF)],
      ["server key", { role: "service_role" }],
    ];
    for (const [who, actor] of refused) {
      const outcome = await setStatus(actor, reference, "pending", "accepted");
      expect(outcome, who).toMatchObject({
        ok: false,
        code: INSUFFICIENT_PRIVILEGE,
      });
    }
    expect(await orderState(reference)).toEqual(before);
    expect(await auditRows(reference)).toEqual([]);
  });

  it("refuses requests it can't read, and logs an unknown order (TC-P6-185)", async () => {
    const reference = await placeOrder();
    const invalid: [string | null, string | null, string | null][] = [
      [reference.toLowerCase(), "pending", "accepted"],
      [null, "pending", "accepted"],
      [reference, null, "accepted"],
      [reference, "pending", null],
      [reference, "pending", "served"],
      [reference, "new", "accepted"],
    ];
    for (const [ref, from, to] of invalid) {
      const answer = await setStatus(signedIn(STAFF), ref, from, to);
      expect(answer, `${ref} ${from} > ${to}`).toMatchObject({
        ok: true,
        rows: [{ result: { ok: false, error: "invalid" } }],
      });
    }
    expect(await orderState(reference)).toMatchObject({ status: "pending" });

    expect(await move("BNC-ZZZZZZ", "pending", "accepted")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await auditRows("BNC-ZZZZZZ")).toMatchObject([
      { actor_id: STAFF, result: "refused", details: { error: "not_found" } },
    ]);
  });

  it("keeps the audit log and sale links away from the API (TC-P6-189)", async () => {
    const fn = await db.query(`
      select
        p.prosecdef as security_definer,
        p.proconfig as settings,
        has_function_privilege('anon', p.oid, 'execute') as anon,
        has_function_privilege('authenticated', p.oid, 'execute') as signed_in,
        has_function_privilege('service_role', p.oid, 'execute') as server
      from pg_proc as p
      where p.oid = 'public.set_online_order_status(text, text, text, text, uuid)'::regprocedure
    `);
    expect(fn.rows).toEqual([
      {
        security_definer: true,
        settings: ['search_path=""'],
        anon: false,
        signed_in: true,
        server: false,
      },
    ]);

    const helpers = await db.query(`
      select
        p.oid::regprocedure::text as name,
        p.proconfig as settings,
        has_function_privilege('anon', p.oid, 'execute') as anon,
        has_function_privilege('authenticated', p.oid, 'execute') as signed_in
      from pg_proc as p
      where p.oid in (
        'private.is_allowed_shop_step(text, text)'::regprocedure,
        'private.record_online_sale(uuid, timestamptz)'::regprocedure
      )
      order by 1
    `);
    expect(helpers.rows).toEqual([
      {
        name: "private.is_allowed_shop_step(text,text)",
        settings: ['search_path=""'],
        anon: false,
        signed_in: false,
      },
      {
        name: "private.record_online_sale(uuid,timestamp with time zone)",
        settings: ['search_path=""'],
        anon: false,
        signed_in: false,
      },
    ]);

    const tables = await db.query(`
      select
        c.relname as table,
        c.relrowsecurity as rls,
        (select count(*)::int from pg_policies as p
         where p.schemaname = 'private' and p.tablename = c.relname) as policies,
        coalesce((
          select array_agg(distinct a.grantee::regrole::text order by a.grantee::regrole::text)
          from aclexplode(c.relacl) as a
          where a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
        ), '{}') as api_roles
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'private'
        and c.relname in ('staff_audit_log', 'online_order_sales')
      order by 1
    `);
    expect(tables.rows).toEqual([
      { table: "online_order_sales", rls: true, policies: 0, api_roles: [] },
      { table: "staff_audit_log", rls: true, policies: 0, api_roles: [] },
    ]);

    for (const table of [
      "private.staff_audit_log",
      "private.online_order_sales",
    ]) {
      const outcome = await runAs(
        db,
        signedIn(STAFF),
        `select * from ${table}`,
      );
      expect(outcome, table).toMatchObject({
        ok: false,
        code: INSUFFICIENT_PRIVILEGE,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// POS sales

describe("recording a completed online order in the POS", () => {
  it("adds one POS sale with the order's lines (TC-P6-186)", async () => {
    const reference = await placeOrder(db, "GCash");
    const before = Date.now();
    await bringTo(reference, "ready");
    const done = await move(reference, "ready", "completed");

    const saleId = Number(done.saleId);
    expect(saleId).toBeGreaterThanOrEqual(FIRST_SALE_ID);
    expect(saleId).toBeLessThan(Number.MAX_SAFE_INTEGER);

    const sales = await posSales(reference);
    expect(sales).toEqual([
      {
        id: String(saleId),
        device_id: "online",
        timestamp: expect.any(Number),
        subtotal: 481.5,
        discount: 0,
        discount_label: "",
        total: 481.5,
        payment_method: "GCASH",
        payment_reference: null,
        cashier_id: null,
        cashier_name: "Online order",
        table_label: `Online ${reference}`,
        is_served: true,
        status: "COMPLETED",
        is_voided: false,
      },
    ]);
    expect(Number(sales[0]?.timestamp)).toBeGreaterThanOrEqual(before - 60_000);

    const lines = await db.query(
      `select id::text as id, item_id, item_name, variant_id, variant_name,
         flavor, quantity, unit_price::float8 as unit_price,
         total_price::float8 as total_price
       from public.order_items where order_id = $1 order by id`,
      [saleId],
    );
    expect(lines.rows).toEqual([
      {
        id: String(BigInt(saleId) * 1000n + 1n),
        item_id: "latte",
        item_name: "Latte",
        variant_id: "latte-16",
        variant_name: "16 oz",
        flavor: null,
        quantity: 2,
        unit_price: 120,
        total_price: 240,
      },
      {
        id: String(BigInt(saleId) * 1000n + 2n),
        item_id: "tako",
        item_name: "Takoyaki",
        variant_id: "tako-variant-1",
        variant_name: "6 pcs",
        flavor: "Original",
        quantity: 3,
        unit_price: 80.5,
        total_price: 241.5,
      },
    ]);

    const cash = await placeOrder();
    await bringTo(cash, "completed");
    expect(await posSales(cash)).toMatchObject([{ payment_method: "CASH" }]);
  });

  it("never records the same order twice (TC-P6-186)", async () => {
    const reference = await placeOrder();
    await bringTo(reference, "completed");
    const sales = await posSales(reference);
    expect(sales).toHaveLength(1);

    const again = await db.query<{ sale: string }>(
      `select private.record_online_sale(o.id, now())::text as sale
       from public.online_orders as o where o.reference = $1`,
      [reference],
    );
    expect(again.rows).toEqual([{ sale: sales[0]?.id }]);
    expect(await posSales(reference)).toHaveLength(1);
  });

  it("makes no sale and leaves the stock alone for rejected and cancelled orders (TC-P6-187)", async () => {
    const stock = async () =>
      (
        await db.query(
          "select id, current_stock::float8 as stock from public.inventory order by id",
        )
      ).rows;
    const stockBefore = await stock();
    const salesBefore = await count(
      "select count(*)::int as count from public.orders",
    );

    const rejected = await placeOrder();
    await bringTo(rejected, "rejected");
    const cancelled = await placeOrder();
    await bringTo(cancelled, "ready");
    await move(cancelled, "ready", "cancelled");

    expect(await posSales(rejected)).toEqual([]);
    expect(await posSales(cancelled)).toEqual([]);
    expect(
      await count("select count(*)::int as count from public.orders"),
    ).toBe(salesBefore);
    expect(await stock()).toEqual(stockBefore);
  });
});

// ---------------------------------------------------------------------------
// Realtime, undo and apply again

describe("letting the POS app hear about new orders", () => {
  it("adds online orders to the Realtime publication (TC-P6-188)", async () => {
    const published = await db.query<{ table: string }>(`
      select tablename as table from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
      order by 1
    `);
    expect(published.rows.map((row) => row.table)).toEqual([
      "categories",
      "expenses",
      "inventory",
      "items",
      "online_orders",
      "order_items",
      "orders",
    ]);
  });

  it("applies on a database without the publication (TC-P6-188)", async () => {
    const fresh = await createBaselineDatabase();
    try {
      await fresh.exec("drop publication supabase_realtime");
      for (const fileName of listMigrations()) {
        await applyMigration(fresh, fileName);
      }
      const publications = await fresh.query(
        "select count(*)::int as count from pg_publication",
      );
      expect(publications.rows).toEqual([{ count: 0 }]);
      expect(
        (
          await fresh.query(
            "select to_regprocedure('public.set_online_order_status(text, text, text, text, uuid)') is not null as present",
          )
        ).rows,
      ).toEqual([{ present: true }]);
    } finally {
      await fresh.close();
    }
  }, 60_000);
});

describe("applying and undoing the status migration", () => {
  it("undoes cleanly, keeps orders and sales, and applies again (TC-P6-190)", async () => {
    const fresh = await createMigratedDatabase(STATUS);
    try {
      await fresh.exec(SHOP_DATA_SQL);
      await addUser(fresh, { id: STAFF, appMetadata: { role: "staff" } });
      const first = await placeOrder(fresh);
      for (const [from, to] of [
        ["pending", "accepted"],
        ["accepted", "preparing"],
        ["preparing", "ready"],
        ["ready", "completed"],
      ] as const) {
        await move(first, from, to, null, newCorrelationId(), fresh);
      }

      await applyRollback(fresh, STATUS);
      const state = await fresh.query(`
        select
          to_regprocedure('public.set_online_order_status(text, text, text, text, uuid)') is null as no_function,
          to_regprocedure('private.is_allowed_shop_step(text, text)') is null as no_steps,
          to_regprocedure('private.record_online_sale(uuid, timestamptz)') is null as no_sale_function,
          to_regclass('private.staff_audit_log') is null as no_audit,
          to_regclass('private.online_order_sales') is null as no_links,
          (select count(*)::int from pg_publication_tables
           where pubname = 'supabase_realtime' and tablename = 'online_orders') as published,
          (select count(*)::int from public.online_orders) as orders,
          (select count(*)::int from public.online_order_status_history) as history,
          (select count(*)::int from public.orders where device_id = 'online') as sales
      `);
      expect(state.rows).toEqual([
        {
          no_function: true,
          no_steps: true,
          no_sale_function: true,
          no_audit: true,
          no_links: true,
          published: 0,
          orders: 1,
          history: 5,
          sales: 1,
        },
      ]);

      await applyMigration(fresh, STATUS);
      const second = await placeOrder(fresh);
      let last: Answer = {};
      for (const [from, to] of [
        ["pending", "accepted"],
        ["accepted", "preparing"],
        ["preparing", "ready"],
        ["ready", "completed"],
      ] as const) {
        last = await move(second, from, to, null, newCorrelationId(), fresh);
      }
      expect(last).toMatchObject({ ok: true, status: "completed" });
      const ids = await fresh.query<{ id: string }>(
        "select id::text as id from public.orders where device_id = 'online' order by id",
      );
      expect(ids.rows.map((row) => BigInt(row.id))).toEqual([
        BigInt(FIRST_SALE_ID),
        BigInt(FIRST_SALE_ID) + 1n,
      ]);
    } finally {
      await fresh.close();
    }
  }, 60_000);
});
