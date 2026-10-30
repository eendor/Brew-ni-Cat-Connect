"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";

import type { StateKind } from "./scenes/state";
import { useThreeEnabled } from "./use-three-enabled";

const StateCanvas = dynamic(() => import("./canvas/state-canvas"), {
  ssr: false,
});

type StateSceneProps = Readonly<{
  kind: StateKind;
  /** Size and spacing of the box; the scene fills it. */
  className?: string;
  /** What shows without WebGL or with reduced motion (the static icon). */
  fallback?: ReactNode;
}>;

/**
 * A small three.js scene for a page state: an empty cart, an order summary
 * that is ready, a page that was not found. Decorative, so the words around
 * it carry the meaning; without WebGL or with reduced motion the box shows
 * `fallback` instead, at the same size.
 */
export function StateScene({
  kind,
  className = "",
  fallback = null,
}: StateSceneProps) {
  const enabled = useThreeEnabled();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);
  const three = enabled && !failed;

  return (
    <div
      className={`state-scene${three ? " state-scene--3d" : ""}${ready ? " is-ready" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {three ? (
        <StateCanvas kind={kind} onReady={onReady} onError={onError} />
      ) : (
        fallback
      )}
    </div>
  );
}
