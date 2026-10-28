/**
 * Test databases for the SQL in `supabase/migrations`.
 *
 * Each test file makes its own in-memory Postgres (PGlite). It starts as the
 * live database was before this repo's migrations (`baseline.sql`), then gets
 * the migrations in order, one transaction each, as on Supabase. Tests run
 * statements as the Supabase roles to check what each one can do.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../supabase/migrations/", import.meta.url),
);
const ROLLBACKS_DIR = fileURLToPath(
  new URL("../../../supabase/rollbacks/", import.meta.url),
);
const BASELINE_FILE = fileURLToPath(new URL("./baseline.sql", import.meta.url));

const MIGRATION_FILE_PATTERN = /^\d{14}_[a-z0-9_]+\.sql$/;

/** Migration file names, oldest first. */
export function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => MIGRATION_FILE_PATTERN.test(name))
    .sort();
}

/** A new database in the state the live one was in before our migrations. */
export async function createBaselineDatabase(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(readFileSync(BASELINE_FILE, "utf8"));
  return db;
}

/**
 * Apply one migration. Its statements run together in one transaction, so a
 * failure leaves the database unchanged, as on Supabase.
 */
export async function applyMigration(
  db: PGlite,
  fileName: string,
): Promise<void> {
  await db.exec(readFileSync(`${MIGRATIONS_DIR}${fileName}`, "utf8"));
}

/** Apply the undo script for one migration. */
export async function applyRollback(
  db: PGlite,
  fileName: string,
): Promise<void> {
  await db.exec(readFileSync(`${ROLLBACKS_DIR}${fileName}`, "utf8"));
}

/**
 * A new database with every migration applied, or only those up to and
 * including `upTo`. Tests that undo a migration stop there, so later
 * migrations don't depend on what they remove.
 */
export async function createMigratedDatabase(upTo?: string): Promise<PGlite> {
  const migrations = listMigrations();
  if (upTo !== undefined && !migrations.includes(upTo)) {
    throw new Error(`No migration named ${upTo}`);
  }
  const db = await createBaselineDatabase();
  for (const fileName of migrations) {
    await applyMigration(db, fileName);
    if (fileName === upTo) {
      break;
    }
  }
  return db;
}

// ---------------------------------------------------------------------------
// Users

export type TestUser = Readonly<{
  id: string;
  appMetadata?: Readonly<Record<string, unknown>>;
  userMetadata?: Readonly<Record<string, unknown>>;
  bannedUntil?: string | null;
  deletedAt?: string | null;
  isAnonymous?: boolean;
}>;

/** Add a user to `auth.users`, as Supabase Auth would on sign-up. */
export async function addUser(db: PGlite, user: TestUser): Promise<void> {
  await db.query(
    `insert into auth.users
       (id, raw_app_meta_data, raw_user_meta_data, banned_until, deleted_at, is_anonymous)
     values ($1, $2::text::jsonb, $3::text::jsonb, $4, $5, $6)`,
    [
      user.id,
      JSON.stringify({ provider: "email", ...user.appMetadata }),
      JSON.stringify(user.userMetadata ?? {}),
      user.bannedUntil ?? null,
      user.deletedAt ?? null,
      user.isAnonymous ?? false,
    ],
  );
}

// ---------------------------------------------------------------------------
// Running statements as a Supabase role

/** Who sends an API request: no account, a signed-in user, or the server. */
export type Actor =
  | Readonly<{ role: "anon" }>
  | Readonly<{
      role: "authenticated";
      userId: string;
      /** Extra access token claims, such as `app_metadata`. */
      claims?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{ role: "service_role" }>;

export const ANON: Actor = { role: "anon" };

export function signedIn(
  userId: string,
  claims?: Readonly<Record<string, unknown>>,
): Actor {
  return { role: "authenticated", userId, claims };
}

function claimsFor(actor: Actor): string {
  if (actor.role === "authenticated") {
    return JSON.stringify({
      ...actor.claims,
      sub: actor.userId,
      role: "authenticated",
    });
  }
  return JSON.stringify({ role: actor.role });
}

export type Outcome<T> =
  | Readonly<{ ok: true; rows: T[]; affectedRows: number }>
  | Readonly<{ ok: false; code: string; message: string }>;

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return "unknown";
}

/**
 * Run one statement as `actor`, the way the API runs a request: in a
 * transaction with the role and access token claims set. The transaction is
 * then rolled back, so every call sees the same data.
 */
export async function runAs<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
): Promise<Outcome<T>> {
  return execAs<T>(db, actor, sql, params, false);
}

/** Like `runAs`, but a statement that succeeds is committed. */
export async function commitAs<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
): Promise<Outcome<T>> {
  return execAs<T>(db, actor, sql, params, true);
}

async function execAs<T>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[],
  keep: boolean,
): Promise<Outcome<T>> {
  return db.transaction(async (tx) => {
    let failed = false;
    try {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [
        claimsFor(actor),
      ]);
      await tx.exec(`set local role ${actor.role}`);
      const result = await tx.query<T>(sql, params);
      return {
        ok: true,
        rows: result.rows,
        affectedRows: result.affectedRows ?? 0,
      };
    } catch (error) {
      failed = true;
      return {
        ok: false,
        code: errorCode(error),
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (failed || !keep) {
        await tx.rollback();
      }
    }
  });
}

/** SQLSTATE for "permission denied" and for a row that RLS refuses. */
export const INSUFFICIENT_PRIVILEGE = "42501";
