// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";

import { mapMenuCatalog } from "@/lib/menu/map-menu-catalog";
import {
  isOrderRealtimeTopic,
  isOrderReference,
  ORDER_STATUS_CHANGED_EVENT,
} from "@/lib/orders/types";
import {
  addCatalogSelection,
  createInitialCartState,
} from "@/lib/ordering/cart-reducer";
import { toCentavos } from "@/lib/ordering/cart-pricing";
import { validatePhoneNumber } from "@/lib/ordering/validation";
import type { CategoryRow, ItemRow } from "@/types/menu";
import type { CartItemSelection } from "@/types/ordering";

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

const FUNCTIONS = "20261024064700_online_order_functions.sql";
const TABLES = "20261024064600_customer_tables.sql";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const OTHER_CUSTOMER = "33333333-3333-4333-8333-333333333333";
const DELETED_CUSTOMER = "44444444-4444-4444-8444-444444444444";

const TOKEN = "A".repeat(43);
const OTHER_TOKEN = "B".repeat(43);

const MENU_SQL = `
  insert into public.categories (id, name) values
    ('coffee', 'Coffee'),
    ('snacks', 'Snacks');

  insert into public.items (id, category_id, name, flavors, variants_json, is_available) values
    ('latte', 'coffee', 'Latte', '',
     '[{"id":"latte-16","name":"16 oz","basePrice":120}]', true),
    ('mocha', 'coffee', 'Mocha', '',
     '[{"id":"mocha-16","name":"16 oz","basePrice":130}]', false),
    ('seasonal', 'coffee', 'Seasonal', '',
     '[{"id":"seasonal-16","name":"16 oz","basePrice":150}]', null),
    ('tako', 'snacks', 'Takoyaki', 'Original|Cheese',
     '[{"name":"6 pcs","basePrice":0,"priceByFlavor":{"Original":80.5,"Cheese":95}}]', true);
`;

let db: PGlite;
let keyCounter = 0;

/** A new idempotency key for each test order. */
function newKey(): string {
  keyCounter += 1;
  return `00000000-0000-4000-8000-${keyCounter.toString(16).padStart(12, "0")}`;
}

type Request = {
  idempotencyKey: string;
  trackingToken: string;
  fulfillment: string;
  customer: {
    name: string;
    phone: string;
    notes: string;
    paymentPreference: string;
  };
  lines: unknown[];
  expectedSubtotal: number;
};

function orderRequest(overrides: Partial<Request> = {}): Request {
  return {
    idempotencyKey: newKey(),
    trackingToken: TOKEN,
    fulfillment: "pickup",
    customer: {
      name: "  Juan Dela Cruz ",
      phone: "0912 345 6789",
      notes: " Less ice please ",
      paymentPreference: "GCash",
    },
    lines: [
      { itemId: "latte", variantId: "latte-16", flavor: null, quantity: 2 },
      {
        itemId: "tako",
        variantId: "tako-variant-1",
        flavor: " Original ",
        quantity: 3,
      },
    ],
    expectedSubtotal: 481.5,
    ...overrides,
  };
}

type Result = Record<string, unknown>;

async function place(
  request: unknown,
  actor: Actor = ANON,
  correlationId: string | null = null,
): Promise<Result> {
  const outcome = await commitAs<{ result: Result }>(
    db,
    actor,
    "select public.place_online_order($1::jsonb, $2::uuid) as result",
    [JSON.stringify(request), correlationId],
  );
  if (!outcome.ok) {
    throw new Error(`place_online_order failed: ${outcome.message}`);
  }
  return outcome.rows[0]?.result ?? {};
}

async function read(
  reference: string,
  token: string | null,
  actor: Actor = ANON,
): Promise<Result | null> {
  const outcome = await runAs<{ order: Result | null }>(
    db,
    actor,
    "select public.get_online_order($1, $2) as order",
    [reference, token],
  );
  if (!outcome.ok) {
    throw new Error(`get_online_order failed: ${outcome.message}`);
  }
  return outcome.rows[0]?.order ?? null;
}

async function orderCount(): Promise<number> {
  const result = await db.query<{ count: number }>(
    "select count(*)::int as count from public.online_orders",
  );
  return result.rows[0]?.count ?? Number.NaN;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(MENU_SQL);
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER });
  await addUser(db, { id: OTHER_CUSTOMER });
  await addUser(db, {
    id: DELETED_CUSTOMER,
    deletedAt: "2026-10-01T00:00:00Z",
  });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

// ---------------------------------------------------------------------------
// Pricing parity: the database must price a cart exactly as the cart does.

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  const value = values[Math.floor(random() * values.length)];
  if (value === undefined) {
    throw new Error("pick() needs at least one value");
  }
  return value;
}

/** Prices as JSON text, including the odd ones the POS could save. */
const PRICES = [
  "120",
  "120.0",
  "0",
  "-0",
  "85.5",
  "80.555",
  "0.004",
  "0.005",
  "1.005",
  "0.1",
  "-5",
  "1e21",
  "1e300",
  "1.7e308",
  "1e400",
  "3.0E2",
  '"120"',
  '" 85 "',
  '"0x1F"',
  '"0o17"',
  '"0B101"',
  '""',
  '" "',
  '"abc"',
  '"1e3"',
  '"Infinity"',
  '"-0"',
  '".5"',
  '"5."',
  '"+5"',
  '"0x"',
  '"1e400"',
  '"1,000"',
  '"\\t42\\n"',
  '"\\u00a042"',
  '"\\ufeff7"',
  '"\\u200b7"',
  "null",
  "true",
  "[]",
  "{}",
] as const;

const FLAVOR_KEYS = [
  "Original",
  " Original ",
  "Cheese",
  "cheese",
  "",
  " ",
  "1",
  "01",
  "10",
  "2",
  "Spicy",
] as const;

const ITEM_FLAVORS = [
  "",
  "Original|Cheese",
  " Original | Cheese ",
  "Original|Original",
  "Cheese|",
  "|",
  "Spicy|Original",
  "1|2|10",
] as const;

function flavorPricesJson(random: () => number): string {
  const kind = random();
  if (kind < 0.1) {
    return pick(random, ["[]", '"x"', "null", "5"]);
  }
  const entries: string[] = [];
  const count = Math.floor(random() * 5);
  for (let index = 0; index < count; index += 1) {
    entries.push(
      `${JSON.stringify(pick(random, FLAVOR_KEYS))}:${pick(random, PRICES)}`,
    );
  }
  return `{${entries.join(",")}}`;
}

function variantJson(random: () => number): string {
  if (random() < 0.08) {
    return pick(random, ["null", '"x"', "5", "[]"]);
  }
  const fields: string[] = [];
  if (random() < 0.7) {
    fields.push(
      `"id":${pick(random, ['"v1"', '" v1 "', '""', '"v2"', "5", "null", '"a-variant-1"'])}`,
    );
  }
  if (random() < 0.9) {
    fields.push(
      `"name":${pick(random, ['"16 oz"', '" 12 oz "', '""', '"  "', "12", "null"])}`,
    );
  }
  if (random() < 0.85) {
    fields.push(`"basePrice":${pick(random, PRICES)}`);
  }
  if (random() < 0.15) {
    // A repeated key: the last one counts, as in JSON.parse.
    fields.push(`"basePrice":${pick(random, PRICES)}`);
  }
  if (random() < 0.5) {
    fields.push(`"priceByFlavor":${flavorPricesJson(random)}`);
  }
  return `{${fields.join(",")}}`;
}

function variantsText(random: () => number): string {
  const kind = random();
  if (kind < 0.05) {
    return pick(random, ["", "  ", "not json", '{"id":"v1"}', "null", "[1,"]);
  }
  const variants: string[] = [];
  const count = Math.floor(random() * 4);
  for (let index = 0; index < count; index += 1) {
    variants.push(variantJson(random));
  }
  return `[${variants.join(",")}]`;
}

type Catalog = Readonly<{
  categories: readonly CategoryRow[];
  items: readonly ItemRow[];
}>;

function randomCatalog(random: () => number): Catalog {
  const categories: CategoryRow[] = [];
  for (const id of ["c1", " c1", "c2"]) {
    if (random() < 0.75) {
      categories.push({
        id,
        name: pick(random, ["Coffee", "  ", "", "Snacks", " Tea "]),
      });
    }
  }
  // Each item's category exists or is empty, as the foreign key requires.
  const categoryIds = [...categories.map((category) => category.id), null];
  const items: ItemRow[] = [];
  for (const id of ["a", "b", " a", "a::b", "c", "  "]) {
    if (random() < 0.7) {
      items.push({
        id,
        category_id: pick(random, categoryIds),
        name: pick(random, ["Latte", " ", "", " Mocha "]),
        flavors: pick(random, ITEM_FLAVORS),
        variants_json: variantsText(random),
        is_available: pick(random, [true, true, true, false, null]),
      });
    }
  }
  return { categories, items };
}

const QUANTITIES = [
  "1",
  "2",
  "3",
  "1.0",
  "0",
  "-1",
  "1.5",
  "1e15",
  "9007199254740991",
  "9007199254740992",
  "4503599627370496",
  "1e400",
  '"2"',
  "null",
  "true",
] as const;

function randomLinesText(random: () => number, catalog: Catalog): string {
  const itemIds = [...catalog.items.map((item) => item.id), "zzz", "a "];
  const lines: string[] = [];
  const count = 1 + Math.floor(random() * 6);
  for (let index = 0; index < count; index += 1) {
    const itemId = pick(random, itemIds);
    const fields = [
      `"itemId":${random() < 0.05 ? "5" : JSON.stringify(itemId)}`,
      `"variantId":${JSON.stringify(
        pick(random, [
          "v1",
          " v1 ",
          "v2",
          "5",
          "",
          "a-variant-1",
          `${itemId}-variant-1`,
          `${itemId}-variant-2`,
        ]),
      )}`,
      `"flavor":${pick(random, [
        "null",
        '"Original"',
        '" Original "',
        '"Cheese"',
        '""',
        '"  "',
        '"cheese"',
        '"Spicy"',
        '"1"',
        '"10"',
        "5",
      ])}`,
      `"quantity":${pick(random, QUANTITIES)}`,
    ];
    lines.push(`{${fields.join(",")}}`);
    // Repeat a line now and then so the cart merges it.
    if (random() < 0.25) {
      lines.push(`{${fields.join(",")}}`);
    }
  }
  return `[${lines.join(",")}]`;
}

type Priced = {
  problems: { index: number; reason: string }[];
  lines: {
    itemId: string;
    itemName: string;
    variantId: string;
    variantName: string;
    flavor: string | null;
    unitCentavos: number;
    quantity: number;
    lineCentavos: number;
  }[];
  subtotalCentavos: number;
};

/** What the cart makes of the same lines. */
function priceWithCart(catalog: Catalog, linesText: string): Priced {
  const menu = mapMenuCatalog(catalog.categories, catalog.items);
  const selections = JSON.parse(linesText) as CartItemSelection[];
  let state = createInitialCartState();
  const problems: Priced["problems"] = [];
  selections.forEach((selection, index) => {
    const result = addCatalogSelection(state, menu, selection);
    if (result.ok) {
      state = result.state;
    } else {
      problems.push({ index, reason: result.reason });
    }
  });
  const zero = (value: number) => (Object.is(value, -0) ? 0 : value);
  const lines = state.lines.map((line) => ({
    itemId: line.itemId,
    itemName: line.itemName,
    variantId: line.variantId,
    variantName: line.variantName,
    flavor: line.flavor,
    unitCentavos: zero(toCentavos(line.unitPrice)),
    quantity: line.quantity,
    lineCentavos: zero(toCentavos(line.unitPrice) * line.quantity),
  }));
  return {
    problems,
    lines,
    subtotalCentavos: lines.reduce((sum, line) => sum + line.lineCentavos, 0),
  };
}

async function priceWithDatabase(
  catalog: Catalog,
  linesText: string,
): Promise<Priced> {
  return db.transaction(async (tx) => {
    try {
      await tx.exec("delete from public.items; delete from public.categories;");
      for (const category of catalog.categories) {
        await tx.query(
          "insert into public.categories (id, name) values ($1, $2)",
          [category.id, category.name],
        );
      }
      for (const item of catalog.items) {
        await tx.query(
          `insert into public.items (id, category_id, name, flavors, variants_json, is_available)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            item.id,
            item.category_id,
            item.name,
            item.flavors,
            item.variants_json,
            item.is_available,
          ],
        );
      }
      const result = await tx.query<{ priced: Priced }>(
        "select private.price_cart($1::jsonb) as priced",
        [linesText],
      );
      const priced = result.rows[0]?.priced;
      if (!priced) {
        throw new Error("price_cart returned nothing");
      }
      return priced;
    } finally {
      await tx.rollback();
    }
  });
}

describe("pricing a cart in the database", () => {
  it("gives the same lines, problems and subtotal as the cart for random menus (TC-P4-084)", async () => {
    const random = mulberry32(20261024);
    for (let run = 0; run < 250; run += 1) {
      const catalog = randomCatalog(random);
      const linesText = randomLinesText(random, catalog);
      const expected = priceWithCart(catalog, linesText);
      const actual = await priceWithDatabase(catalog, linesText);
      expect(
        actual,
        `run ${run}: ${JSON.stringify({ catalog, linesText })}`,
      ).toEqual(expected);
    }
  }, 120_000);

  it("accepts the same phone numbers as checkout (TC-P4-084)", async () => {
    const phones = [
      "09123456789",
      "0912 345 6789",
      "0912-345-6789",
      "(0912) 345 6789",
      "+63 912 345 6789",
      "+639123456789",
      " 0912　345 6789\t",
      "0912345678",
      "091234567890",
      "08123456789",
      "+63 812 345 6789",
      "+6309123456789",
      "63 912 345 6789",
      "0912.345.6789",
      "０９１２３４５６７８９",
      "0912​3456789",
      "",
    ];
    for (const phone of phones) {
      const result = await db.query<{ normalized: string | null }>(
        "select private.normalize_phone($1) as normalized",
        [phone],
      );
      const normalized = result.rows[0]?.normalized ?? null;
      expect(normalized !== null, JSON.stringify(phone)).toBe(
        validatePhoneNumber(phone),
      );
      if (normalized !== null) {
        expect(normalized).toMatch(/^\+639\d{9}$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Place order

describe("placing an online order", () => {
  it("saves a guest order priced from the menu, and the order link reads it (TC-P4-085)", async () => {
    const request = orderRequest();
    const correlationId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

    const placed = await place(request, ANON, correlationId);
    expect(placed).toMatchObject({
      ok: true,
      created: true,
      status: "pending",
    });
    expect(isOrderReference(placed.reference)).toBe(true);
    expect(placed.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    const saved = await db.query(
      `select o.customer_id, o.customer_name, o.customer_phone, o.notes,
              o.payment_preference, o.subtotal, o.item_count, o.status,
              o.fulfillment, o.idempotency_key, o.realtime_topic,
              t.token_hash = sha256(convert_to($2, 'UTF8')) as token_matches
       from public.online_orders as o
       join private.online_order_tokens as t on t.order_id = o.id
       where o.reference = $1`,
      [placed.reference, TOKEN],
    );
    expect(saved.rows).toEqual([
      {
        customer_id: null,
        customer_name: "Juan Dela Cruz",
        customer_phone: "+639123456789",
        notes: "Less ice please",
        payment_preference: "GCash",
        subtotal: "481.50",
        item_count: 5,
        status: "pending",
        fulfillment: "pickup",
        idempotency_key: request.idempotencyKey,
        realtime_topic: expect.any(String),
        token_matches: true,
      },
    ]);

    const history = await db.query(
      `select h.from_status, h.to_status, h.actor, h.correlation_id,
              h.changed_at = o.created_at as at_creation
       from public.online_order_status_history as h
       join public.online_orders as o on o.id = h.order_id
       where o.reference = $1`,
      [placed.reference],
    );
    expect(history.rows).toEqual([
      {
        from_status: null,
        to_status: "pending",
        actor: "customer",
        correlation_id: correlationId,
        at_creation: true,
      },
    ]);

    const order = await read(String(placed.reference), TOKEN);
    expect(order).toEqual({
      reference: placed.reference,
      status: "pending",
      fulfillment: "pickup",
      customerName: "Juan Dela Cruz",
      paymentPreference: "GCash",
      notes: "Less ice please",
      items: [
        {
          itemId: "latte",
          itemName: "Latte",
          variantId: "latte-16",
          variantName: "16 oz",
          flavor: null,
          unitPrice: 120,
          quantity: 2,
          lineTotal: 240,
        },
        {
          itemId: "tako",
          itemName: "Takoyaki",
          variantId: "tako-variant-1",
          variantName: "6 pcs",
          flavor: "Original",
          unitPrice: 80.5,
          quantity: 3,
          lineTotal: 241.5,
        },
      ],
      subtotal: 481.5,
      itemCount: 5,
      rejectionReason: null,
      createdAt: placed.createdAt,
      statusHistory: [{ status: "pending", changedAt: placed.createdAt }],
      realtimeTopic: saved.rows[0] && (saved.rows[0] as Result).realtime_topic,
    });
    expect(isOrderRealtimeTopic(order?.realtimeTopic)).toBe(true);
  });

  it("returns the same order for a retry, and never saves it twice (TC-P4-086)", async () => {
    const request = orderRequest();
    const first = await place(request);
    const before = await orderCount();

    const retry = await place(request);
    expect(retry).toEqual({ ...first, created: false });

    // A retry sees the order's current status.
    await db.query(
      "update public.online_orders set status = 'accepted' where reference = $1",
      [first.reference],
    );
    expect(await place(request)).toMatchObject({
      ok: true,
      created: false,
      reference: first.reference,
      status: "accepted",
    });

    // The key belongs to that order and its token only.
    expect(await place({ ...request, trackingToken: OTHER_TOKEN })).toEqual({
      ok: false,
      reason: "invalid-request",
    });
    expect(await orderCount()).toBe(before);

    // A new checkout is a new order, even with the same cart.
    const next = await place({ ...request, idempotencyKey: newKey() });
    expect(next).toMatchObject({ ok: true, created: true });
    expect(next.reference).not.toBe(first.reference);
    expect(await orderCount()).toBe(before + 1);
  });

  it("checks the checkout details like the form, and saves nothing on a mistake (TC-P4-087)", async () => {
    const before = await orderCount();
    const withCustomer = (customer: Partial<Request["customer"]>) =>
      orderRequest({ customer: { ...orderRequest().customer, ...customer } });

    expect(
      await place(
        withCustomer({ name: " \t ", phone: "", notes: "x".repeat(501) }),
      ),
    ).toEqual({
      ok: false,
      reason: "invalid-details",
      fieldErrors: { name: "required", phone: "required", notes: "too-long" },
    });
    expect(
      await place(withCustomer({ name: "x".repeat(101), phone: "12345" })),
    ).toEqual({
      ok: false,
      reason: "invalid-details",
      fieldErrors: { name: "too-long", phone: "invalid" },
    });
    expect(await orderCount()).toBe(before);

    const longest = await place(
      withCustomer({
        name: "x".repeat(100),
        phone: "+63 912-345-6789",
        notes: "y".repeat(500),
      }),
    );
    expect(longest).toMatchObject({ ok: true, created: true });
    const saved = await db.query(
      "select customer_phone from public.online_orders where reference = $1",
      [longest.reference],
    );
    expect(saved.rows).toEqual([{ customer_phone: "+639123456789" }]);
  });

  it("refuses a request that is not a Place order request (TC-P4-088)", async () => {
    const before = await orderCount();
    const valid = orderRequest();
    const line = {
      itemId: "latte",
      variantId: "latte-16",
      flavor: null,
      quantity: 1,
    };
    const invalid: unknown[] = [
      null,
      [],
      "order",
      { ...valid, idempotencyKey: "not-a-uuid" },
      { ...valid, idempotencyKey: undefined },
      { ...valid, trackingToken: "short" },
      { ...valid, trackingToken: `${"A".repeat(42)}=` },
      { ...valid, fulfillment: "external-rider" },
      { ...valid, customer: null },
      { ...valid, customer: { ...valid.customer, name: 5 } },
      { ...valid, customer: { ...valid.customer, notes: null } },
      { ...valid, customer: { ...valid.customer, paymentPreference: "Card" } },
      { ...valid, lines: {} },
      { ...valid, lines: [line, null] },
      { ...valid, lines: [{ ...line, itemId: 5 }] },
      { ...valid, lines: [{ ...line, variantId: null }] },
      { ...valid, lines: [{ ...line, flavor: 5 }] },
      { ...valid, lines: [{ ...line, quantity: "1" }] },
      { ...valid, lines: Array.from({ length: 201 }, () => line) },
      { ...valid, expectedSubtotal: "481.5" },
      { ...valid, expectedSubtotal: -1 },
    ];
    for (const request of invalid) {
      expect(
        await place(request),
        JSON.stringify(request)?.slice(0, 120),
      ).toEqual({
        ok: false,
        reason: "invalid-request",
      });
    }

    expect(await place({ ...valid, lines: [] })).toEqual({
      ok: false,
      reason: "empty-cart",
    });
    expect(await orderCount()).toBe(before);
  });

  it("names each line it cannot order, and asks again when a price changed (TC-P4-089)", async () => {
    const before = await orderCount();
    const unavailable = await place(
      orderRequest({
        lines: [
          { itemId: "latte", variantId: "latte-16", flavor: null, quantity: 1 },
          { itemId: "mocha", variantId: "mocha-16", flavor: null, quantity: 1 },
          {
            itemId: "seasonal",
            variantId: "seasonal-16",
            flavor: null,
            quantity: 1,
          },
          { itemId: "gone", variantId: "gone-1", flavor: null, quantity: 1 },
          { itemId: "latte", variantId: "latte-12", flavor: null, quantity: 1 },
          {
            itemId: "tako",
            variantId: "tako-variant-1",
            flavor: null,
            quantity: 1,
          },
          {
            itemId: "tako",
            variantId: "tako-variant-1",
            flavor: "Spicy",
            quantity: 1,
          },
          { itemId: "latte", variantId: "latte-16", flavor: null, quantity: 0 },
        ],
        expectedSubtotal: 120,
      }),
    );
    expect(unavailable).toEqual({
      ok: false,
      reason: "line-unavailable",
      lines: [
        { index: 1, reason: "item-unavailable" },
        { index: 2, reason: "availability-unknown" },
        { index: 3, reason: "unknown-item" },
        { index: 4, reason: "unknown-variant" },
        { index: 5, reason: "missing-price" },
        { index: 6, reason: "unknown-flavor" },
        { index: 7, reason: "invalid-quantity" },
      ],
    });

    expect(await place(orderRequest({ expectedSubtotal: 400 }))).toEqual({
      ok: false,
      reason: "price-changed",
      subtotal: 481.5,
    });

    await db.query(
      `update public.items
       set variants_json = '[{"id":"latte-16","name":"16 oz","basePrice":125}]'
       where id = 'latte'`,
    );
    try {
      expect(await place(orderRequest())).toEqual({
        ok: false,
        reason: "price-changed",
        subtotal: 491.5,
      });
      expect(await orderCount()).toBe(before);
      expect(
        await place(orderRequest({ expectedSubtotal: 491.5 })),
      ).toMatchObject({
        ok: true,
        created: true,
      });
    } finally {
      await db.query(
        `update public.items
         set variants_json = '[{"id":"latte-16","name":"16 oz","basePrice":120}]'
         where id = 'latte'`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Reading an order

describe("reading an online order", () => {
  it("shows an order only with its token, to its customer, or to staff (TC-P4-090)", async () => {
    const guest = await place(orderRequest());
    const reference = String(guest.reference);

    expect(await read(reference, OTHER_TOKEN)).toBeNull();
    expect(await read(reference, null)).toBeNull();
    expect(await read(reference, `${TOKEN} `)).toBeNull();
    expect(await read(reference.toLowerCase(), TOKEN)).toBeNull();
    expect(await read("BNC-0000OO", TOKEN)).toBeNull();
    expect(await read(reference, null, signedIn(CUSTOMER))).toBeNull();
    expect(await read(reference, null, signedIn(STAFF))).toMatchObject({
      reference,
    });

    // A signed-in customer's order is linked to them.
    const mine = await place(
      orderRequest({ trackingToken: OTHER_TOKEN }),
      signedIn(CUSTOMER),
    );
    const mineReference = String(mine.reference);
    const linked = await db.query(
      "select customer_id from public.online_orders where reference = $1",
      [mineReference],
    );
    expect(linked.rows).toEqual([{ customer_id: CUSTOMER }]);
    expect(await read(mineReference, null, signedIn(CUSTOMER))).toMatchObject({
      reference: mineReference,
    });
    expect(
      await read(mineReference, null, signedIn(OTHER_CUSTOMER)),
    ).toBeNull();
    expect(await read(mineReference, OTHER_TOKEN)).toMatchObject({
      reference: mineReference,
    });

    // A deleted account orders as a guest.
    const deleted = await place(orderRequest(), signedIn(DELETED_CUSTOMER));
    const unlinked = await db.query(
      "select customer_id from public.online_orders where reference = $1",
      [deleted.reference],
    );
    expect(unlinked.rows).toEqual([{ customer_id: null }]);
  });
});

// ---------------------------------------------------------------------------
// Live status

describe("broadcasting status changes", () => {
  it("sends one message on the order's topic for each status change (TC-P4-091)", async () => {
    const placed = await place(orderRequest());
    const order = await read(String(placed.reference), TOKEN);
    const topic = String(order?.realtimeTopic);
    const messages = async () =>
      (
        await db.query<Result>(
          "select event, payload, private from realtime.messages where topic = $1 order by inserted_at",
          [topic],
        )
      ).rows;

    expect(await messages()).toEqual([]);

    await db.query(
      "update public.online_orders set status = 'accepted' where reference = $1",
      [placed.reference],
    );
    await db.query(
      "update public.online_orders set notes = 'x', status = status where reference = $1",
      [placed.reference],
    );
    await db.query(
      "update public.online_orders set status = 'preparing' where reference = $1",
      [placed.reference],
    );

    const sent = await messages();
    expect(sent).toEqual([
      {
        event: ORDER_STATUS_CHANGED_EVENT,
        payload: { status: "accepted", changedAt: expect.any(String) },
        private: false,
      },
      {
        event: ORDER_STATUS_CHANGED_EVENT,
        payload: { status: "preparing", changedAt: expect.any(String) },
        private: false,
      },
    ]);
  });

  it("still saves the change when the broadcast fails (TC-P4-091)", async () => {
    const placed = await place(orderRequest());
    await db.transaction(async (tx) => {
      try {
        await tx.exec(`
          create or replace function realtime.send(
            payload jsonb, event text, topic text, private boolean default true
          ) returns void language plpgsql as $$
          begin
            raise exception 'Realtime is down';
          end;
          $$;
        `);
        const updated = await tx.query(
          "update public.online_orders set status = 'accepted' where reference = $1 returning status",
          [placed.reference],
        );
        expect(updated.rows).toEqual([{ status: "accepted" }]);
      } finally {
        await tx.rollback();
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Privileges and undo

describe("order function privileges", () => {
  it("opens only the two order functions to the API, and only to customers (TC-P4-092)", async () => {
    const functions = await db.query<{
      schema: string;
      name: string;
      security_definer: boolean;
      settings: string[] | null;
      anon: boolean;
      signed_in: boolean;
      server: boolean;
    }>(`
      select
        n.nspname as schema,
        p.oid::regprocedure::text as name,
        p.prosecdef as security_definer,
        p.proconfig as settings,
        has_function_privilege('anon', p.oid, 'execute') as anon,
        has_function_privilege('authenticated', p.oid, 'execute') as signed_in,
        has_function_privilege('service_role', p.oid, 'execute') as server
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'private'
         or p.oid in (
           'public.place_online_order(jsonb, uuid)'::regprocedure,
           'public.get_online_order(text, text)'::regprocedure
         )
      order by 1
    `);

    for (const fn of functions.rows) {
      expect(fn.settings, fn.name).toEqual(['search_path=""']);
      if (fn.schema === "public") {
        expect(fn, fn.name).toMatchObject({
          security_definer: true,
          anon: true,
          signed_in: true,
          server: false,
        });
      } else if (fn.name === "private.is_staff()") {
        expect(fn, fn.name).toMatchObject({ anon: false, signed_in: true });
      } else {
        expect(fn, fn.name).toMatchObject({ anon: false, signed_in: false });
      }
    }
    expect(functions.rows.map((fn) => fn.name)).toContain(
      "private.price_cart(jsonb)",
    );

    const denied = await runAs(
      db,
      ANON,
      "select private.price_cart('[]'::jsonb)",
    );
    expect(denied).toMatchObject({ ok: false, code: INSUFFICIENT_PRIVILEGE });
    const server = await runAs(
      db,
      { role: "service_role" },
      "select public.get_online_order('BNC-AAAAAA', null)",
    );
    expect(server).toMatchObject({ ok: false, code: INSUFFICIENT_PRIVILEGE });
  });
});

describe("applying and undoing the order migrations", () => {
  it("removes the functions but keeps the orders, then puts them back (TC-P4-093)", async () => {
    const fresh = await createMigratedDatabase();
    try {
      await fresh.exec(MENU_SQL);
      const placedRows = await fresh.query<{ result: Result }>(
        "select public.place_online_order($1::jsonb) as result",
        [JSON.stringify(orderRequest())],
      );
      const reference = String(placedRows.rows[0]?.result.reference);

      await applyRollback(fresh, FUNCTIONS);
      const gone = await fresh.query(`
        select
          to_regprocedure('public.place_online_order(jsonb, uuid)') is null as no_place,
          to_regprocedure('public.get_online_order(text, text)') is null as no_get,
          to_regtype('private.cart_line') is null as no_type,
          (select count(*)::int from pg_trigger
           where tgname = 'online_orders_broadcast_status') as triggers,
          (select count(*)::int from public.online_orders) as orders,
          (select count(*)::int from private.online_order_tokens) as tokens
      `);
      expect(gone.rows).toEqual([
        {
          no_place: true,
          no_get: true,
          no_type: true,
          triggers: 0,
          orders: 1,
          tokens: 1,
        },
      ]);

      await applyMigration(fresh, FUNCTIONS);
      const again = await fresh.query<{ order: Result | null }>(
        "select public.get_online_order($1, $2) as order",
        [reference, TOKEN],
      );
      expect(again.rows[0]?.order).toMatchObject({
        reference,
        status: "pending",
      });

      await applyRollback(fresh, FUNCTIONS);
      await applyRollback(fresh, TABLES);
      const tables = await fresh.query(`
        select
          to_regclass('public.online_orders') is null as no_orders,
          to_regclass('private.online_order_tokens') is null as no_tokens,
          to_regclass('public.customer_profiles') is null as no_profiles,
          (select count(*)::int from public.items) as menu_items
      `);
      expect(tables.rows).toEqual([
        { no_orders: true, no_tokens: true, no_profiles: true, menu_items: 4 },
      ]);

      await applyMigration(fresh, TABLES);
      await applyMigration(fresh, FUNCTIONS);
      const placedAgain = await fresh.query<{ result: Result }>(
        "select public.place_online_order($1::jsonb) as result",
        [JSON.stringify(orderRequest())],
      );
      expect(placedAgain.rows[0]?.result).toMatchObject({
        ok: true,
        created: true,
      });
    } finally {
      await fresh.close();
    }
  }, 60_000);
});
