"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { useCurtainHold } from "@/components/motion/use-curtain-hold";

import type { AmbientMood } from "./scenes/ambient";
import { useThreeEnabled } from "./use-three-enabled";

const AmbientCanvas = dynamic(() => import("./canvas/ambient-canvas"), {
  ssr: false,
});

/** Decorative 3D backdrop for interior page headers. */
export function AmbientBackdrop({ mood }: Readonly<{ mood: AmbientMood }>) {
  const enabled = useThreeEnabled();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);
  // a page opened through the route curtain is revealed with this in place
  useCurtainHold(enabled && !failed && !ready);
  if (!enabled || failed) return null;
  return (
    <div
      className={`ambient-backdrop${ready ? " ambient-backdrop--ready" : ""}`}
      aria-hidden="true"
    >
      <AmbientCanvas mood={mood} onReady={onReady} onError={onError} />
    </div>
  );
}
