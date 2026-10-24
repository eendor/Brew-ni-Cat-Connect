/**
 * Browser capability checks shared by every 3D scene. Nothing here runs on
 * the server: callers only use it from effects inside client components.
 */

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
    maxDpr: mobile ? 1.25 : 1.75,
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

/** Watches frame times and steps heavy effects down once on slow devices. */
export class FrameBudget {
  private samples: number[] = [];
  private frames = 0;
  degraded = false;
  constructor(
    private readonly limitMs: number,
    private readonly onDegrade: () => void,
    private readonly disabled = false,
  ) {}
  push(dtMs: number) {
    this.frames += 1;
    if (this.degraded || this.disabled || this.frames < 30) return;
    this.samples.push(dtMs);
    if (this.samples.length > 24) this.samples.shift();
    if (this.samples.length === 24) {
      const avg = this.samples.reduce((a, b) => a + b, 0) / 24;
      if (avg > this.limitMs) {
        this.degraded = true;
        this.onDegrade();
      }
    }
  }
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
