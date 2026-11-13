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
  GamesUnavailableError,
  playMiniGame,
  playsLeftLabel,
  type PlayResult,
} from "@/lib/games/games";
import { fetchLoyaltyBalance } from "@/lib/loyalty/loyalty-client";

import { CatCups } from "./cat-cups";
import { CatSprite } from "./cat-sprite";
import { LuckyPaw } from "./lucky-paw";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
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
 * The mini-games page (FR-089, FR-090): two short games that earn loyalty
 * points, a few plays a day, and the site's only ad slot.
 */
const noSubscribe = () => () => {};

export function GamesView() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;
  const reducedMotion = useReducedMotion();
  const [load, setLoad] = useState<Load>({ state: "loading" });

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
      setLoad((current) => {
        if (current.state !== "ready") return current;
        if (result.ok) {
          return {
            ...current,
            balance: result.balance,
            status: {
              ...current.status,
              playsLeft: result.playsLeft,
              playsToday: current.status.dailyPlays - result.playsLeft,
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
  const outOfPlays = ready ? ready.status.playsLeft <= 0 : true;
  const cannotPlay = !signedIn || outOfPlays;
  const waitingOrder = useSyncExternalStore(
    noSubscribe,
    readWaitingOrder,
    () => null,
  );
  const games = ready?.status.games ?? [];
  const cups = games.find((g) => g.id === "cat-cups");
  const paw = games.find((g) => g.id === "lucky-paw");

  return (
    <Container className="max-w-4xl py-8 md:py-12">
      {waitingOrder ? (
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
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Play for points
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Cat games
          </h1>
          <p className="mt-2 max-w-prose text-sm text-[var(--text-muted)]">
            Play with the café cats for loyalty points. Every play earns at
            least one point, and you get a few plays each day.
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
                {playsLeftLabel(ready.status.playsLeft)}
              </p>
            </div>
            {ready.balance !== null ? (
              <div>
                <p className="text-xs text-[var(--text-muted)]">Balance</p>
                <p className="font-semibold text-[var(--text-strong)]">
                  {ready.balance} pts
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

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
            The games open soon. Your points from orders still count on the{" "}
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
              to play and keep your points.
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
                Spend your points
              </Link>
            </p>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            {cups ? (
              <section aria-labelledby="game-cat-cups" className="ios-card p-6">
                <h2
                  id="game-cat-cups"
                  className="font-display text-xl font-semibold text-[var(--text-strong)]"
                >
                  {cups.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {cups.description} The right cup earns {cups.winPoints}{" "}
                  points; any other earns {cups.tryPoints}.
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
                className="ios-card p-6"
              >
                <h2
                  id="game-lucky-paw"
                  className="font-display text-xl font-semibold text-[var(--text-strong)]"
                >
                  {paw.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {paw.description} Up to {paw.maxPoints} points.
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
          <p className="text-center text-xs text-[var(--text-muted)]">
            The café decides every result fairly on its server. Points from
            games show in your{" "}
            <Link href="/account/rewards/history" className="underline">
              points history
            </Link>
            .
          </p>
        </div>
      )}

      <div className="mt-10">
        <AdSlot />
      </div>
    </Container>
  );
}
