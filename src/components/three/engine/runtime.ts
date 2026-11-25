/**
 * Browser capability checks shared by every 3D scene. Nothing here runs on
 * the server: callers only use it from effects inside client components.
 */

import {
  curtainMoving,
  whenCurtainSettles,
} from "@/components/motion/curtain-state";

export type Quality = Readonly<{
  /** Phone-sized or coarse-pointer device: phone layouts, fewer particles. */
  mobile: boolean;
  /** Device pixel ratio cap for WebGL canvases. */
  maxDpr: number;
  /** `?quality=high` keeps every effect on, even on slow GPUs (captures). */
  forceHigh: boolean;
  /**
   * The light tier (ADR-014), only with `?quality=lite`. Scenes draw straight
   * to the canvas with no post effects, shadows or refraction, light with
   * the half-size HDRI on phones. They keep the screen's sharpness (up to 2×
   * on phones) and antialiasing.
   */
  lite: boolean;
}>;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return true;
  const params = new URLSearchParams(window.location.search);
  if (params.has("motion")) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let webglCache: boolean | null = null;

/** WebGL2 support without touching jsdom's unimplemented canvas API. */
export function webglAvailable(): boolean {
  if (webglCache !== null) return webglCache;
  if (
    typeof window === "undefined" ||
    typeof window.WebGL2RenderingContext === "undefined"
  ) {
    webglCache = false;
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webglCache = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/**
 * Notes older versions saved for devices they put on the lite tier. Every
 * device gets full effects now (2026-11-18), so they are cleared once.
 */
const OLD_LITE_KEYS = ["bnc-3d-lite", "bnc-3d-lite-v2"];
let oldNotesCleared = false;
function clearOldLiteNotes() {
  if (oldNotesCleared) return;
  oldNotesCleared = true;
  try {
    for (const key of OLD_LITE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // blocked storage: nothing to clear
  }
}

/** True when the 3D layer should run at all. */
export function shouldRunThree(): boolean {
  return !prefersReducedMotion() && webglAvailable();
}

export function getQuality(): Quality {
  const mobile = window.matchMedia(
    "(max-width: 760px), (pointer: coarse)",
  ).matches;
  const forced = new URLSearchParams(window.location.search).get("quality");
  const forceHigh = forced === "high";
  clearOldLiteNotes();
  // every device starts with full effects at full sharpness (the lead's
  // call, 2026-11-18 and 2026-11-24); one that can't hold 60 frames a second
  // eases the least visible effects while it runs (`FrameBudget`). The lite
  // tier is only for `?quality=lite`.
  const lite = forced === "lite";
  return {
    mobile,
    // sharp on every tier: phone screens are 2–3×, and drawing them at 1×
    // looked blurry
    maxDpr: mobile ? 2 : 1.5,
    forceHigh,
    lite,
  };
}

/** Pointer position in normalized device coords plus raw client pixels. */
export const pointer = { x: 0, y: 0, px: -9999, py: -9999 };
let pointerBound = false;
export function bindPointer() {
  if (pointerBound) return;
  pointerBound = true;
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
      pointer.px = event.clientX;
      pointer.py = event.clientY;
    },
    { passive: true },
  );
}

/** Resolved family names of the next/font faces, for canvas-drawn text. */
export function fontFamilies() {
  const style = getComputedStyle(document.documentElement);
  const display =
    style.getPropertyValue("--font-big-shoulders").trim() ||
    '"Big Shoulders Display"';
  const body = style.getPropertyValue("--font-inter").trim() || "Inter";
  return { display, body };
}

export async function fontsReady() {
  const { display, body } = fontFamilies();
  try {
    await Promise.all([
      document.fonts.load(`900 100px ${display}`),
      document.fonts.load(`800 100px ${display}`),
      document.fonts.load(`600 20px ${body}`),
      document.fonts.load(`800 20px ${body}`),
    ]);
  } catch {
    // Canvas text falls back to the next/font fallback face.
  }
}

export const damp = (a: number, b: number, lambda: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * A frame slower than this missed a 60 Hz screen's refresh. Scenes aim for
 * 60 frames a second, so the frame budget counts how often that happens.
 */
export const FRAME_BUDGET_MS = 20;
/** Frames left out after a scene starts or steps down, while it settles. */
const SETTLE_FRAMES = 30;
/** Frames in each check, about a second at 60 frames a second. */
const WINDOW_FRAMES = 60;
/**
 * The share of slow frames in a check that steps effects down: a quarter
 * is about 50 frames a second. A few long frames from a page task or a
 * garbage collection stay well under it.
 */
const SLOW_SHARE = 0.25;

/** The furthest any scene has stepped down during this visit. */
let visitLevel = 0;

/**
 * Watches frame times and steps a scene's heavy effects down, one step at a
 * time, while more than a quarter of its frames run slower than `limitMs`.
 * After each step it lets the cheaper settings settle before it checks
 * again. A scene that starts later in the same visit begins at the step
 * earlier scenes reached, so a slow device doesn't stutter through the same
 * steps on every page. Still slow with every step taken, it stops checking:
 * the scene keeps the effects it has left. `disabled` (`?quality=high`)
 * keeps every effect on.
 */
export class FrameBudget {
  /** Steps taken so far. */
  level = 0;
  private frames = 0;
  private slow = 0;
  private settle = SETTLE_FRAMES;
  private done = false;
  constructor(
    private readonly limitMs: number,
    private readonly steps: ReadonlyArray<() => void>,
    private readonly disabled = false,
  ) {}

  push(dtMs: number) {
    if (this.disabled || this.done) return;
    while (this.level < Math.min(visitLevel, this.steps.length)) {
      this.stepDown();
    }
    if (this.settle > 0) {
      this.settle -= 1;
      return;
    }
    this.frames += 1;
    if (dtMs > this.limitMs) this.slow += 1;
    if (this.frames < WINDOW_FRAMES) return;
    const tooSlow = this.slow > this.frames * SLOW_SHARE;
    this.frames = 0;
    this.slow = 0;
    if (!tooSlow) return;
    if (this.level < this.steps.length) {
      this.stepDown();
      visitLevel = Math.max(visitLevel, this.level);
      return;
    }
    this.done = true;
  }

  private stepDown() {
    const step = this.steps[this.level];
    this.level += 1;
    this.frames = 0;
    this.slow = 0;
    this.settle = SETTLE_FRAMES;
    step?.();
  }
}

/** Forgets what this visit learned about the device (for tests). */
export function resetRuntimeCaches() {
  visitLevel = 0;
  oldNotesCleared = false;
  webglCache = null;
}

/**
 * Resolves once the route curtain has fully opened (at once when it isn't
 * moving), on a later task so the curtain's last frame paints first.
 */
export function whenCurtainSettled(signal: AbortSignal) {
  if (!curtainMoving()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const cancel = whenCurtainSettles(() => {
      window.setTimeout(resolve, 0);
    });
    signal.addEventListener("abort", cancel, { once: true });
  });
}

/**
 * Resolves once the element comes within `margin` of the viewport, so a
 * scene further down the page doesn't start while the hero is loading.
 */
export function whenNear(
  element: Element,
  signal: AbortSignal,
  margin = "800px",
) {
  return new Promise<void>((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        resolve();
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    signal.addEventListener("abort", () => observer.disconnect(), {
      once: true,
    });
  });
}

/** Resolves on a later task, so a long scene setup lets the page respond. */
export function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Resolves when the browser is next idle, or after `timeout` ms at most. */
export function whenIdle(signal: AbortSignal, timeout = 3000) {
  return new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => resolve(), { timeout });
      signal.addEventListener("abort", () => window.cancelIdleCallback(id), {
        once: true,
      });
      return;
    }
    const id = window.setTimeout(resolve, 1500);
    signal.addEventListener("abort", () => window.clearTimeout(id), {
      once: true,
    });
  });
}

/**
 * Keeps a scene asleep while its element is off screen. It starts from
 * where the element is now, so a scene in view draws its first frame at
 * once instead of waiting for the observer's first report.
 */
export function watchVisible(element: Element, margin = "160px") {
  const reach = Number.parseFloat(margin) || 0;
  const rect = element.getBoundingClientRect();
  const state = {
    visible: rect.bottom >= -reach && rect.top <= window.innerHeight + reach,
    dispose: () => {},
  };
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (entry) state.visible = entry.isIntersecting;
    },
    { rootMargin: margin },
  );
  observer.observe(element);
  state.dispose = () => observer.disconnect();
  return state;
}
