import { describe, expect, it } from "vitest";

import {
  advanceStack,
  amount,
  CATCH_CAT_Y,
  catchOver,
  clearMemoryMismatch,
  dealMemory,
  dropStack,
  flipMemory,
  isBetter,
  memoryWon,
  moveCat,
  newCatch,
  newSimon,
  newStack,
  newWhack,
  nextSimonRound,
  readBest,
  saveBest,
  simonRounds,
  simonShowMs,
  stackHeight,
  stepCatch,
  tapSimon,
  tickWhack,
  whack,
  whackLifetimeMs,
  whackOver,
  WHACK_MS,
} from "@/lib/games/arcade";

/** Returns the given values in turn, then repeats the last. */
const seq =
  (...values: number[]) =>
  () => {
    const v = values.length > 1 ? values.shift() : values[0];
    return v as number;
  };

describe("Arcade rules (FR-123)", () => {
  it("TC-P9-100 — isBetter and amount", () => {
    expect(isBetter("catch", 0, null)).toBe(false);
    expect(isBetter("catch", 3, null)).toBe(true);
    expect(isBetter("catch", 4, 3)).toBe(true);
    expect(isBetter("catch", 3, 3)).toBe(false);
    expect(isBetter("memory", 10, 12)).toBe(true);
    expect(isBetter("memory", 14, 12)).toBe(false);
    expect(amount(1, "cups")).toBe("1 cup");
    expect(amount(3, "cups")).toBe("3 cups");
    expect(amount(0, "moves")).toBe("0 moves");
  });

  it("TC-P9-100 — Cat Match deals 8 pairs, counts moves and clears mismatches", () => {
    const s = dealMemory(Math.random);
    expect(s.faces).toHaveLength(16);
    for (let f = 0; f < 8; f++) {
      expect(s.faces.filter((x) => x === f)).toHaveLength(2);
    }
    // Unshuffled deal: rnd 0.999 keeps j = i
    const d = dealMemory(() => 0.999);
    const first = d.faces[0];
    const mate = d.faces.indexOf(first as number, 1);
    const other = d.faces.findIndex((f) => f !== first);
    let m = flipMemory(d, 0);
    m = flipMemory(m, other);
    expect(m.moves).toBe(1);
    expect(m.pending).toEqual([0, other]);
    expect(flipMemory(m, mate)).toBe(m); // locked while a mismatch shows
    m = clearMemoryMismatch(m);
    expect(m.revealed).toEqual([]);
    m = flipMemory(flipMemory(m, 0), mate);
    expect(m.matched).toEqual([0, mate]);
    expect(m.moves).toBe(2);
    expect(flipMemory(m, 0)).toBe(m);
    expect(memoryWon(m)).toBe(false);
  });

  it("TC-P9-100 — Whack-a-Mouse spawns, scores golden mice higher, breaks combos and ends", () => {
    let s = newWhack();
    s = tickWhack(s, 400, seq(0.5));
    expect(s.mouse).toBe(4);
    expect(s.mouseLeftMs).toBe(whackLifetimeMs(WHACK_MS - 400, false));
    s = whack(s, 4, seq(0));
    expect(s).toMatchObject({ score: 1, combo: 1, mouse: null, gapMs: 200 });
    s = whack(s, 2, seq(0));
    expect(s).toMatchObject({ combo: 0, misses: 1 });
    // Every 7th mouse is golden and worth 3
    s = { ...s, spawned: 6, gapMs: 0 };
    s = tickWhack(s, 16, seq(0));
    expect(s.golden).toBe(true);
    s = whack(s, 0, seq(0));
    expect(s.score).toBe(4);
    // A mouse left up is a miss
    s = tickWhack({ ...s, gapMs: 0 }, 16, seq(0));
    s = tickWhack(s, 5000, seq(0));
    expect(s).toMatchObject({ mouse: null, combo: 0, misses: 2 });
    expect(whackLifetimeMs(0, false)).toBe(600);
    expect(whackLifetimeMs(WHACK_MS, true)).toBe(770);
    s = tickWhack(s, WHACK_MS, seq(0));
    expect(whackOver(s)).toBe(true);
  });

  it("TC-P9-100 — Treat Catcher scores fish and tea, loses a life on chilis and ends", () => {
    let s = moveCat(newCatch(), 2);
    expect(s.catX).toBe(0.92);
    s = moveCat(s, 0.5);
    s = {
      ...s,
      items: [
        { id: 1, x: 0.5, y: CATCH_CAT_Y - 0.001, kind: "tea" },
        { id: 2, x: 0.55, y: CATCH_CAT_Y - 0.001, kind: "chili" },
        { id: 3, x: 0.1, y: CATCH_CAT_Y - 0.001, kind: "fish" },
      ],
      spawnIn: 10,
    };
    s = stepCatch(s, 0.02, Math.random);
    expect(s.score).toBe(3);
    expect(s.lives).toBe(2);
    expect(s.items.map((i) => i.id)).toEqual([3]);
    // Spawn: a roll under 0.22 is a chili
    const spawned = stepCatch(
      { ...newCatch(), spawnIn: 0 },
      0.01,
      seq(0.1, 0.5, 0),
    );
    expect(spawned.items[0]).toMatchObject({ kind: "chili", y: -0.04 });
    expect(catchOver({ ...s, lives: 0 })).toBe(true);
    expect(
      catchOver(stepCatch({ ...s, timeLeftSec: 0.01 }, 0.02, Math.random)),
    ).toBe(true);
  });

  it("TC-P9-100 — Cup Stack trims misses, keeps perfect drops and ends on a miss", () => {
    let s = newStack();
    s = advanceStack(s, 10);
    expect(s.x).toBe(0.6);
    expect(s.dir).toBe(-1);
    s = dropStack({ ...s, x: 0.3 }); // perfect
    expect(s).toMatchObject({ perfects: 1 });
    expect(s.width).toBeCloseTo(0.41);
    expect(stackHeight(s)).toBe(1);
    s = dropStack({ ...s, x: 0.4, width: 0.4, dir: 1 }); // overlap 0.3
    expect(s.tower[2]?.[0]).toBeCloseTo(0.4);
    expect(s.width).toBeCloseTo(0.3);
    expect(s.x).toBe(0);
    s = dropStack({ ...s, x: 0.9 });
    expect(s.over).toBe(true);
    expect(stackHeight(s)).toBe(2);
  });

  it("TC-P9-100 — Paw Says grows the pattern and ends on a wrong pad", () => {
    let s = nextSimonRound(newSimon(), seq(0.3));
    expect(s.sequence).toEqual([1]);
    let [next, done] = tapSimon(s, 1);
    expect(done).toBe(true);
    s = nextSimonRound(next, seq(0.9));
    expect(s.sequence).toEqual([1, 3]);
    [next, done] = tapSimon(s, 2);
    expect(next.over).toBe(true);
    expect(simonRounds(next)).toBe(1);
    expect(simonShowMs(1)).toBe(540);
    expect(simonShowMs(50)).toBe(280);
  });

  it("TC-P9-100 — personal bests stay in the browser and ignore bad values", () => {
    window.localStorage.clear();
    expect(readBest("stack")).toBeNull();
    saveBest("stack", 7);
    expect(readBest("stack")).toBe(7);
    window.localStorage.setItem("bnc-arcade-best-catch", "abc");
    expect(readBest("catch")).toBeNull();
  });
});
