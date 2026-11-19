"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { AdSlot } from "@/components/ads/ad-slot";
import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import { readWaitingOrder } from "@/lib/games/waiting-order";
import {
  fetchGameStatus,
  type GameId,
  type GameStatus,
  canPlay,
  coinsLeftLabel,
  GamesUnavailableError,
  playMiniGame,
  playsLeftLabel,
  type PlayResult,
  prizeChanceLabel,
  type WonPrize,
} from "@/lib/games/games";
import {
  formatCoins,
  formatLoyaltyDate,
  roundCoins,
} from "@/lib/loyalty/format";
import { fetchLoyaltyBalance } from "@/lib/loyalty/loyalty-client";

import { ArcadeSection } from "./arcade-section";
import { CatCups } from "./cat-cups";
import { CatSprite } from "./cat-sprite";
import { LuckyPaw } from "./lucky-paw";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

type Load =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "error"; message: string }
  | { state: "ready"; status: GameStatus; balance: number | null };

/**
 * The mini-games page (FR-089, FR-090, FR-124): two short games that earn
 * coins, up to 2 coins a day with no limit on plays, and the site's only ad
 * slot. Only the first plays of the day can win a prize. Below them, the
 * free-play arcade (FR-123) works for everyone, signed in or not.
 */
const noSubscribe = () => () => {};

/** Coins left today under the coins rules; plays left on an older database. */
function todayLabel(status: GameStatus): string {
  if (status.unlimited && status.coinsLeft !== undefined) {
    return coinsLeftLabel(status.coinsLeft);
  }
  return playsLeftLabel(status.playsLeft);
}

type GamesViewProps = Readonly<{
  /** Render compact game content for an order-page popup instead of the full page. */
  embedded?: boolean;
}>;

export function GamesView({ embedded = false }: GamesViewProps = {}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;
  const reducedMotion = useReducedMotion();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [wonPrize, setWonPrize] = useState<WonPrize | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let active = true;
    Promise.all([
      fetchGameStatus(),
      userId ? fetchLoyaltyBalance({ userId }) : Promise.resolve(null),
    ])
      .then(([status, balance]) => {
        if (active) setLoad({ state: "ready", status, balance });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof GamesUnavailableError) {
          setLoad({ state: "unavailable" });
        } else {
          setLoad({
            state: "error",
            message: "We couldn't load the games. Please try again later.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthLoading, userId]);

  const play = useCallback(
    async (game: GameId, choice: number | null): Promise<PlayResult> => {
      const result = await playMiniGame(game, choice);
      if (result.ok && result.prize) setWonPrize(result.prize);
      setLoad((current) => {
        if (current.state !== "ready") return current;
        if (result.ok) {
          return {
            ...current,
            balance: result.balance,
            status: {
              ...current.status,
              playsLeft: result.playsLeft,
              playsToday: current.status.playsToday + 1,
              coinsLeft: result.coinsLeft ?? current.status.coinsLeft,
              coinsToday:
                result.coinsLeft !== undefined &&
                current.status.dailyCoins !== undefined
                  ? roundCoins(current.status.dailyCoins - result.coinsLeft)
                  : current.status.coinsToday,
            },
          };
        }
        if (result.error === "daily_limit_reached") {
          return { ...current, status: { ...current.status, playsLeft: 0 } };
        }
        return current;
      });
      return result;
    },
    [],
  );

  const signedIn = Boolean(userId);
  const ready = load.state === "ready" ? load : null;
  const outOfPlays = ready ? !canPlay(ready.status) : true;
  const cannotPlay = !signedIn || outOfPlays;
  const waitingOrder = useSyncExternalStore(
    noSubscribe,
    readWaitingOrder,
    () => null,
  );
  const games = ready?.status.games ?? [];
  const cups = games.find((g) => g.id === "cat-cups");
  const paw = games.find((g) => g.id === "lucky-paw");

  const content = (
    <>
      {!embedded && waitingOrder ? (
        // a full page load: the order page reads its tracking token on load,
        // and client navigation with a # link doubled the token
        <a
          href={waitingOrder}
          data-testid="back-to-order"
          className="mb-4 inline-flex text-sm font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline"
        >
          ← Back to your order
        </a>
      ) : null}
      {!embedded ? (
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Play for coins
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-strong)]">
              Cat games
            </h1>
            <p className="mt-2 max-w-prose text-sm text-[var(--text-muted)]">
              Play with the café cats as often as you like. Each play earns 0.1
              or 0.2 coins, up to 2 coins a day, and your first plays each day
              can win a prize.
            </p>
          </div>
          {ready && signedIn ? (
            <div
              data-testid="games-summary"
              className="ios-card flex shrink-0 gap-6 px-5 py-3 text-sm"
            >
              <div>
                <p className="text-xs text-[var(--text-muted)]">Today</p>
                <p className="font-semibold text-[var(--text-strong)]">
                  {todayLabel(ready.status)}
                </p>
              </div>
              {ready.balance !== null ? (
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Balance</p>
                  <p className="font-semibold text-[var(--text-strong)]">
                    {formatCoins(ready.balance)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>
      ) : ready && signedIn ? (
        <div
          data-testid="games-summary"
          className="mb-4 flex items-center justify-between gap-4 rounded-[var(--shape-md)] bg-[var(--fill-secondary)] px-4 py-2.5 text-sm"
        >
          <span className="font-semibold text-[var(--text-strong)]">
            {todayLabel(ready.status)}
          </span>
          {ready.balance !== null ? (
            <span className="font-semibold text-[var(--text-strong)]">
              {formatCoins(ready.balance)}
            </span>
          ) : null}
        </div>
      ) : null}

      {load.state === "loading" || isAuthLoading ? (
        <div
          aria-busy="true"
          aria-label="Loading games"
          className="grid animate-pulse gap-6 md:grid-cols-2"
        >
          <div className="h-80 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
          <div className="h-80 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
        </div>
      ) : load.state === "unavailable" ? (
        <section
          data-testid="games-coming-soon"
          className="ios-card flex flex-col items-center gap-3 p-8 text-center"
        >
          <CatSprite cat="kulas" mode="look" scale={2} />
          <h2 className="font-display text-xl font-semibold text-[var(--text-strong)]">
            The cats are still setting up
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            The games open soon. Your coins from orders still count on the{" "}
            <Link
              href="/account/rewards"
              className="font-medium text-[var(--accent-solid)] hover:underline"
            >
              rewards page
            </Link>
            .
          </p>
        </section>
      ) : load.state === "error" ? (
        <p
          role="alert"
          className="rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
        >
          {load.message}
        </p>
      ) : (
        <div className="space-y-8">
          {!signedIn ? (
            <p
              data-testid="games-sign-in"
              className="ios-card p-4 text-center text-sm text-[var(--text-strong)]"
            >
              <Link
                href="/account/sign-in?returnTo=/games"
                className="font-semibold text-[var(--accent-solid)] hover:underline"
              >
                Sign in
              </Link>{" "}
              to play and keep your coins.
            </p>
          ) : outOfPlays ? (
            <p
              data-testid="games-done"
              className="ios-card p-4 text-center text-sm text-[var(--text-strong)]"
            >
              That&apos;s all your plays for today. The cats will be ready again
              tomorrow.{" "}
              <Link
                href="/account/rewards"
                className="font-semibold text-[var(--accent-solid)] hover:underline"
              >
                Spend your coins
              </Link>
            </p>
          ) : null}

          {wonPrize ? (
            <section
              role="status"
              data-testid="games-prize"
              className="ios-card border-2 border-[var(--accent-solid)] p-5 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-solid)]">
                You won a prize!
              </p>
              <p className="mt-1 font-display text-xl font-bold text-[var(--text-strong)]">
                {wonPrize.name}
              </p>
              <p className="my-3 font-mono text-2xl font-black tracking-widest text-[var(--accent-solid)]">
                {wonPrize.code}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Show this code at the counter by{" "}
                {formatLoyaltyDate(wonPrize.expiresAt)}. It works once and is
                saved in{" "}
                <Link href="/account/rewards" className="underline">
                  My codes
                </Link>
                .
              </p>
            </section>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            {cups ? (
              <section
                aria-labelledby="game-cat-cups"
                className="ios-card min-w-0 p-4 sm:p-6"
              >
                <h2
                  id="game-cat-cups"
                  className="font-display text-xl font-semibold text-[var(--text-strong)]"
                >
                  {cups.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {cups.description} The right cup earns{" "}
                  {formatCoins(cups.winPoints ?? 0)}; any other earns{" "}
                  {formatCoins(cups.tryPoints ?? 0)}.
                </p>
                <div className="mt-4">
                  <CatCups
                    disabled={cannotPlay}
                    reducedMotion={reducedMotion}
                    onPlay={(choice) => play("cat-cups", choice)}
                  />
                </div>
              </section>
            ) : null}
            {paw ? (
              <section
                aria-labelledby="game-lucky-paw"
                className="ios-card min-w-0 p-4 sm:p-6"
              >
                <h2
                  id="game-lucky-paw"
                  className="font-display text-xl font-semibold text-[var(--text-strong)]"
                >
                  {paw.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {paw.description} Up to {formatCoins(paw.maxPoints)}.
                </p>
                <div className="mt-4">
                  <LuckyPaw
                    disabled={cannotPlay}
                    reducedMotion={reducedMotion}
                    onPlay={() => play("lucky-paw", null)}
                  />
                </div>
              </section>
            ) : null}
          </div>
          {ready && (ready.status.prizes ?? []).length > 0 ? (
            <section aria-labelledby="games-prizes" className="ios-card p-5">
              <h2
                id="games-prizes"
                className="font-display text-lg font-semibold text-[var(--text-strong)]"
              >
                Prizes you can win
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {ready.status.unlimited
                  ? `Your first ${ready.status.dailyPlays} plays each day can also win one of these, on top of their coins.`
                  : "Any play can also win one of these, on top of its points."}
              </p>
              <ul className="mt-3 space-y-2">
                {(ready.status.prizes ?? []).map((prize) => (
                  <li
                    key={prize.id}
                    data-testid={`game-prize-${prize.id}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-[var(--text-strong)]">
                        {prize.name}
                      </span>
                      {prize.description ? (
                        <span className="block text-xs text-[var(--text-muted)]">
                          {prize.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">
                      {prize.available
                        ? prizeChanceLabel(prize.winChance)
                        : "All won for now"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="text-center text-xs text-[var(--text-muted)]">
            The café decides every result fairly on its server. Coins from games
            show in your{" "}
            <Link href="/account/rewards/history" className="underline">
              coins history
            </Link>
            .
          </p>
        </div>
      )}

      <ArcadeSection embedded={embedded} />

      {!embedded ? (
        <div className="mt-10">
          <AdSlot />
        </div>
      ) : null}
    </>
  );

  if (embedded) return content;

  return <Container className="max-w-4xl py-8 md:py-12">{content}</Container>;
}
