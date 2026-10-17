"use client";

import { useSyncExternalStore } from "react";

import { shouldRunThree } from "./engine/runtime";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Re-checks when the visitor switches reduced motion on or off. */
function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * False during SSR and hydration, then true on the client when WebGL2 is
 * available and the visitor has not asked for reduced motion. Pages render
 * their static, fully accessible version first and add 3D on top; turning
 * reduced motion on later takes the 3D layer down again.
 */
export function useThreeEnabled(): boolean {
  return useSyncExternalStore(subscribe, shouldRunThree, () => false);
}
