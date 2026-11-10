import { afterEach, beforeEach, vi } from "vitest";

/**
 * Online orders follow the opening hours (FR-112), so tests that place an
 * order run at a fixed time: Monday 9 November 2026, 2 PM in Manila.
 */
export const OPEN_TIME = Date.UTC(2026, 10, 9, 6, 0, 0);

export function useOpenShopClock() {
  beforeEach(() => {
    vi.setSystemTime(OPEN_TIME);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}
