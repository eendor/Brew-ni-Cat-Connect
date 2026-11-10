import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatStrip } from "@/components/cats/cat-strip";
import {
  CAT_WAIT_MAX_MS,
  CAT_WAIT_MIN_MS,
  SHOP_CATS,
  nextCatIndex,
  nextCatWait,
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cat characters (FR-099)", () => {
  it("TC-P9-001 the four poster cats walk now and then, never the same cat twice in a row", () => {
    expect(SHOP_CATS.map((cat) => cat.name)).toEqual([
      "Kasper",
      "Latte",
      "Luna",
      "Kulas",
    ]);
    expect(nextCatWait(0)).toBe(CAT_WAIT_MIN_MS);
    expect(nextCatWait(1)).toBeLessThanOrEqual(CAT_WAIT_MAX_MS);
    expect(nextCatWait(-5)).toBe(CAT_WAIT_MIN_MS);
    for (const last of [0, 1, 2, 3]) {
      for (const random of [0, 0.4, 0.99]) {
        const next = nextCatIndex(random, last);
        expect(next).not.toBe(last);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(SHOP_CATS.length);
      }
    }
    expect(nextCatIndex(0.99, null)).toBe(3);
  });

  it("TC-P9-002 the strip is hidden from screen readers, ignores taps and walks one cat after a wait", () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { getByTestId, container } = render(<CatStrip />);
    const strip = getByTestId("cat-strip");
    expect(strip.getAttribute("aria-hidden")).toBe("true");
    expect(strip.className).toContain("cat-strip");
    expect(container.querySelector("a, button, [tabindex]")).toBeNull();
    expect(container.querySelector(".cat-strip__walker")).toBeNull();

    act(() => vi.advanceTimersByTime(CAT_WAIT_MIN_MS));
    const walker = container.querySelector(".cat-strip__walker");
    expect(walker?.querySelector("[data-cat]")?.getAttribute("data-cat")).toBe(
      "Kasper",
    );
    expect(walker?.querySelector(".cat-figure--walking")).not.toBeNull();
  });

  it("TC-P9-003 no cat walks while the tab is hidden, and a hidden tab stops the walk", () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const { container } = render(<CatStrip />);
    act(() => vi.advanceTimersByTime(CAT_WAIT_MAX_MS * 2));
    expect(container.querySelector(".cat-strip__walker")).toBeNull();

    hidden.mockReturnValue(false);
    act(() => vi.advanceTimersByTime(CAT_WAIT_MIN_MS));
    expect(container.querySelector(".cat-strip__walker")).not.toBeNull();
    hidden.mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(container.querySelector(".cat-strip__walker")).toBeNull();
  });

  it("TC-P9-004 with reduced motion no cat walks; the four cats sit still instead", () => {
    vi.useFakeTimers();
    mockReducedMotion(true);
    const { container } = render(<CatStrip />);
    act(() => vi.advanceTimersByTime(CAT_WAIT_MAX_MS * 3));
    expect(container.querySelector(".cat-strip__walker")).toBeNull();
    const sitting = container.querySelectorAll(
      ".cat-strip__sitting [data-cat]",
    );
    expect(sitting).toHaveLength(4);
    expect(container.querySelector(".cat-figure--walking")).toBeNull();
  });
});
