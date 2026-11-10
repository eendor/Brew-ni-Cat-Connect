import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatStrip } from "@/components/cats/cat-strip";
import {
  afterRest,
  CAT_SHEETS,
  catCount,
  catSheetUrl,
  nextRest,
  nextTarget,
  PIXEL_CATS,
} from "@/lib/cats/cats";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Frames run only when the test steps them. */
function manualFrames() {
  let queued: FrameRequestCallback | null = null;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    queued = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    queued = null;
  });
  return (now: number) =>
    act(() => {
      const cb = queued;
      queued = null;
      cb?.(now);
    });
}

const shownCats = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>(".pixel-cat")].filter(
    (n) => !n.hidden,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});

describe("cat characters (FR-099)", () => {
  // Update 2026-11-10: the drawn poster cats were replaced by the six pixel
  // cats of the CC0 "Pet Cats Pack"; this case now covers their behavior.
  it("TC-P9-001 six pixel cat coats, 3 cats on a phone and 12 on a desktop, rest in turn and nap after lying down", () => {
    expect(PIXEL_CATS).toHaveLength(6);
    expect(catCount(390)).toBe(3);
    expect(catCount(1440)).toBe(12);
    expect(catCount(4000)).toBe(16);
    expect(catSheetUrl("cat-2", "walk")).toBe("/cats/cat-2/walk.png");
    expect(CAT_SHEETS.walk.frames).toBe(8);
    for (let i = 0; i < 20; i += 1) {
      const rest = nextRest(i / 20, 0.5, false);
      expect(rest.action).not.toBe("itch");
      expect(rest.ms).toBeGreaterThan(0);
    }
    expect(nextRest(0.999, 0, true).action).toBe("itch");
    expect(afterRest("laying", 0)?.action).toBe("sleeping");
    expect(afterRest("idle", 0)).toBeNull();
    // every walk goes one to three cat sizes and stays in the strip
    for (const r of [0, 0.3, 0.5, 0.99]) {
      const target = nextTarget(r, 500, 1440, 150);
      expect(Math.abs(target - 500)).toBeGreaterThanOrEqual(150);
      expect(Math.abs(target - 500)).toBeLessThanOrEqual(450);
      expect(target).toBeGreaterThanOrEqual(-30);
      expect(target).toBeLessThanOrEqual(1440 - 120);
    }
  });

  it("TC-P9-002 the strip is hidden from screen readers and the cats move only by animation frames", () => {
    mockReducedMotion(false);
    const frame = manualFrames();
    const { getByTestId, container } = render(<CatStrip />);
    expect(getByTestId("cat-strip")).toHaveAttribute("aria-hidden", "true");
    const cats = shownCats(container);
    expect(cats.length).toBeGreaterThanOrEqual(3);
    const before = cats.map((c) => c.style.transform);
    frame(performance.now() + 60_000);
    for (let t = 1; t < 30; t += 1) frame(performance.now() + 60_000 + t * 100);
    const after = cats.map((c) => `${c.style.transform} ${c.dataset.action}`);
    expect(after.join()).not.toBe(before.join());
  });

  it("TC-P9-003 no cat moves while the tab is hidden", () => {
    mockReducedMotion(false);
    const frame = manualFrames();
    const { container } = render(<CatStrip />);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    const cats = shownCats(container);
    const before = cats.map((c) => `${c.style.transform} ${c.dataset.action}`);
    for (let t = 1; t < 30; t += 1) frame(performance.now() + 60_000 + t * 100);
    expect(cats.map((c) => `${c.style.transform} ${c.dataset.action}`)).toEqual(
      before,
    );
  });

  it("TC-P9-004 with reduced motion the cats sit still and no frame is requested", () => {
    mockReducedMotion(true);
    const raf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    const { container } = render(<CatStrip />);
    const cats = shownCats(container);
    expect(cats.length).toBeGreaterThanOrEqual(3);
    for (const cat of cats) expect(cat.dataset.action).toBe("sitting");
    expect(raf).not.toHaveBeenCalled();
  });
});
