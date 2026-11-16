// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  applyMigration,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  listMigrations,
  runAs,
  signedIn,
} from "./support/database";

const MIGRATION = "20261117120000_shop_rewards_and_codes.sql";
const STAFF = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CUSTOMER_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CUSTOMER_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CUSTOMER_C = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

type Answer = Record<string, unknown>;

let db: PGlite;

async function call(
  actor: ReturnType<typeof signedIn> | typeof ANON,
  sql: string,
  params: unknown[] = [],
): Promise<Answer> {
  const outcome = await commitAs<{ result: Answer }>(db, actor, sql, params);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]!.result;
}

const redeem = (customer: string, reward: string) =>
  call(signedIn(customer), "select public.redeem_reward($1) as result", [
    reward,
  ]);

const verify = (code: string, use: boolean, actor = signedIn(STAFF)) =>
  call(actor, "select public.verify_reward_code($1, $2) as result", [
    code,
    use,
  ]);

async function givePoints(customer: string, points: number): Promise<void> {
  await db.query(
    `insert into public.loyalty_transactions (customer_id, points, reason, note)
     values ($1, $2, 'adjustment', 'Test points')`,
    [customer, points],
  );
}

async function staffSets(sql: string, params: unknown[] = []): Promise<void> {
  const outcome = await commitAs(db, signedIn(STAFF), sql, params);
  if (!outcome.ok) throw new Error(outcome.message);
}

async function catalog(): Promise<Answer[]> {
  return (await call(
    ANON,
    "select public.loyalty_rewards() as result",
  )) as unknown as Answer[];
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  for (const id of [CUSTOMER_A, CUSTOMER_B, CUSTOMER_C]) {
    await addUser(db, { id });
  }
}, 60_000);

describe("owner-managed rewards and prizes (FR-088)", () => {
  it("TC-P9-054 — the catalog comes from shop_rewards; staff change cost, stock, daily limit and active, and nobody else can", async () => {
    const start = await catalog();
    expect(start).toHaveLength(11);
    expect(start[0]).toMatchObject({
      id: "reward-kiwi-soda",
      points: 40,
      stockLeft: null,
      dailyLimit: null,
      unavailable: null,
    });

    await staffSets(
      `update public.shop_rewards
         set points_cost = 45, stock = 5, daily_limit = 3
       where id = 'reward-kiwi-soda'`,
    );
    await staffSets(
      "update public.shop_rewards set active = false where id = 'reward-hazelnut-latte'",
    );
    await staffSets(
      `insert into public.shop_rewards (id, kind, name, description, points_cost, sort_order)
       values ('reward-cat-sticker', 'reward', 'Cat sticker', 'A Brew ni Cat sticker.', 15, 5)`,
    );

    const after = await catalog();
    expect(after.map((r) => r.id)).not.toContain("reward-hazelnut-latte");
    expect(after[0]).toMatchObject({ id: "reward-cat-sticker", points: 15 });
    expect(after.find((r) => r.id === "reward-kiwi-soda")).toMatchObject({
      points: 45,
      stockLeft: 5,
      dailyLimit: 3,
    });

    // staff record who changed it last
    const who = await db.query<{ updated_by: string }>(
      "select updated_by from public.shop_rewards where id = 'reward-kiwi-soda'",
    );
    expect(who.rows[0]!.updated_by).toBe(STAFF);

    // customers and guests read only active rows and change nothing
    for (const actor of [signedIn(CUSTOMER_A), ANON]) {
      const hidden = await runAs<{ n: number }>(
        db,
        actor,
        "select count(*)::int as n from public.shop_rewards where id = 'reward-hazelnut-latte'",
      );
      if (!hidden.ok) throw new Error(hidden.message);
      expect(hidden.rows[0]!.n).toBe(0);
    }
    const staffSees = await runAs<{ n: number }>(
      db,
      signedIn(STAFF),
      "select count(*)::int as n from public.shop_rewards where id = 'reward-hazelnut-latte'",
    );
    if (!staffSees.ok) throw new Error(staffSees.message);
    expect(staffSees.rows[0]!.n).toBe(1);

    const change = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      "update public.shop_rewards set points_cost = 1",
    );
    expect(change.ok && change.affectedRows).toBe(0);
    const add = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      `insert into public.shop_rewards (id, kind, name, points_cost)
       values ('free-stuff', 'reward', 'Free', 1)`,
    );
    expect(add.ok).toBe(false);
    if (!add.ok) expect(add.code).toBe(INSUFFICIENT_PRIVILEGE);
    const guest = await runAs(db, ANON, "delete from public.shop_rewards");
    expect(guest.ok).toBe(false);

    // a reward needs a cost and a prize needs a chance
    const bad = await commitAs(
      db,
      signedIn(STAFF),
      `insert into public.shop_rewards (id, kind, name, win_chance)
       values ('half-made', 'reward', 'Half', 10)`,
    );
    expect(bad.ok).toBe(false);
  });

  it("TC-P9-055 — redeeming gives an 8-character code for 30 days and stops at the stock and the daily limit", async () => {
    await givePoints(CUSTOMER_A, 500);
    await staffSets(
      "update public.shop_rewards set stock = 1, daily_limit = null where id = 'reward-cat-sticker'",
    );

    const first = await redeem(CUSTOMER_A, "reward-cat-sticker");
    expect(first).toMatchObject({
      ok: true,
      rewardName: "Cat sticker",
      pointsSpent: 15,
    });
    expect(String(first.code)).toMatch(/^RWD-[A-HJ-KM-NP-Z2-9]{8}$/);
    const days =
      (Date.parse(String(first.expiresAt)) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);

    expect(
      (await catalog()).find((r) => r.id === "reward-cat-sticker"),
    ).toMatchObject({
      stockLeft: 0,
      unavailable: "out_of_stock",
    });
    await givePoints(CUSTOMER_B, 500);
    expect(await redeem(CUSTOMER_B, "reward-cat-sticker")).toEqual({
      ok: false,
      error: "out_of_stock",
    });

    // the daily limit counts every customer's codes today
    await staffSets(
      "update public.shop_rewards set stock = null, daily_limit = 1 where id = 'reward-cat-sticker'",
    );
    expect(await redeem(CUSTOMER_B, "reward-cat-sticker")).toEqual({
      ok: false,
      error: "daily_limit_reached",
    });
    await staffSets(
      "update public.shop_rewards set daily_limit = 2 where id = 'reward-cat-sticker'",
    );
    expect((await redeem(CUSTOMER_B, "reward-cat-sticker")).ok).toBe(true);

    // each customer sees only their own codes, and can't make or change one
    const own = await runAs<{ code: string; points_spent: number }>(
      db,
      signedIn(CUSTOMER_A),
      "select code, points_spent from public.reward_codes",
    );
    if (!own.ok) throw new Error(own.message);
    expect(own.rows).toEqual([{ code: first.code, points_spent: 15 }]);
    const forge = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      `insert into public.reward_codes
         (code, customer_id, reward_name, source, issued_on, expires_at)
       values ('RWD-AAAAAAAA', $1, 'Free', 'points', current_date, now() + interval '1 day')`,
      [CUSTOMER_A],
    );
    expect(forge.ok).toBe(false);
    if (!forge.ok) expect(forge.code).toBe(INSUFFICIENT_PRIVILEGE);
    const reuse = await commitAs(
      db,
      signedIn(CUSTOMER_A),
      "update public.reward_codes set redeemed_at = null, expires_at = now() + interval '1 year'",
    );
    expect(reuse.ok).toBe(false);
  });

  it("TC-P9-056 — games give the owner's prizes by chance, as codes for 7 days, within stock", async () => {
    await staffSets(
      `insert into public.shop_rewards (id, kind, name, description, win_chance, stock)
       values ('prize-free-cookie', 'prize', 'Free cookie', 'One cat cookie.', 1000, 1)`,
    );
    const status = await call(
      signedIn(CUSTOMER_C),
      "select public.mini_game_status() as result",
    );
    expect(status.prizes).toEqual([
      {
        id: "prize-free-cookie",
        name: "Free cookie",
        description: "One cat cookie.",
        winChance: 1000,
        available: true,
      },
    ]);

    const won = await call(
      signedIn(CUSTOMER_C),
      "select public.play_mini_game('lucky-paw') as result",
    );
    expect(won.ok).toBe(true);
    const prize = won.prize as Answer;
    expect(prize).toMatchObject({
      id: "prize-free-cookie",
      name: "Free cookie",
    });
    expect(String(prize.code)).toMatch(/^PRZ-[A-Z2-9]{8}$/);
    const days =
      (Date.parse(String(prize.expiresAt)) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);

    // the prize is sold out now: the next play pays points only
    const next = await call(
      signedIn(CUSTOMER_C),
      "select public.play_mini_game('lucky-paw') as result",
    );
    expect(next.ok).toBe(true);
    expect(next.prize).toBeNull();
    expect(Number(next.points)).toBeGreaterThan(0);

    const codes = await runAs<{
      source: string;
      points_spent: number;
      play: boolean;
    }>(
      db,
      signedIn(CUSTOMER_C),
      "select source, points_spent, game_play_id = $1 as play from public.reward_codes",
      [won.playId],
    );
    if (!codes.ok) throw new Error(codes.message);
    expect(codes.rows).toEqual([
      { source: "mini-game", points_spent: 0, play: true },
    ]);

    // with no prizes on, plays give no prize
    await staffSets(
      "update public.shop_rewards set active = false where kind = 'prize'",
    );
    const plain = await call(
      signedIn(CUSTOMER_C),
      "select public.play_mini_game('cat-cups', 0) as result",
    );
    expect(plain.prize).toBeNull();
  });
});

describe("one-time codes checked by staff (FR-091)", () => {
  it("TC-P9-057 — staff check a code, use it once, and a second use is refused", async () => {
    await givePoints(CUSTOMER_A, 100);
    const issued = await redeem(CUSTOMER_A, "reward-kiwi-soda");
    const code = String(issued.code);

    // lower case and spaces still match
    const typed = code.toLowerCase().replace("-", " ");
    expect(await verify(typed, false)).toMatchObject({
      ok: true,
      status: "valid",
      code,
      rewardName: "Kiwi soda",
      source: "points",
      redeemedAt: null,
    });
    const used = await verify(code, true);
    expect(used).toMatchObject({ ok: true, status: "redeemed", code });
    expect(used.redeemedAt).not.toBeNull();

    expect(await verify(code, true)).toMatchObject({
      ok: false,
      error: "already_redeemed",
      code,
    });
    expect(await verify(code, false)).toMatchObject({
      ok: false,
      error: "already_redeemed",
    });

    const by = await db.query<{ redeemed_by: string }>(
      "select redeemed_by from public.reward_codes where code = $1",
      [code],
    );
    expect(by.rows[0]!.redeemed_by).toBe(STAFF);
  });

  it("TC-P9-058 — unknown and expired codes are refused; only staff can check codes", async () => {
    expect(await verify("RWD-ZZZZZZZZ", true)).toEqual({
      ok: false,
      error: "unknown_code",
    });
    expect(await verify("not a code", true)).toEqual({
      ok: false,
      error: "unknown_code",
    });

    await givePoints(CUSTOMER_B, 100);
    const issued = await redeem(CUSTOMER_B, "reward-spanish-latte");
    await db.query(
      "update public.reward_codes set expires_at = now() - interval '1 minute' where code = $1",
      [issued.code],
    );
    expect(await verify(String(issued.code), true)).toMatchObject({
      ok: false,
      error: "expired",
    });
    const still = await db.query<{ redeemed_at: string | null }>(
      "select redeemed_at from public.reward_codes where code = $1",
      [issued.code],
    );
    expect(still.rows[0]!.redeemed_at).toBeNull();

    // a customer can't check or use a code, not even their own
    expect(
      await verify(String(issued.code), true, signedIn(CUSTOMER_B)),
    ).toEqual({
      ok: false,
      error: "forbidden",
    });
    const guest = await runAs(
      db,
      ANON,
      "select public.verify_reward_code('RWD-ZZZZZZZZ', true)",
    );
    expect(guest.ok).toBe(false);
    if (!guest.ok) expect(guest.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("TC-P9-059 — codes made before the migration become checkable codes", async () => {
    const before = await createMigratedDatabase(
      "20261113140000_mini_games.sql",
    );
    await addUser(before, { id: CUSTOMER_A });
    await before.query(
      `insert into public.loyalty_transactions (customer_id, points, reason, note, created_at)
       values ($1, 50, 'adjustment', 'Start', now() - interval '3 days'),
              ($1, -40, 'reward-redeemed', 'Redeemed: Kiwi soda (RWD-AB12CD)', now() - interval '2 days')`,
      [CUSTOMER_A],
    );
    for (const later of listMigrations().filter(
      (name) => name > "20261113140000_mini_games.sql",
    )) {
      await applyMigration(before, later);
    }

    const rows = await before.query<{
      code: string;
      reward_id: string;
      points_spent: number;
      days_left: number;
    }>(
      `select code, reward_id, points_spent,
              round(extract(epoch from expires_at - now()) / 86400)::int as days_left
         from public.reward_codes`,
    );
    expect(rows.rows).toEqual([
      {
        code: "RWD-AB12CD",
        reward_id: "reward-kiwi-soda",
        points_spent: 40,
        days_left: 28,
      },
    ]);
    await before.close();
  }, 60_000);

  it("TC-P9-060 — the rollback puts the catalog back in settings and removes prizes and codes", async () => {
    await applyRollback(db, MIGRATION);
    const restored = await catalog();
    expect(restored).toHaveLength(11);
    expect(restored[0]).toEqual({
      id: "reward-kiwi-soda",
      name: "Kiwi soda",
      description: "Refreshing kiwi soda.",
      points: 40,
    });
    const tables = await db.query<{ a: string | null; b: string | null }>(
      "select to_regclass('public.shop_rewards')::text as a, to_regclass('public.reward_codes')::text as b",
    );
    expect(tables.rows[0]).toEqual({ a: null, b: null });
    const play = await call(
      signedIn(CUSTOMER_B),
      "select public.play_mini_game('lucky-paw') as result",
    );
    expect(play.ok).toBe(true);
    expect(play).not.toHaveProperty("prize");
    expect(
      (
        await runAs(
          db,
          signedIn(STAFF),
          "select public.verify_reward_code('x')",
        )
      ).ok,
    ).toBe(false);
  });
});
