import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  applyTheme,
  chooseTheme,
  followDeviceTheme,
  THEME_COLOR,
  THEME_EVENT,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
} from "@/lib/theme/theme";

/** A device with a dark mode setting and a reduce-motion setting. */
function device({ dark = false, still = false } = {}) {
  const listeners = new Set<() => void>();
  const media = (query: string) => ({
    media: query,
    matches: query.includes("reduce") ? still : dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  });
  vi.stubGlobal("matchMedia", media);
  return {
    listeners,
    turnDark() {
      dark = true;
      for (const fn of listeners) fn();
    },
  };
}

const page = () => document.documentElement.dataset.theme;
const barColor = () =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute("content");

describe("Day and night toggle (TC-P4-233 – TC-P4-236)", () => {
  beforeEach(() => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = THEME_COLOR.day;
    document.head.append(meta);
  });

  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.remove();
    Reflect.deleteProperty(document, "startViewTransition");
    vi.unstubAllGlobals();
  });

  it("TC-P4-233 — before the first paint, a saved choice wins, otherwise the device's dark mode decides", () => {
    const run = () => new Function(THEME_SCRIPT)();

    device({ dark: true });
    run();
    expect(page()).toBe("night");
    expect(barColor()).toBe(THEME_COLOR.night);

    window.localStorage.setItem(THEME_STORAGE_KEY, "day");
    run();
    expect(page()).toBe("day");
    expect(barColor()).toBe(THEME_COLOR.day);

    vi.unstubAllGlobals();
    device({ dark: false });
    window.localStorage.setItem(THEME_STORAGE_KEY, "night");
    run();
    expect(page()).toBe("night");

    // anything else saved there is ignored
    window.localStorage.setItem(THEME_STORAGE_KEY, "blue");
    run();
    expect(page()).toBe("day");
  });

  it("TC-P4-234 — choosing a theme saves it, recolors the page and the browser bar, and tells the 3D scenes once", () => {
    device();
    const changes = vi.fn();
    window.addEventListener(THEME_EVENT, changes);
    const transition = vi.fn((swap: () => void) => swap());
    Object.assign(document, { startViewTransition: transition });

    applyTheme("day");
    changes.mockClear();
    chooseTheme("night");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("night");
    expect(page()).toBe("night");
    expect(barColor()).toBe(THEME_COLOR.night);
    expect(transition).toHaveBeenCalledTimes(1);
    expect(changes).toHaveBeenCalledTimes(1);

    // the same theme again is not a change
    applyTheme("night");
    expect(changes).toHaveBeenCalledTimes(1);
    window.removeEventListener(THEME_EVENT, changes);
  });

  it("TC-P4-234 — with reduced motion the theme switches without the crossfade", () => {
    device({ still: true });
    const transition = vi.fn((swap: () => void) => swap());
    Object.assign(document, { startViewTransition: transition });
    chooseTheme("night");
    expect(page()).toBe("night");
    expect(transition).not.toHaveBeenCalled();
  });

  it("TC-P4-235 — the page follows the device's dark mode only until the visitor picks a theme", () => {
    const media = device();
    applyTheme("day");
    const stop = followDeviceTheme();
    media.turnDark();
    expect(page()).toBe("night");

    window.localStorage.setItem(THEME_STORAGE_KEY, "day");
    applyTheme("day");
    media.turnDark();
    expect(page()).toBe("day");

    stop();
    expect(media.listeners.size).toBe(0);
  });

  it("TC-P4-236 — the header button and the phone menu switch flip the theme and say which way they go", () => {
    device();
    applyTheme("day");
    const { unmount } = render(<ThemeToggle />);
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to night theme" }),
    );
    expect(page()).toBe("night");
    expect(
      screen.getByRole("button", { name: "Switch to day theme" }),
    ).toBeInTheDocument();
    unmount();

    render(<ThemeToggle variant="switch" />);
    const toggle = screen.getByRole("switch", { name: "Night mode" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(page()).toBe("day");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
