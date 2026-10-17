/**
 * Glow colours for menu categories. Each category gets a pair from the
 * Night Shift Glow palette (drinks green/amber, bites orange/yellow,
 * buldak pink/cyan, …). The catalog publishes the pair for the category in
 * view; the menu hero, the page glow field and the section headings follow it.
 */
export type GlowPair = Readonly<{ a: string; b: string }>;

const DRINKS: GlowPair = { a: "#7CFF6B", b: "#FFB547" };
const BITES: GlowPair = { a: "#FF6A3D", b: "#FFD93B" };
const BULDAK: GlowPair = { a: "#FF3D7F", b: "#5EE1FF" };
const COMBOS: GlowPair = { a: "#FFB547", b: "#FF6A3D" };
const TAKEOUT: GlowPair = { a: "#FFD93B", b: "#FFB547" };
const TREATS: GlowPair = { a: "#5EE1FF", b: "#7CFF6B" };

export const DEFAULT_GLOW: GlowPair = DRINKS;

export function glowForCategory(name: string): GlowPair {
  const n = name.toLowerCase();
  if (/drink|coffee|latte|tea|soda|frapp/.test(n)) return DRINKS;
  if (/bite|snack|fries|takoyaki|nacho/.test(n)) return BITES;
  if (/buldak|sedaap|noodle|ramen/.test(n)) return BULDAK;
  if (/combo|package|bundle/.test(n)) return COMBOS;
  if (/take-?out|box/.test(n)) return TAKEOUT;
  if (/treat/.test(n)) return TREATS;
  return DRINKS;
}

const EVENT = "menu:glow";
let current: GlowPair = DEFAULT_GLOW;

export function currentMenuGlow(): GlowPair {
  return current;
}

/** Sets the page glow variables and tells any 3D scene to follow. */
export function publishMenuGlow(pair: GlowPair) {
  if (typeof document === "undefined") return;
  if (pair.a === current.a && pair.b === current.b) return;
  current = pair;
  const root = document.documentElement.style;
  root.setProperty("--menu-glow-a", pair.a);
  root.setProperty("--menu-glow-b", pair.b);
  window.dispatchEvent(new CustomEvent<GlowPair>(EVENT, { detail: pair }));
}

export function subscribeMenuGlow(listener: (pair: GlowPair) => void) {
  const handler = (event: Event) =>
    listener((event as CustomEvent<GlowPair>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Clears the page-level variables when the menu page unmounts. */
export function resetMenuGlow() {
  current = DEFAULT_GLOW;
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  root.removeProperty("--menu-glow-a");
  root.removeProperty("--menu-glow-b");
}
