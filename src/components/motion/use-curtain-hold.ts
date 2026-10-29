"use client";

import { useLayoutEffect } from "react";

import { curtainCovering, holdCurtain } from "./curtain-state";

/**
 * Holds the route curtain closed while `waiting` is true on the page it
 * opens onto: a hero 3D scene still building. The page is then revealed
 * with its 3D already drawn. The hold is taken in a layout effect, so it is
 * in place before the curtain checks for it, and the curtain stops waiting
 * after a short cap.
 */
export function useCurtainHold(waiting: boolean) {
  useLayoutEffect(() => {
    if (!waiting || !curtainCovering()) return;
    return holdCurtain();
  }, [waiting]);
}
