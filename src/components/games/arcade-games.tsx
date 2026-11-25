"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  catchOver,
  clearMemoryMismatch,
  dealMemory,
  dropStack,
  flipMemory,
  MEMORY_FACES,
  memoryWon,
  moveCat,
  newCatch,
  newSimon,
  newStack,
  newWhack,
  nextSimonRound,
  advanceStack,
  simonRounds,
  simonShowMs,
  stackHeight,
  stepCatch,
  tapSimon,
  tickWhack,
  TREATS,
  whack,
  WHACK_HOLES,
  whackOver,
  type Rnd,
} from "@/lib/games/arcade";
import { WALK_FRAMES } from "@/lib/cats/sprites";
import { STACK_BLOCK, type GameIconName } from "@/lib/games/sprites";

import { CatSprite } from "./cat-sprite";
import { GameIcon, nineSlice } from "./game-icon";

export type ArcadeGameProps = Readonly<{
  onFinish: (score: number) => void;
  /** Injected for tests; Math.random otherwise. */
  rnd?: Rnd;
}>;

/**
 * Calls `onFrame` with the seconds since the last frame while `running`.
 * Frames are capped at 50 ms, and a hidden tab freezes the game.
 */
function useFrames(running: boolean, onFrame: (dt: number) => void) {
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });
  useEffect(() => {
    if (!running) return;
    let last: number | null = null;
    let id = 0;
    const loop = (now: number) => {
      if (document.hidden) {
        last = null;
      } else {
        if (last !== null)
          callback.current(Math.min(0.05, (now - last) / 1000));
        last = now;
      }
      id = window.requestAnimationFrame(loop);
    };
    id = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(id);
  }, [running]);
}

type HudItem = Readonly<{ icon?: GameIconName; text: ReactNode }>;

function Hud({ items }: Readonly<{ items: readonly HudItem[] }>) {
  return (
    <div className="flex flex-wrap gap-2" aria-live="off">
      {items.map(({ icon, text }, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--fill-secondary)] px-3 py-1.5 text-sm font-semibold text-[var(--text-strong)]"
        >
          {icon ? <GameIcon name={icon} scale={1} /> : null}
          {text}
        </span>
      ))}
    </div>
  );
}

/** Three hearts, the lost ones empty. */
function Lives({ lives }: Readonly<{ lives: number }>) {
  const left = Math.max(0, lives);
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <GameIcon key={i} name={i < left ? "heart" : "heart-empty"} scale={1} />
      ))}
      <span className="sr-only">
        {left} {left === 1 ? "life" : "lives"} left
      </span>
    </span>
  );
}

/* ---------- Treat Catcher ---------- */

export function CatchGame({ onFinish, rnd = Math.random }: ArcadeGameProps) {
  const [s, setS] = useState(newCatch);
  const done = useRef(false);
  const board = useRef<HTMLDivElement>(null);
  const [facing, setFacing] = useState(1);

  useFrames(!catchOver(s), (dt) => setS((cur) => stepCatch(cur, dt, rnd)));
  useEffect(() => {
    if (catchOver(s) && !done.current) {
      done.current = true;
      onFinish(s.score);
    }
  }, [s, onFinish]);

  const follow = (clientX: number) => {
    const rect = board.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = (clientX - rect.left) / rect.width;
    if (Math.abs(x - s.catX) > 0.005) setFacing(x < s.catX ? -1 : 1);
    setS((cur) => moveCat(cur, x));
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -0.08 : 0.08;
      setFacing(Math.sign(step));
      setS((cur) => moveCat(cur, cur.catX + step));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Hud
        items={[
          { icon: "fish", text: `${s.score} treats` },
          { text: <Lives lives={s.lives} /> },
          { icon: "clock", text: `${Math.ceil(s.timeLeftSec)}s left` },
        ]}
      />
      <div
        ref={board}
        role="application"
        tabIndex={0}
        aria-label="Treat Catcher board. Move the cat with the left and right arrow keys, or drag."
        data-testid="catch-board"
        onKeyDown={onKey}
        onPointerDown={(e) => follow(e.clientX)}
        onPointerMove={(e) => follow(e.clientX)}
        className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-[var(--shape-lg)] bg-[var(--surface-accent)]"
      >
        {s.items.map((f) => (
          <span
            key={f.id}
            aria-hidden="true"
            className="absolute flex -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
          >
            <GameIcon name={TREATS[f.kind].icon} />
          </span>
        ))}
        <span
          aria-hidden="true"
          className="absolute bottom-0 flex -translate-x-1/2"
          style={{ left: `${s.catX * 100}%` }}
        >
          <CatSprite
            cat="kulas"
            mode="walk"
            frame={Math.floor(s.catX * 40) % WALK_FRAMES}
            className={facing < 0 ? "-scale-x-100" : ""}
          />
        </span>
      </div>
      <p className="text-center text-xs text-[var(--text-muted)]">
        <GameIcon name="fish" scale={1} /> fish 1 ·{" "}
        <GameIcon name="tea" scale={1} /> milk tea 3 ·{" "}
        <GameIcon name="chili" scale={1} /> chili costs a life
      </p>
    </div>
  );
}

/* ---------- Whack-a-Mouse ---------- */

export function WhackGame({ onFinish, rnd = Math.random }: ArcadeGameProps) {
  const [s, setS] = useState(newWhack);
  const done = useRef(false);

  useFrames(!whackOver(s), (dt) =>
    setS((cur) => tickWhack(cur, Math.round(dt * 1000), rnd)),
  );
  useEffect(() => {
    if (whackOver(s) && !done.current) {
      done.current = true;
      onFinish(s.score);
    }
  }, [s, onFinish]);

  return (
    <div className="flex flex-col gap-3">
      <Hud
        items={[
          { icon: "mouse", text: `${s.score} points` },
          { icon: "flame", text: `x${s.combo} streak` },
          { icon: "clock", text: `${Math.ceil(s.timeLeftMs / 1000)}s left` },
        ]}
      />
      <div className="grid grid-cols-3 gap-3" data-testid="whack-board">
        {Array.from({ length: WHACK_HOLES }, (_, hole) => {
          const up = s.mouse === hole;
          return (
            <button
              key={hole}
              type="button"
              aria-label={
                up
                  ? `${s.golden ? "Golden mouse" : "Mouse"} in hole ${hole + 1}`
                  : `Hole ${hole + 1}`
              }
              onPointerDown={(e) => {
                e.preventDefault();
                setS((cur) => whack(cur, hole, rnd));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setS((cur) => whack(cur, hole, rnd));
                }
              }}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-full transition-colors ${
                up
                  ? s.golden
                    ? "bg-amber-300"
                    : "bg-[var(--accent-soft)]"
                  : "bg-[var(--fill-secondary)]"
              }`}
            >
              {up ? (
                <GameIcon name={s.golden ? "mouse-gold" : "mouse"} scale={3} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Cup Stack ---------- */

const STACK_SHOWN = 9;

export function StackGame({ onFinish }: ArcadeGameProps) {
  const [s, setS] = useState(newStack);
  const done = useRef(false);

  useFrames(!s.over, (dt) => setS((cur) => advanceStack(cur, dt)));
  useEffect(() => {
    if (s.over && !done.current) {
      done.current = true;
      onFinish(stackHeight(s));
    }
  }, [s, onFinish]);

  const shown = s.tower.slice(-STACK_SHOWN);
  const rowPct = 100 / (STACK_SHOWN + 2);

  return (
    <div className="flex flex-col gap-3">
      <Hud
        items={[
          { icon: "cup", text: `${stackHeight(s)} cups` },
          { icon: "sparkle", text: `${s.perfects} perfect` },
        ]}
      />
      <button
        type="button"
        data-testid="stack-board"
        aria-label={`Drop the cup. Tower: ${stackHeight(s)} cups.`}
        onPointerDown={(e) => {
          e.preventDefault();
          setS((cur) => dropStack(cur));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setS((cur) => dropStack(cur));
          }
        }}
        className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-[var(--shape-lg)] bg-[var(--surface-warm)]"
      >
        {shown.map(([x, w], i) => (
          <span
            key={s.tower.length - shown.length + i}
            aria-hidden="true"
            className="absolute"
            style={{
              ...nineSlice(STACK_BLOCK.sheet, STACK_BLOCK.slice, 3),
              left: `${x * 100}%`,
              width: `${w * 100}%`,
              bottom: `${i * rowPct}%`,
              height: `${rowPct}%`,
            }}
          />
        ))}
        {!s.over ? (
          <span
            aria-hidden="true"
            className="absolute"
            style={{
              ...nineSlice(STACK_BLOCK.lit, STACK_BLOCK.slice, 3),
              left: `${s.x * 100}%`,
              width: `${s.width * 100}%`,
              bottom: `${(shown.length + 0.6) * rowPct}%`,
              height: `${rowPct}%`,
            }}
          />
        ) : null}
      </button>
      <p className="text-center text-xs text-[var(--text-muted)]">
        Tap the board, or press Space, to drop the cup.
      </p>
    </div>
  );
}

/* ---------- Paw Says ---------- */

const PADS = [
  { name: "Green paw", on: "bg-emerald-400", off: "bg-emerald-700" },
  { name: "Orange paw", on: "bg-orange-300", off: "bg-orange-700" },
  { name: "Blue paw", on: "bg-sky-300", off: "bg-sky-700" },
  { name: "Pink paw", on: "bg-pink-300", off: "bg-pink-700" },
] as const;

export function SimonGame({ onFinish, rnd = Math.random }: ArcadeGameProps) {
  const [s, setS] = useState(() => nextSimonRound(newSimon(), rnd));
  const [lit, setLit] = useState(-1);
  const [showing, setShowing] = useState(true);
  const done = useRef(false);
  const length = s.sequence.length;

  // Play the pattern for this round, then hand over to the player.
  useEffect(() => {
    const timers: number[] = [];
    const ms = simonShowMs(length);
    let at = 700;
    // Turn off the pad the player just tapped to finish the last round.
    timers.push(window.setTimeout(() => setLit(-1), 200));
    for (const pad of s.sequence) {
      timers.push(window.setTimeout(() => setLit(pad), at));
      at += ms;
      timers.push(window.setTimeout(() => setLit(-1), at));
      at += 160;
    }
    timers.push(window.setTimeout(() => setShowing(false), at));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // A new round starts when the sequence grows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length]);

  // Un-light a tapped pad shortly after the tap.
  useEffect(() => {
    if (showing || lit < 0) return;
    const t = window.setTimeout(() => setLit(-1), 200);
    return () => window.clearTimeout(t);
  }, [lit, showing]);

  const tap = (pad: number) => {
    if (showing || s.over) return;
    const [next, complete] = tapSimon(s, pad);
    setLit(pad);
    if (next.over) {
      setS(next);
      if (!done.current) {
        done.current = true;
        onFinish(simonRounds(next));
      }
    } else {
      if (complete) setShowing(true);
      setS(complete ? nextSimonRound(next, rnd) : next);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Hud
        items={[
          { icon: "paw", text: `Round ${length}` },
          { text: showing ? "Watch the paws…" : "Your turn!" },
        ]}
      />
      <p role="status" className="text-center text-sm text-[var(--text-muted)]">
        {showing
          ? "Remember the order"
          : `Tap the same order (${s.input}/${length})`}
      </p>
      <div className="grid grid-cols-2 gap-3" data-testid="simon-board">
        {PADS.map((pad, i) => (
          <button
            key={pad.name}
            type="button"
            aria-label={pad.name}
            disabled={showing || s.over}
            onClick={() => tap(i)}
            className={`flex aspect-square items-center justify-center rounded-[1.75rem] transition-colors duration-100 disabled:cursor-default ${
              lit === i ? pad.on : pad.off
            }`}
          >
            <GameIcon
              name="paw-white"
              scale={4}
              className={lit === i ? "" : "opacity-70"}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Cat Match ---------- */

export function MemoryGame({ onFinish, rnd = Math.random }: ArcadeGameProps) {
  const [s, setS] = useState(() => dealMemory(rnd));
  const done = useRef(false);

  useEffect(() => {
    if (!s.pending) return;
    const t = window.setTimeout(() => setS(clearMemoryMismatch), 750);
    return () => window.clearTimeout(t);
  }, [s.pending]);

  useEffect(() => {
    if (memoryWon(s) && !done.current) {
      done.current = true;
      onFinish(s.moves);
    }
  }, [s, onFinish]);

  return (
    <div className="flex flex-col gap-3">
      <Hud
        items={[
          {
            icon: "card",
            text: `${s.moves} ${s.moves === 1 ? "move" : "moves"}`,
          },
          {
            icon: "heart",
            text: `${s.matched.length / 2}/${s.faces.length / 2} pairs`,
          },
        ]}
      />
      <div className="grid grid-cols-4 gap-2" data-testid="memory-board">
        {s.faces.map((face, i) => {
          const open = s.revealed.includes(i) || s.matched.includes(i);
          const card = MEMORY_FACES[face];
          return (
            <button
              key={i}
              type="button"
              aria-label={
                open
                  ? `Card ${i + 1}: ${card?.name ?? "?"}`
                  : `Card ${i + 1}, face down`
              }
              aria-pressed={open}
              onClick={() => setS((cur) => flipMemory(cur, i))}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-xl transition-colors ${
                s.matched.includes(i)
                  ? "bg-[var(--fill-secondary)] opacity-60"
                  : open
                    ? "bg-[var(--surface-raised)] ring-2 ring-[var(--accent-solid)]"
                    : "bg-[var(--accent-fill)]"
              }`}
            >
              {open && card ? (
                <GameIcon name={card.icon} scale={3} />
              ) : (
                <GameIcon name="paw-white" scale={2} className="opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
