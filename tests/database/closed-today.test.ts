// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fallbackShop } from "@/lib/site-content/fallback-shop";

import {
  addUser,
  ANON,
  applyMigration,
  applyRollback,
  createMigratedDatabase,
  runAs,
  signedIn,
} from "./support/database";

const CLOSED_TODAY = "20261111120000_closed_today.sql";
const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";

const UPDATE =
  "update public.site_content set content = $1::jsonb where section = 'closure' returning content";

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER });
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("The Closed today switch (FR-111)", () => {
  it("TC-P7-077 — starts open like the website's copy, and anyone can read it", async () => {
    const result = await runAs(
      db,
      ANON,
      "select content from public.site_content where section = 'closure'",
    );
    expect(result).toMatchObject({
      ok: true,
      rows: [{ content: fallbackShop.closure }],
    });
  });

  it("TC-P7-077 — staff can close the shop with a note; others can't, and broken content is refused", async () => {
    const closed = { closed: true, note: "Back tomorrow at 1 PM." };
    await expect(
      runAs(db, signedIn(STAFF), UPDATE, [JSON.stringify(closed)]),
    ).resolves.toMatchObject({ ok: true, rows: [{ content: closed }] });

    for (const actor of [ANON, signedIn(CUSTOMER)]) {
      const result = await runAs(db, actor, UPDATE, [JSON.stringify(closed)]);
      expect(result.ok ? result.affectedRows : 0).toBe(0);
    }

    for (const broken of [
      { closed: "yes", note: "" },
      { closed: true },
      { closed: true, note: "x".repeat(301) },
      { closed: true, note: "", extra: 1 },
    ]) {
      const result = await runAs(db, signedIn(STAFF), UPDATE, [
        JSON.stringify(broken),
      ]);
      expect(result.ok).toBe(false);
    }

    // the other sections keep their checks
    const notice = await runAs(
      db,
      signedIn(STAFF),
      "update public.site_content set content = '{\"text\": 5}' where section = 'notice'",
    );
    expect(notice.ok).toBe(false);
  });

  it("TC-P7-077 — the undo script removes the section, and the migration applies again", async () => {
    const fresh = await createMigratedDatabase();
    await applyRollback(fresh, CLOSED_TODAY);
    const left = await fresh.query<{ rows: number; base: number }>(
      `select
         (select count(*)::int from public.site_content
          where section = 'closure') as rows,
         (select count(*)::int from pg_proc
          where proname = 'is_valid_site_content_before_closure') as base`,
    );
    expect(left.rows[0]).toEqual({ rows: 0, base: 0 });
    await expect(
      fresh.query(
        'insert into public.site_content (section, content) values (\'closure\', \'{"closed": false, "note": ""}\')',
      ),
    ).rejects.toThrow();

    await applyMigration(fresh, CLOSED_TODAY);
    const again = await fresh.query<{ count: number }>(
      "select count(*)::int as count from public.site_content where section = 'closure'",
    );
    expect(again.rows[0]?.count).toBe(1);
    await fresh.close();
  }, 60_000);
});
