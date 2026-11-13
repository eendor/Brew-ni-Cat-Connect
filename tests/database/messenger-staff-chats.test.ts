// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANON,
  applyMigration,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
} from "./support/database";

const STAFF_CHATS = "20261113130000_messenger_staff_chats.sql";
const CHAT = "a".repeat(64);
const OTHER_CHAT = "b".repeat(64);

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("Messenger chats the staff replied in (FR-113)", () => {
  it("TC-P7-114 — the server saves and reads a staff reply by the chat's code; the table can't be read directly", async () => {
    const before = await runAs<{ at: string | null }>(
      db,
      ANON,
      "select public.messenger_staff_replied_at($1) as at",
      [CHAT],
    );
    expect(before.ok && before.rows[0]?.at).toBeNull();

    await commitAs(db, ANON, "select public.note_messenger_staff_reply($1)", [
      CHAT,
    ]);
    const after = await runAs<{ at: string | null }>(
      db,
      ANON,
      "select public.messenger_staff_replied_at($1) as at",
      [CHAT],
    );
    expect(after.ok && after.rows[0]?.at).not.toBeNull();
    const other = await runAs<{ at: string | null }>(
      db,
      ANON,
      "select public.messenger_staff_replied_at($1) as at",
      [OTHER_CHAT],
    );
    expect(other.ok && other.rows[0]?.at).toBeNull();

    const direct = await runAs(
      db,
      ANON,
      "select * from private.messenger_staff_chats",
    );
    expect(direct.ok).toBe(false);
    if (!direct.ok) expect(direct.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("TC-P7-115 — refuses anything but a 64-character hex code, and drops replies older than two days", async () => {
    for (const bad of [
      "7100000000000001",
      "A".repeat(64),
      "",
      "z".repeat(64),
    ]) {
      const result = await runAs(
        db,
        ANON,
        "select public.note_messenger_staff_reply($1)",
        [bad],
      );
      expect(result.ok).toBe(false);
    }

    await db.query(
      "update private.messenger_staff_chats set replied_at = now() - interval '3 days' where chat = $1",
      [CHAT],
    );
    await commitAs(db, ANON, "select public.note_messenger_staff_reply($1)", [
      OTHER_CHAT,
    ]);
    const left = await db.query<{ chat: string }>(
      "select chat from private.messenger_staff_chats",
    );
    expect(left.rows.map((row) => row.chat)).toEqual([OTHER_CHAT]);
  });

  it("TC-P7-116 — the rollback removes the table and both functions, and the migration applies again", async () => {
    const fresh = await createMigratedDatabase();
    await applyRollback(fresh, STAFF_CHATS);
    const gone = await fresh.query<{ count: number }>(
      `select count(*)::int as count from pg_proc
       where proname in ('note_messenger_staff_reply', 'messenger_staff_replied_at')`,
    );
    expect(gone.rows[0]?.count).toBe(0);
    await applyMigration(fresh, STAFF_CHATS);
    await commitAs(
      fresh,
      ANON,
      "select public.note_messenger_staff_reply($1)",
      [CHAT],
    );
    await fresh.close();
  }, 60_000);
});
