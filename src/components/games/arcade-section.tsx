"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";

import {
  amount,
  ARCADE_GAMES,
  isBetter,
  bestsSnapshot,
  parseBests,
  saveBest,
  subscribeBests,
  type ArcadeGame,
  type ArcadeGameId,
  type Rnd,
} from "@/lib/games/arcade";

import {
  CatchGame,
  MemoryGame,
  SimonGame,
  StackGame,
  WhackGame,
  type ArcadeGameProps,
} from "./arcade-games";

const COMPONENTS: Record<ArcadeGameId, ComponentType<ArcadeGameProps>> = {
  catch: CatchGame,
  whack: WhackGame,
  stack: StackGame,
  simon: SimonGame,
  memory: MemoryGame,
};

type Phase =
  | { kind: "intro" }
  | { kind: "playing"; round: number }
  | { kind: "over"; score: number; newBest: boolean };

type Bests = Partial<Record<ArcadeGameId, number>>;

/**
 * Free-play arcade (FR-123): the same five games as the Android app. Nothing
 * is sent to the server and no points are earned; each game's best score is
 * kept only in this browser.
 */
export function ArcadeSection({
  embedded = false,
  rnd,
}: Readonly<{ embedded?: boolean; rnd?: Rnd }>) {
  const snapshot = useSyncExternalStore(
    subscribeBests,
    bestsSnapshot,
    () => "",
  );
  const bests: Bests = useMemo(() => parseBests(snapshot), [snapshot]);
  const [openId, setOpenId] = useState<ArcadeGameId | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });

  const open = ARCADE_GAMES.find((g) => g.id === openId) ?? null;

  const finish = useCallback(
    (score: number) => {
      if (!openId) return;
      const newBest = isBetter(openId, score, bests[openId] ?? null);
      if (newBest) saveBest(openId, score);
      setPhase({ kind: "over", score, newBest });
    },
    [openId, bests],
  );

  return (
    <section
      aria-labelledby="arcade-title"
      data-testid="arcade"
      className={embedded ? "mt-6" : "mt-10"}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Just for fun
      </p>
      <h2
        id="arcade-title"
        className="font-display text-2xl font-bold tracking-tight text-[var(--text-strong)]"
      >
        Arcade
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Free play, no points. Beat your own best!
      </p>

      {open ? (
        <GamePanel
          game={open}
          best={bests[open.id] ?? null}
          phase={phase}
          rnd={rnd}
          onStart={() =>
            setPhase((p) => ({
              kind: "playing",
              round: p.kind === "playing" ? p.round + 1 : Date.now(),
            }))
          }
          onFinish={finish}
          onBack={() => {
            setOpenId(null);
            setPhase({ kind: "intro" });
          }}
        />
      ) : (
        <ul
          className={`mt-4 grid gap-3 ${embedded ? "grid-cols-1" : "sm:grid-cols-2"}`}
        >
          {ARCADE_GAMES.map((game) => {
            const best = bests[game.id];
            return (
              <li key={game.id}>
                <button
                  type="button"
                  data-testid={`arcade-${game.id}`}
                  onClick={() => {
                    setOpenId(game.id);
                    setPhase({ kind: "intro" });
                  }}
                  className="ios-card flex min-h-11 w-full items-center gap-4 p-4 text-left"
                >
                  <span aria-hidden="true" className="text-4xl">
                    {game.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[var(--text-strong)]">
                      {game.name}
                    </span>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {game.blurb}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--fill-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-strong)]">
                    {best === undefined ? "Play" : `Best ${best}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GamePanel({
  game,
  best,
  phase,
  rnd,
  onStart,
  onFinish,
  onBack,
}: Readonly<{
  game: ArcadeGame;
  best: number | null;
  phase: Phase;
  rnd?: Rnd;
  onStart: () => void;
  onFinish: (score: number) => void;
  onBack: () => void;
}>) {
  const Game = COMPONENTS[game.id];
  return (
    <div className="ios-card mt-4 p-4 sm:p-6" data-testid="arcade-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 text-sm font-semibold text-[var(--accent-solid)] underline-offset-4 hover:underline"
        >
          ← All games
        </button>
        <span className="text-sm text-[var(--text-muted)]">
          {best === null ? "No best yet" : `Best: ${amount(best, game.unit)}`}
        </span>
      </div>
      <h3 className="font-display text-xl font-semibold text-[var(--text-strong)]">
        <span aria-hidden="true">{game.emoji} </span>
        {game.name}
      </h3>

      {phase.kind === "playing" ? (
        <div className="mx-auto mt-4 max-w-sm">
          <Game key={phase.round} onFinish={onFinish} rnd={rnd} />
        </div>
      ) : phase.kind === "over" ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p
            role="status"
            data-testid="arcade-result"
            className="font-display text-2xl font-bold text-[var(--text-strong)]"
          >
            {phase.newBest ? "🏆 New best!" : "Nice try!"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            You got {amount(phase.score, game.unit)}.
          </p>
          <button
            type="button"
            className="button-primary mt-2"
            onClick={onStart}
          >
            Play again
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">{game.blurb}</p>
          <button type="button" className="button-primary" onClick={onStart}>
            Start
          </button>
        </div>
      )}
    </div>
  );
}
