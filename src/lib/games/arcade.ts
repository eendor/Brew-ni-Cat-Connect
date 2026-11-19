/**
 * Free-play arcade games (the same five games and rules as the Android app's
 * Arcade.kt). They are played for fun only: no points, nothing sent to the
 * server. The loyalty-point games stay server-decided (games.ts). Every rule
 * is a pure function of its state and an injected random number source, so it
 * is covered by plain unit tests.
 */

/** Returns a number in [0, 1), like Math.random. */
export type Rnd = () => number;

const nextInt = (rnd: Rnd, n: number) => Math.floor(rnd() * n);

export type ArcadeGameId = "catch" | "whack" | "stack" | "simon" | "memory";

export type ArcadeGame = Readonly<{
  id: ArcadeGameId;
  name: string;
  emoji: string;
  blurb: string;
  unit: string;
}>;

export const ARCADE_GAMES: readonly ArcadeGame[] = [
  {
    id: "catch",
    name: "Treat Catcher",
    emoji: "🐟",
    blurb: "Slide the cat to catch fish and milk tea. Dodge the chilis!",
    unit: "treats",
  },
  {
    id: "whack",
    name: "Whack-a-Mouse",
    emoji: "🐭",
    blurb:
      "Mice pop out of the holes. Tap them fast; golden ones are worth more.",
    unit: "points",
  },
  {
    id: "stack",
    name: "Cup Stack",
    emoji: "🥤",
    blurb:
      "Tap to drop each sliding cup. Line them up to build the tallest tower.",
    unit: "cups",
  },
  {
    id: "simon",
    name: "Paw Says",
    emoji: "🐾",
    blurb:
      "Watch the paws light up, then repeat the pattern. It gets longer each round.",
    unit: "rounds",
  },
  {
    id: "memory",
    name: "Cat Match",
    emoji: "🃏",
    blurb:
      "Flip the cards and find all the matching pairs in the fewest moves.",
    unit: "moves",
  },
];

/** For Cat Match fewer moves is better; for every other game higher wins. A zero never counts. */
export function isBetter(
  gameId: ArcadeGameId,
  score: number,
  best: number | null,
): boolean {
  if (score <= 0) return false;
  if (best === null) return true;
  return gameId === "memory" ? score < best : score > best;
}

/** "1 cup", "3 cups", "12 moves". */
export function amount(n: number, unit: string): string {
  return `${n} ${n === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit}`;
}

/* ---------- Cat Match (memory) ---------- */

export type MemoryState = Readonly<{
  faces: readonly number[];
  revealed: readonly number[];
  matched: readonly number[];
  moves: number;
  /** A mismatched pair waiting to be turned back over. */
  pending: readonly [number, number] | null;
}>;

export const MEMORY_PAIRS = 8;
export const MEMORY_FACES = ["🐱", "🧋", "🍟", "🐟", "🥛", "🍜", "🐾", "☕"];

export function memoryWon(s: MemoryState): boolean {
  return s.matched.length === s.faces.length;
}

export function dealMemory(rnd: Rnd, pairs = MEMORY_PAIRS): MemoryState {
  const faces = Array.from({ length: pairs }, (_, i) => [i, i]).flat();
  for (let i = faces.length - 1; i > 0; i--) {
    const j = nextInt(rnd, i + 1);
    [faces[i], faces[j]] = [faces[j] as number, faces[i] as number];
  }
  return { faces, revealed: [], matched: [], moves: 0, pending: null };
}

export function flipMemory(s: MemoryState, i: number): MemoryState {
  if (
    s.pending !== null ||
    i < 0 ||
    i >= s.faces.length ||
    s.matched.includes(i) ||
    s.revealed.includes(i)
  ) {
    return s;
  }
  const open = s.revealed[0];
  if (open === undefined) return { ...s, revealed: [i] };
  const moves = s.moves + 1;
  if (s.faces[open] === s.faces[i]) {
    return { ...s, revealed: [], matched: [...s.matched, open, i], moves };
  }
  return { ...s, revealed: [open, i], moves, pending: [open, i] };
}

export function clearMemoryMismatch(s: MemoryState): MemoryState {
  return s.pending === null ? s : { ...s, revealed: [], pending: null };
}

/* ---------- Whack-a-Mouse (reflex) ---------- */

export const WHACK_MS = 30_000;
export const WHACK_HOLES = 9;

export type WhackState = Readonly<{
  timeLeftMs: number;
  mouse: number | null;
  golden: boolean;
  mouseLeftMs: number;
  gapMs: number;
  score: number;
  combo: number;
  bestCombo: number;
  misses: number;
  spawned: number;
}>;

export const newWhack = (): WhackState => ({
  timeLeftMs: WHACK_MS,
  mouse: null,
  golden: false,
  mouseLeftMs: 0,
  gapMs: 350,
  score: 0,
  combo: 0,
  bestCombo: 0,
  misses: 0,
  spawned: 0,
});

export const whackOver = (s: WhackState) => s.timeLeftMs <= 0;

/** Mice stay up less time as the round goes on. */
export function whackLifetimeMs(timeLeftMs: number, golden: boolean): number {
  const elapsed = WHACK_MS - timeLeftMs;
  const base = Math.max(520, 1100 - Math.trunc(elapsed / 60));
  return golden ? Math.trunc(base * 0.7) : base;
}

export function tickWhack(s: WhackState, dtMs: number, rnd: Rnd): WhackState {
  if (whackOver(s)) return s;
  let n: WhackState = { ...s, timeLeftMs: Math.max(0, s.timeLeftMs - dtMs) };
  if (whackOver(n)) return { ...n, mouse: null };
  if (n.mouse !== null) {
    const left = n.mouseLeftMs - dtMs;
    n =
      left <= 0
        ? {
            ...n,
            mouse: null,
            combo: 0,
            misses: n.misses + 1,
            gapMs: 250 + nextInt(rnd, 350),
          }
        : { ...n, mouseLeftMs: left };
  } else {
    const gap = n.gapMs - dtMs;
    if (gap > 0) {
      n = { ...n, gapMs: gap };
    } else {
      const golden = (n.spawned + 1) % 7 === 0;
      n = {
        ...n,
        mouse: nextInt(rnd, WHACK_HOLES),
        golden,
        mouseLeftMs: whackLifetimeMs(n.timeLeftMs, golden),
        spawned: n.spawned + 1,
      };
    }
  }
  return n;
}

/** Tapping the mouse scores (more with a streak); tapping an empty hole breaks the streak. */
export function whack(s: WhackState, hole: number, rnd: Rnd): WhackState {
  if (whackOver(s)) return s;
  if (s.mouse === hole) {
    const combo = s.combo + 1;
    const gained = (s.golden ? 3 : 1) + Math.trunc(combo / 5);
    return {
      ...s,
      mouse: null,
      score: s.score + gained,
      combo,
      bestCombo: Math.max(s.bestCombo, combo),
      gapMs: 200 + nextInt(rnd, 300),
    };
  }
  return { ...s, combo: 0, misses: s.misses + 1 };
}

/* ---------- Treat Catcher (catching) ---------- */

export type TreatKind = "fish" | "tea" | "chili";

export const TREATS: Readonly<
  Record<TreatKind, { emoji: string; points: number }>
> = {
  fish: { emoji: "🐟", points: 1 },
  tea: { emoji: "🧋", points: 3 },
  chili: { emoji: "🌶️", points: 0 },
};

export type Faller = Readonly<{
  id: number;
  x: number;
  y: number;
  kind: TreatKind;
}>;

export const CATCH_SEC = 45;
export const CATCH_CAT_Y = 0.88;
export const CATCH_HALF_WIDTH = 0.13;

export type CatchState = Readonly<{
  catX: number;
  items: readonly Faller[];
  score: number;
  lives: number;
  timeLeftSec: number;
  spawnIn: number;
  elapsed: number;
  nextId: number;
}>;

export const newCatch = (): CatchState => ({
  catX: 0.5,
  items: [],
  score: 0,
  lives: 3,
  timeLeftSec: CATCH_SEC,
  spawnIn: 0.5,
  elapsed: 0,
  nextId: 1,
});

export const catchOver = (s: CatchState) => s.lives <= 0 || s.timeLeftSec <= 0;

export const catchSpeed = (elapsed: number) =>
  0.3 + Math.min(0.45, elapsed * 0.012);

export function moveCat(s: CatchState, x: number): CatchState {
  return { ...s, catX: Math.min(0.92, Math.max(0.08, x)) };
}

export function stepCatch(s: CatchState, dt: number, rnd: Rnd): CatchState {
  if (catchOver(s)) return s;
  let { score, lives, nextId } = s;
  const kept: Faller[] = [];
  for (const f of s.items) {
    const moved = { ...f, y: f.y + catchSpeed(s.elapsed) * dt };
    if (
      moved.y >= CATCH_CAT_Y &&
      moved.y <= CATCH_CAT_Y + 0.07 &&
      Math.abs(moved.x - s.catX) <= CATCH_HALF_WIDTH
    ) {
      if (moved.kind === "chili") lives -= 1;
      else score += TREATS[moved.kind].points;
    } else if (moved.y <= 1.06) {
      kept.push(moved);
    }
  }
  let spawnIn = s.spawnIn - dt;
  if (spawnIn <= 0) {
    const roll = rnd();
    const kind: TreatKind = roll < 0.22 ? "chili" : roll < 0.4 ? "tea" : "fish";
    kept.push({ id: nextId, x: 0.08 + rnd() * 0.84, y: -0.04, kind });
    nextId += 1;
    spawnIn = Math.max(0.35, 0.85 - s.elapsed * 0.01) + rnd() * 0.25;
  }
  return {
    ...s,
    items: kept,
    score,
    lives,
    spawnIn,
    nextId,
    elapsed: s.elapsed + dt,
    timeLeftSec: Math.max(0, s.timeLeftSec - dt),
  };
}

/* ---------- Cup Stack (timing) ---------- */

export type StackState = Readonly<{
  /** Landed cups as [left edge, width] in 0..1 board units, bottom first. */
  tower: readonly (readonly [number, number])[];
  x: number;
  width: number;
  dir: 1 | -1;
  perfects: number;
  over: boolean;
}>;

export const STACK_PERFECT = 0.012;

export const newStack = (): StackState => ({
  tower: [[0.3, 0.4]],
  x: 0,
  width: 0.4,
  dir: 1,
  perfects: 0,
  over: false,
});

export const stackHeight = (s: StackState) => s.tower.length - 1;

export const stackSpeed = (height: number) =>
  0.55 + Math.min(1.0, height * 0.05);

export function advanceStack(s: StackState, dt: number): StackState {
  if (s.over) return s;
  let x = s.x + s.dir * stackSpeed(stackHeight(s)) * dt;
  let dir = s.dir;
  if (x + s.width >= 1) {
    x = 1 - s.width;
    dir = -1;
  }
  if (x <= 0) {
    x = 0;
    dir = 1;
  }
  return { ...s, x, dir };
}

export function dropStack(s: StackState): StackState {
  if (s.over) return s;
  const [topX, topW] = s.tower[s.tower.length - 1] as readonly [number, number];
  const left = Math.max(s.x, topX);
  const right = Math.min(s.x + s.width, topX + topW);
  const overlap = right - left;
  if (overlap <= 0.005) return { ...s, over: true };
  const perfect = Math.abs(s.x - topX) <= STACK_PERFECT;
  const landed: readonly [number, number] = perfect
    ? [topX, topW]
    : [left, overlap];
  const nextWidth = perfect ? Math.min(0.5, topW + 0.01) : overlap;
  return {
    ...s,
    tower: [...s.tower, landed],
    width: nextWidth,
    x: s.dir > 0 ? 0 : 1 - nextWidth,
    perfects: s.perfects + (perfect ? 1 : 0),
  };
}

/* ---------- Paw Says (pattern) ---------- */

export const SIMON_PADS = 4;

export type SimonState = Readonly<{
  sequence: readonly number[];
  input: number;
  over: boolean;
}>;

export const newSimon = (): SimonState => ({
  sequence: [],
  input: 0,
  over: false,
});

/** Rounds fully repeated so far. */
export const simonRounds = (s: SimonState) =>
  Math.max(0, s.sequence.length - 1);

export function nextSimonRound(s: SimonState, rnd: Rnd): SimonState {
  return {
    ...s,
    sequence: [...s.sequence, nextInt(rnd, SIMON_PADS)],
    input: 0,
  };
}

/** The player tapped `pad`. Returns the new state and whether the whole round is now complete. */
export function tapSimon(
  s: SimonState,
  pad: number,
): readonly [SimonState, boolean] {
  if (s.over || s.input >= s.sequence.length) return [s, false];
  if (s.sequence[s.input] !== pad) return [{ ...s, over: true }, false];
  const next = { ...s, input: s.input + 1 };
  return [next, next.input === next.sequence.length];
}

/** Milliseconds each pad stays lit; speeds up in longer rounds. */
export const simonShowMs = (length: number) => Math.max(280, 560 - length * 20);

/* ---------- Personal bests, kept only in this browser ---------- */

const bestKey = (id: ArcadeGameId) => `bnc-arcade-best-${id}`;

export function readBest(id: ArcadeGameId): number | null {
  try {
    const raw = window.localStorage.getItem(bestKey(id));
    const value = raw === null ? NaN : Number(raw);
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

const bestListeners = new Set<() => void>();

export function saveBest(id: ArcadeGameId, score: number): void {
  try {
    window.localStorage.setItem(bestKey(id), String(score));
  } catch {
    // Private windows can refuse storage; the best score just isn't kept.
  }
  bestListeners.forEach((listener) => listener());
}

/** For useSyncExternalStore: called again after every saveBest. */
export function subscribeBests(listener: () => void): () => void {
  bestListeners.add(listener);
  return () => bestListeners.delete(listener);
}

/** Every saved best as one string, e.g. "stack:7,memory:14", so React can compare snapshots. */
export function bestsSnapshot(): string {
  return ARCADE_GAMES.flatMap((game) => {
    const best = readBest(game.id);
    return best === null ? [] : [`${game.id}:${best}`];
  }).join(",");
}

export function parseBests(
  snapshot: string,
): Partial<Record<ArcadeGameId, number>> {
  const bests: Partial<Record<ArcadeGameId, number>> = {};
  for (const part of snapshot.split(",")) {
    const [id, value] = part.split(":");
    const game = ARCADE_GAMES.find((g) => g.id === id);
    if (game && value) bests[game.id] = Number(value);
  }
  return bests;
}
