// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANON,
  applyRollback,
  createMigratedDatabase,
  runAs,
} from "./support/database";

const MIGRATION = "20261117140000_app_release_sha256.sql";
const HASH = "ab".repeat(32);

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
}, 60_000);

afterAll(async () => {
  await db.close();
});

const insert = (code: number, sha: string | null) =>
  db.query(
    `insert into public.app_release (version_code, version_name, apk_url, notes, mandatory, sha256)
     values ($1, '1.1.0', 'https://example.test/BrewNiCatPOS.apk', null, false, $2)`,
    [code, sha],
  );

describe("POS update hash (FR-118)", () => {
  it("TC-P9-072 — app_release keeps a lowercase SHA-256 that anyone can read, and refuses anything else", async () => {
    await insert(20001, HASH);
    await insert(20002, null);
    await expect(insert(20003, HASH.toUpperCase())).rejects.toThrow(
      /app_release_sha256_format/,
    );
    await expect(insert(20004, "abc")).rejects.toThrow(
      /app_release_sha256_format/,
    );
    const read = await runAs(
      db,
      ANON,
      "select version_code, sha256 from public.app_release where version_code >= 20001 order by version_code",
    );
    expect(read).toMatchObject({
      ok: true,
      rows: [
        { version_code: 20001, sha256: HASH },
        { version_code: 20002, sha256: null },
      ],
    });
    // Guests still can't publish a release.
    const write = await runAs(
      db,
      ANON,
      "update public.app_release set sha256 = null where version_code = 20001",
    );
    expect(write.ok === false || write.rows.length === 0).toBe(true);
    const after = await db.query<{ sha256: string }>(
      "select sha256 from public.app_release where version_code = 20001",
    );
    expect(after.rows[0].sha256).toBe(HASH);
  });

  it("TC-P9-072 — the rollback removes the column", async () => {
    await applyRollback(db, MIGRATION);
    const columns = await db.query(
      "select 1 from information_schema.columns where table_schema = 'public' and table_name = 'app_release' and column_name = 'sha256'",
    );
    expect(columns.rows).toHaveLength(0);
  });
});
