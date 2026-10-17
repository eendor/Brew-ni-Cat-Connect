"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { AmbientMood } from "./scenes/ambient";
import { useThreeEnabled } from "./use-three-enabled";

const AmbientCanvas = dynamic(() => import("./canvas/ambient-canvas"), {
  ssr: false,
});

/** Decorative 3D backdrop for interior page headers. */
export function AmbientBackdrop({ mood }: Readonly<{ mood: AmbientMood }>) {
  const enabled = useThreeEnabled();
  const [ready, setReady] = useState(false);
  if (!enabled) return null;
  return (
    <div
      className={`ambient-backdrop${ready ? " ambient-backdrop--ready" : ""}`}
      aria-hidden="true"
    >
      <AmbientCanvas mood={mood} onReady={() => setReady(true)} />
    </div>
  );
}
