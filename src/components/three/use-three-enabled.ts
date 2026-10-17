"use client";

import { useSyncExternalStore } from "react";

import { shouldRunThree } from "./engine/runtime";

const noop = () => () => {};

/**
 * False during SSR and hydration, then true on the client when WebGL2 is
 * available and the visitor has not asked for reduced motion. Pages render
 * their static, fully accessible version first and add 3D on top.
 */
export function useThreeEnabled(): boolean {
  return useSyncExternalStore(
    noop,
    () => shouldRunThree(),
    () => false,
  );
}
