/**
 * Day and night themes (FR-094, ADR-024). A first visit follows the device's
 * light or dark setting; the toggle overrides it and is remembered in this
 * browser. The colors live in globals.css: `:root` is day and
 * `:root[data-theme="night"]` is night.
 */
export type Theme = "day" | "night";

export const THEME_STORAGE_KEY = "bnc-theme";

/** Fired on `window` after the theme changes, so the 3D scenes can follow. */
export const THEME_EVENT = "bnc:theme";

/** The browser bar color for each theme: the page's canvas color. */
export const THEME_COLOR = { day: "#f6eee1", night: "#14120f" } as const;

const DARK_QUERY = "(prefers-color-scheme: dark)";

const isTheme = (value: unknown): value is Theme =>
  value === "day" || value === "night";

/**
 * Runs in <head> before the first paint, so a night page never flashes
 * cream. Wrapped in a function so it leaves no globals behind.
 */
export const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="day"&&t!=="night")t=matchMedia("${DARK_QUERY}").matches?"night":"day";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="night"?"${THEME_COLOR.night}":"${THEME_COLOR.day}")})()`;

/** The theme on the page now. */
export function readTheme(): Theme {
  if (typeof document === "undefined") return "day";
  return document.documentElement.dataset.theme === "night" ? "night" : "day";
}

/** The visitor's own choice, or null while the page follows the device. */
export function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** The device's light or dark setting as a theme. */
export function deviceTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "night" : "day";
}

/** Points the browser bar at the theme's canvas color. */
export function syncThemeColor(theme: Theme = readTheme()) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

/** Puts a theme on the page and tells the 3D scenes. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const changed = root.dataset.theme !== theme;
  root.dataset.theme = theme;
  syncThemeColor(theme);
  if (changed) window.dispatchEvent(new CustomEvent(THEME_EVENT));
}

/**
 * The toggle: remembers the choice and switches with a short crossfade where
 * the browser can (none with reduced motion).
 */
export function chooseTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // private windows can refuse storage; the switch still works this visit
  }
  const swap = () => applyTheme(theme);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!still && typeof document.startViewTransition === "function") {
    document.startViewTransition(swap);
  } else {
    swap();
  }
}

/** Calls back whenever the theme changes. */
export function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

/**
 * Keeps following the device's dark mode (for example at sunset) until the
 * visitor picks a theme with the toggle.
 */
export function followDeviceTheme() {
  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (!storedTheme()) applyTheme(deviceTheme());
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
