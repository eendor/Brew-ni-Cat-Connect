// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const CUSTOMER_A = "44444444-4444-4444-8444-444444444444";
const CUSTOMER_B = "55555555-5555-4555-8555-555555555555";
const CUSTOMER_C = "66666666-6666-4666-8666-666666666666";

type Answer = Record<string, unknown>;

let db: PGlite;

async function play(
  customer: string,
  game: string,
  choice: number | null = null,
): Promise<Answer> {
  const outcome = await commitAs<{ result: Answer }>(
    db,
    signedIn(customer),
    "select public.play_mini_game($1, $2) as result",
    [game, choice],
  );
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]!.result;
}

async function balance(customer: string): Promise<number> {
  const outcome = await runAs<{ sum: number }>(
    db,
    signedIn(customer),
    "select coalesce(sum(points), 0)::int as sum from public.loyalty_transactions",
  );
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.rows[0]!.sum;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await addUser(db, { id: CUSTOMER_A });
  await addUser(db, { id: CUSTOMER_B });
  await addUser(db, { id: CUSTOMER_C });
}, 60_000);

describe("loyalty mini-games (FR-089)", () => {
  it("TC-P9-028 — the server decides each result, records one play and one ledger row, and pays the points", async () => {
    const result = await play(CUSTOMER_A, "cat-cups", 1);
    expect(result.ok).toBe(true);
    const outcome = result.outcome as { hiddenUnder: number; won: boolean };
    expect([0, 1, 2]).toContain(outcome.hiddenUnder);
    expect(outcome.won).toBe(outcome.hiddenUnder === 1);
    expect(result.points).toBe(outcome.won ? 3 : 1);
    expect(result.playsLeft).toBe(2);
    expect(result.balance).toBe(result.points);

    const plays = await runAs<{ game: string; points: number }>(
      db,
      signedIn(CUSTOMER_A),
      "select game, points from public.game_plays",
    );
    if (!plays.ok) throw new Error(plays.message);
    expect(plays.rows).toEqual([{ game: "cat-cups", points: result.points }]);

    const ledger = await runAs<{
      reason: string;
      note: string;
      linked: boolean;
    }>(
      db,
      signedIn(CUSTOMER_A),
      `select reason, note, game_play_id = $1 as linked
         from public.loyalty_transactions`,
      [result.playId],
    );
    if (!ledger.ok) throw new Error(ledger.message);
    expect(ledger.rows).toEqual([
      { reason: "mini-game", note: "Mini-game: Cat cups", linked: true },
    ]);

    const paw = await play(CUSTOMER_A, "lucky-paw");
    expect(paw.ok).toBe(true);
    expect([1, 2, 3, 5]).toContain(paw.points);
    expect(paw.outcome).toEqual({ treat: paw.points });
    expect(await balance(CUSTOMER_A)).toBe(
      Number(result.points) + Number(paw.points),
    );
  });

  it("TC-P9-029 — three plays a day (Manila time), then refused with nothing recorded", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await play(CUSTOMER_B, "lucky-paw")).ok).toBe(true);
    }
    const before = await balance(CUSTOMER_B);
    const refused = await play(CUSTOMER_B, "cat-cups", 0);
    expect(refused).toEqual({
      ok: false,
      error: "daily_limit_reached",
      dailyPlays: 3,
      playsLeft: 0,
    });
    expect(await balance(CUSTOMER_B)).toBe(before);

    const status = await runAs<{ result: Answer }>(
      db,
      signedIn(CUSTOMER_B),
      "select public.mini_game_status() as result",
    );
    if (!status.ok) throw new Error(status.message);
    expect(status.rows[0]!.result).toMatchObject({
      dailyPlays: 3,
      playsToday: 3,
      playsLeft: 0,
    });

    // yesterday's plays (Manila) don't count toward today
    await db.exec(
      "alter table public.game_plays disable trigger game_plays_immutable",
    );
    await db.query(
      "update public.game_plays set played_on = played_on - 1 where customer_id = $1",
      [CUSTOMER_B],
    );
    await db.exec(
      "alter table public.game_plays enable trigger game_plays_immutable",
    );
    expect((await play(CUSTOMER_B, "lucky-paw")).playsLeft).toBe(2);
  });

  it("TC-P9-030 — bad games and choices are refused; guests can't play", async () => {
    expect(await play(CUSTOMER_C, "slots")).toEqual({
      ok: false,
      error: "unknown_game",
    });
    for (const choice of [null, -1, 3]) {
      expect(await play(CUSTOMER_C, "cat-cups", choice)).toEqual({
        ok: false,
        error: "invalid_choice",
      });
    }
    expect(await play(CUSTOMER_C, "lucky-paw", 1)).toEqual({
      ok: false,
      error: "invalid_choice",
    });
    expect(await balance(CUSTOMER_C)).toBe(0);

    const guest = await runAs(
      db,
      ANON,
      "select public.play_mini_game('lucky-paw')",
    );
    expect(guest.ok).toBe(false);
    if (!guest.ok) expect(guest.code).toBe(INSUFFICIENT_PRIVILEGE);

    // guests see the games and the limit, with no plays
    const status = await runAs<{ result: Answer }>(
      db,
      ANON,
      "select public.mini_game_status() as result",
    );
    if (!status.ok) throw new Error(status.message);
    const result = status.rows[0]!.result as {
      playsLeft: number;
      games: { id: string; maxPoints: number }[];
    };
    expect(result.playsLeft).toBe(3);
    expect(result.games.map((g) => [g.id, g.maxPoints])).toEqual([
      ["cat-cups", 3],
      ["lucky-paw", 5],
    ]);
  });

  it("TC-P9-031 — customers can't write or change plays or game points from the browser", async () => {
    const insert = await runAs(
      db,
      signedIn(CUSTOMER_C),
      `insert into public.game_plays (customer_id, game, outcome, points, played_on)
       values ($1, 'lucky-paw', '{}', 5, current_date)`,
      [CUSTOMER_C],
    );
    expect(insert.ok).toBe(false);
    if (!insert.ok) expect(insert.code).toBe(INSUFFICIENT_PRIVILEGE);

    const ledger = await runAs(
      db,
      signedIn(CUSTOMER_C),
      `insert into public.loyalty_transactions (customer_id, points, reason)
       values ($1, 50, 'mini-game')`,
      [CUSTOMER_C],
    );
    expect(ledger.ok).toBe(false);

    // another customer's plays are invisible
    const others = await runAs<{ n: number }>(
      db,
      signedIn(CUSTOMER_C),
      "select count(*)::int as n from public.game_plays",
    );
    if (!others.ok) throw new Error(others.message);
    expect(others.rows[0]!.n).toBe(0);

    // and even the server can't edit a play or pay a game point without one
    await expect(
      db.query("update public.game_plays set points = 99"),
    ).rejects.toThrow(/cannot be changed/);
    await expect(
      db.query(
        `insert into public.loyalty_transactions (customer_id, points, reason)
         values ($1, 5, 'mini-game')`,
        [CUSTOMER_C],
      ),
    ).rejects.toThrow(/reason_rules/);
  });

  it("TC-P9-032 — Cat cups is fair: the cat hides under every cup, and the pick wins about a third of the time", async () => {
    const hidden = [0, 0, 0];
    let wins = 0;
    for (let i = 0; i < 90; i++) {
      const id = `77777777-7777-4777-8777-${i.toString(16).padStart(12, "0")}`;
      await addUser(db, { id });
      const result = await play(id, "cat-cups", 0);
      const outcome = result.outcome as { hiddenUnder: number; won: boolean };
      hidden[outcome.hiddenUnder]! += 1;
      if (outcome.won) wins += 1;
    }
    expect(hidden.every((n) => n > 10)).toBe(true);
    expect(wins).toBe(hidden[0]);
    expect(wins).toBeGreaterThan(12);
    expect(wins).toBeLessThan(50);
  }, 60_000);

  it("TC-P9-033 — the rollback removes the games, their plays and their points, and keeps other points", async () => {
    await db.query(
      `insert into public.loyalty_transactions (customer_id, points, reason, note)
       values ($1, 7, 'adjustment', 'Kept')`,
      [CUSTOMER_C],
    );
    await applyRollback(db, "20261113140000_mini_games.sql");
    expect((await runAs(db, ANON, "select public.mini_game_status()")).ok).toBe(
      false,
    );
    expect(await balance(CUSTOMER_A)).toBe(0);
    expect(await balance(CUSTOMER_C)).toBe(7);
    const table = await db.query<{ t: string | null }>(
      "select to_regclass('public.game_plays')::text as t",
    );
    expect(table.rows[0]!.t).toBeNull();
  });
});
