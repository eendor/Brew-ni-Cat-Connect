// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";

import {
  addUser,
  ANON,
  applyMigration,
  applyRollback,
  createBaselineDatabase,
  INSUFFICIENT_PRIVILEGE,
  type Actor,
  type Outcome,
  runAs,
  signedIn,
} from "./support/database";
import {
  POS_TABLES,
  POS_WRITES,
  type PosTable,
  SEEDED_ROWS,
  seedPosData,
} from "./support/pos-data";

const MIGRATION = "20261024011051_restore_rls.sql";

const READABLE_BY_EVERYONE = ["categories", "items", "app_release"] as const;
const STAFF_ONLY = [
  "orders",
  "order_items",
  "inventory",
  "recipe_mappings",
  "expenses",
] as const;
const STAFF_WRITABLE = ["categories", "items", ...STAFF_ONLY] as const;

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const SELF_MARKED = "33333333-3333-4333-8333-333333333333";
const BANNED_STAFF = "44444444-4444-4444-8444-444444444444";
const BAN_ENDED_STAFF = "55555555-5555-4555-8555-555555555555";
const DELETED_STAFF = "66666666-6666-4666-8666-666666666666";
const ANONYMOUS_STAFF = "77777777-7777-4777-8777-777777777777";
const NO_ACCOUNT = "88888888-8888-4888-8888-888888888888";

const STAFF_MARK = { role: "staff" } as const;

let db: PGlite;

beforeAll(async () => {
  db = await createBaselineDatabase();
  await seedPosData(db);
  await addUser(db, { id: STAFF, appMetadata: STAFF_MARK });
  await addUser(db, { id: CUSTOMER });
  await addUser(db, { id: SELF_MARKED, userMetadata: STAFF_MARK });
  await addUser(db, {
    id: BANNED_STAFF,
    appMetadata: STAFF_MARK,
    bannedUntil: "2999-01-01T00:00:00Z",
  });
  await addUser(db, {
    id: BAN_ENDED_STAFF,
    appMetadata: STAFF_MARK,
    bannedUntil: "2000-01-01T00:00:00Z",
  });
  await addUser(db, {
    id: DELETED_STAFF,
    appMetadata: STAFF_MARK,
    deletedAt: "2026-10-01T00:00:00Z",
  });
  await addUser(db, {
    id: ANONYMOUS_STAFF,
    appMetadata: STAFF_MARK,
    isAnonymous: true,
  });
  await applyMigration(db, MIGRATION);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

async function countAs(
  actor: Actor,
  table: PosTable,
  database: PGlite = db,
): Promise<number> {
  const outcome = await runAs<{ rows: number }>(
    database,
    actor,
    `select count(*)::int as rows from public.${table}`,
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

describe("restoring Row Level Security", () => {
  it("turns RLS on for every public table and keeps only the new policies (TC-P4-067)", async () => {
    const tables = await db.query<{ table: string; rls: boolean }>(`
      select c.relname as table, c.relrowsecurity as rls
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
      order by c.relname
    `);
    expect(tables.rows).toEqual(
      [...POS_TABLES].sort().map((table) => ({ table, rls: true })),
    );

    const policies = await db.query(`
      select tablename as table, policyname as name, cmd, roles::text[] as roles
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `);
    const everyone = ["anon", "authenticated"];
    const staff = ["authenticated"];
    expect(policies.rows).toEqual([
      {
        table: "app_release",
        name: "releases_readable_by_everyone",
        cmd: "SELECT",
        roles: everyone,
      },
      {
        table: "categories",
        name: "menu_readable_by_everyone",
        cmd: "SELECT",
        roles: everyone,
      },
      {
        table: "categories",
        name: "staff_full_access",
        cmd: "ALL",
        roles: staff,
      },
      {
        table: "expenses",
        name: "staff_full_access",
        cmd: "ALL",
        roles: staff,
      },
      {
        table: "inventory",
        name: "staff_full_access",
        cmd: "ALL",
        roles: staff,
      },
      {
        table: "items",
        name: "menu_readable_by_everyone",
        cmd: "SELECT",
        roles: everyone,
      },
      { table: "items", name: "staff_full_access", cmd: "ALL", roles: staff },
      {
        table: "order_items",
        name: "staff_full_access",
        cmd: "ALL",
        roles: staff,
      },
      { table: "orders", name: "staff_full_access", cmd: "ALL", roles: staff },
      {
        table: "recipe_mappings",
        name: "staff_full_access",
        cmd: "ALL",
        roles: staff,
      },
    ]);
  });

  it("lets anyone read the menu and the POS release, and nothing else (TC-P4-068)", async () => {
    for (const table of READABLE_BY_EVERYONE) {
      expect(await countAs(ANON, table), table).toBe(SEEDED_ROWS[table]);
    }

    for (const table of STAFF_ONLY) {
      expectDenied(
        await runAs(db, ANON, `select * from public.${table}`),
        `read ${table}`,
      );
    }

    for (const table of POS_TABLES) {
      for (const [kind, sql] of Object.entries(POS_WRITES[table])) {
        expectDenied(await runAs(db, ANON, sql), `${kind} ${table}`);
      }
    }
  });

  it("lets the POS staff account read and change everything the POS uses (TC-P4-069)", async () => {
    const staff = signedIn(STAFF);

    for (const table of STAFF_WRITABLE) {
      expect(await countAs(staff, table), table).toBe(SEEDED_ROWS[table]);
      for (const [kind, sql] of Object.entries(POS_WRITES[table])) {
        expectChanged(await runAs(db, staff, sql), 1, `${kind} ${table}`);
      }
    }

    // The POS sync saves rows with upserts.
    expectChanged(
      await runAs(
        db,
        staff,
        `insert into public.items (id, category_id, name)
         values ('latte', 'coffee', 'Caffe latte')
         on conflict (id) do update set name = excluded.name`,
      ),
      1,
      "upsert items",
    );

    // Releases stay read-only on every device.
    expect(await countAs(staff, "app_release")).toBe(SEEDED_ROWS.app_release);
    for (const [kind, sql] of Object.entries(POS_WRITES.app_release)) {
      expectDenied(await runAs(db, staff, sql), `${kind} app_release`);
    }
  });

  it("gives a signed-in customer the menu only (TC-P4-070)", async () => {
    const customer = signedIn(CUSTOMER);

    for (const table of READABLE_BY_EVERYONE) {
      expect(await countAs(customer, table), table).toBe(SEEDED_ROWS[table]);
    }
    for (const table of STAFF_ONLY) {
      expect(await countAs(customer, table), table).toBe(0);
    }

    for (const table of STAFF_WRITABLE) {
      const writes = POS_WRITES[table];
      expectDenied(await runAs(db, customer, writes.insert), `insert ${table}`);
      expectChanged(
        await runAs(db, customer, writes.update),
        0,
        `update ${table}`,
      );
      expectChanged(
        await runAs(db, customer, writes.delete),
        0,
        `delete ${table}`,
      );
    }
    for (const [kind, sql] of Object.entries(POS_WRITES.app_release)) {
      expectDenied(await runAs(db, customer, sql), `${kind} app_release`);
    }
  });

  it("treats only a live account marked in app_metadata as staff (TC-P4-071)", async () => {
    const notStaff: ReadonlyArray<readonly [string, Actor]> = [
      ["role in user_metadata, which users can change", signedIn(SELF_MARKED)],
      ["banned account", signedIn(BANNED_STAFF)],
      ["deleted account", signedIn(DELETED_STAFF)],
      ["anonymous account", signedIn(ANONYMOUS_STAFF)],
      [
        "role only in the access token",
        signedIn(CUSTOMER, { app_metadata: STAFF_MARK }),
      ],
      ["no account", signedIn(NO_ACCOUNT)],
    ];

    for (const [label, actor] of notStaff) {
      expect(await countAs(actor, "orders"), label).toBe(0);
      expectDenied(await runAs(db, actor, POS_WRITES.orders.insert), label);
    }

    expect(await countAs(signedIn(BAN_ENDED_STAFF), "orders")).toBe(
      SEEDED_ROWS.orders,
    );
  });

  it("applies a staff change at once, without a new sign-in (TC-P4-071)", async () => {
    const staff = signedIn(STAFF);

    await db.query(
      "update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where id = $1",
      [STAFF],
    );
    try {
      expect(await countAs(staff, "orders")).toBe(0);
    } finally {
      await db.query(
        `update auth.users
         set raw_app_meta_data = raw_app_meta_data || '{"role": "staff"}'::jsonb
         where id = $1`,
        [STAFF],
      );
    }

    expect(await countAs(staff, "orders")).toBe(SEEDED_ROWS.orders);
  });

  it("keeps the staff check private and grants each role only what it needs (TC-P4-072)", async () => {
    const check = await db.query(`
      select
        p.prosecdef as security_definer,
        p.proconfig as settings,
        has_function_privilege('anon', p.oid, 'execute') as anon_can_run,
        has_function_privilege('authenticated', p.oid, 'execute') as signed_in_can_run,
        has_schema_privilege('anon', 'private', 'usage') as anon_sees_schema
      from pg_proc as p
      where p.oid = 'private.is_staff()'::regprocedure
    `);
    expect(check.rows).toEqual([
      {
        security_definer: true,
        settings: ['search_path=""'],
        anon_can_run: false,
        signed_in_can_run: true,
        anon_sees_schema: false,
      },
    ]);
    expectDenied(
      await runAs(db, ANON, "select private.is_staff()"),
      "anon calls is_staff",
    );

    const grants = await db.query(`
      select
        a.grantee::regrole::text as grantee,
        c.relname as table,
        string_agg(a.privilege_type, ',' order by a.privilege_type) as privileges
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) as a
      where n.nspname = 'public'
        and c.relkind = 'r'
        and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
      group by 1, 2
      order by 1, 2
    `);
    const readWrite = "DELETE,INSERT,SELECT,UPDATE";
    expect(grants.rows).toEqual([
      { grantee: "anon", table: "app_release", privileges: "SELECT" },
      { grantee: "anon", table: "categories", privileges: "SELECT" },
      { grantee: "anon", table: "items", privileges: "SELECT" },
      { grantee: "authenticated", table: "app_release", privileges: "SELECT" },
      { grantee: "authenticated", table: "categories", privileges: readWrite },
      { grantee: "authenticated", table: "expenses", privileges: readWrite },
      { grantee: "authenticated", table: "inventory", privileges: readWrite },
      { grantee: "authenticated", table: "items", privileges: readWrite },
      { grantee: "authenticated", table: "order_items", privileges: readWrite },
      { grantee: "authenticated", table: "orders", privileges: readWrite },
      {
        grantee: "authenticated",
        table: "recipe_mappings",
        privileges: readWrite,
      },
    ]);
  });
});

describe("applying and undoing the RLS migration", () => {
  it("can run again, and its undo opens the POS tables as before (TC-P4-073)", async () => {
    const fresh = await createBaselineDatabase();
    try {
      await seedPosData(fresh);
      await applyMigration(fresh, MIGRATION);
      await applyMigration(fresh, MIGRATION);
      expectDenied(
        await runAs(fresh, ANON, "select * from public.orders"),
        "after two runs",
      );

      await applyRollback(fresh, MIGRATION);
      expect(await countAs(ANON, "orders", fresh)).toBe(SEEDED_ROWS.orders);

      await applyMigration(fresh, MIGRATION);
      expectDenied(
        await runAs(fresh, ANON, "select * from public.orders"),
        "after the undo and a new run",
      );
    } finally {
      await fresh.close();
    }
  }, 60_000);

  it("changes nothing when a public table would keep RLS off (TC-P4-073)", async () => {
    const fresh = await createBaselineDatabase();
    try {
      await fresh.exec("create table public.scratch (id int primary key)");

      await expect(applyMigration(fresh, MIGRATION)).rejects.toThrow(
        "Row Level Security is still off on: scratch",
      );

      const state = await fresh.query(`
        select
          bool_or(c.relrowsecurity) as any_rls,
          (select count(*)::int from pg_policies
           where schemaname = 'public' and policyname = 'store_account_all') as old_policies,
          to_regnamespace('private') is null as no_private_schema
        from pg_class as c
        join pg_namespace as n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
      `);
      expect(state.rows).toEqual([
        { any_rls: false, old_policies: 7, no_private_schema: true },
      ]);
    } finally {
      await fresh.close();
    }
  }, 60_000);
});
