/**
 * Browser capability checks shared by every 3D scene. Nothing here runs on
 * the server: callers only use it from effects inside client components.
 */

import {
  curtainMoving,
  whenCurtainSettles,
} from "@/components/motion/curtain-state";

export type Quality = Readonly<{
  /** Phone-sized or coarse-pointer device: lower DPR, fewer particles. */
  mobile: boolean;
  /** Device pixel ratio cap for WebGL canvases. */
  maxDpr: number;
  /** `?quality=high` keeps bloom and depth of field on slow GPUs (captures). */
  forceHigh: boolean;
  /**
   * Phones without `?quality=high`: scenes light with the half-size HDRI,
   * and the home showcase drops its heaviest effects (ADR-014).
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

/** True when the 3D layer should run at all. */
export function shouldRunThree(): boolean {
  return !prefersReducedMotion() && webglAvailable();
}

export function getQuality(): Quality {
  const mobile = window.matchMedia(
    "(max-width: 760px), (pointer: coarse)",
  ).matches;
  const params = new URLSearchParams(window.location.search);
  const forceHigh = params.get("quality") === "high";
  return {
    mobile,
    maxDpr: mobile ? 1.25 : 1.5,
    forceHigh,
    lite: mobile && !forceHigh,
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
  const body = style.getPropertyValue("--font-archivo").trim() || "Archivo";
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
 * The average frame time scenes aim to stay under, about 45 frames a second.
 * Slower than that reads as stutter, so the frame budget steps effects down.
 */
export const FRAME_BUDGET_MS = 22;
/** Frames left out after a scene starts or steps down, while it settles. */
const SETTLE_FRAMES = 30;
/** Frames averaged for each check. */
const WINDOW_FRAMES = 30;
/** One long frame (a page task, a garbage collection) counts as this at most. */
const SAMPLE_CAP_MS = 50;

/** The furthest any scene has stepped down during this visit. */
let visitLevel = 0;

/**
 * Watches frame times and steps a scene's heavy effects down, one step at a
 * time, while its frames average slower than `limitMs`. After each step it
 * lets the cheaper settings settle before it checks again. A scene that
 * starts later in the same visit begins at the step earlier scenes reached,
 * so a slow device doesn't stutter through the same steps on every page.
 * `disabled` (`?quality=high`) keeps every effect on.
 */
export class FrameBudget {
  /** Steps taken so far. */
  level = 0;
  private samples: number[] = [];
  private settle = SETTLE_FRAMES;
  constructor(
    private readonly limitMs: number,
    private readonly steps: ReadonlyArray<() => void>,
    private readonly disabled = false,
  ) {}

  push(dtMs: number) {
    if (this.disabled) return;
    while (this.level < Math.min(visitLevel, this.steps.length)) {
      this.stepDown();
    }
    if (this.level >= this.steps.length) return;
    if (this.settle > 0) {
      this.settle -= 1;
      return;
    }
    this.samples.push(Math.min(dtMs, SAMPLE_CAP_MS));
    if (this.samples.length > WINDOW_FRAMES) this.samples.shift();
    if (this.samples.length < WINDOW_FRAMES) return;
    const average =
      this.samples.reduce((sum, sample) => sum + sample, 0) / WINDOW_FRAMES;
    if (average > this.limitMs) {
      this.stepDown();
      visitLevel = Math.max(visitLevel, this.level);
    }
  }

  private stepDown() {
    const step = this.steps[this.level];
    this.level += 1;
    this.samples = [];
    this.settle = SETTLE_FRAMES;
    step?.();
  }
}

/** Forgets the steps scenes took during this visit (for tests). */
export function resetFrameBudgets() {
  visitLevel = 0;
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

/** Keeps a scene asleep while its element is off screen. */
export function watchVisible(element: Element, margin = "160px") {
  const state = { visible: false, dispose: () => {} };
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
