"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import type { VisitControls } from "./canvas/visit-canvas";
import type { VisitFacts } from "./scenes/visit";
import { useThreeEnabled } from "./use-three-enabled";

const VisitCanvas = dynamic(() => import("./canvas/visit-canvas"), {
  ssr: false,
});

/**
 * Hanging OPEN / CLOSED sign and a small street model of Abellera St. The
 * hours stay as real text beside it; the sign is decorative, and the flip
 * button only changes which side of the sign faces you. Without WebGL (or
 * with reduced motion) the sign is plain type set straight on the page.
 */
export function VisitStage({
  facts,
  className = "",
}: Readonly<{ facts: VisitFacts; className?: string }>) {
  const enabled = useThreeEnabled();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [showingClosed, setShowingClosed] = useState(false);
  const controls = useRef<VisitControls>(null);
  const three = enabled && !failed;

  return (
    <div className={`visit-stage ${className}`}>
      {three ? (
        <div className={`visit-stage__canvas${ready ? " is-ready" : ""}`}>
          <VisitCanvas
            facts={facts}
            controlsRef={controls}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div className="visit-stage__fallback" aria-hidden="true">
          <b>OPEN</b>
          <span>{facts.hours}</span>
          <small>{facts.days}</small>
          <small>
            {facts.otherDay} {facts.otherHours}
          </small>
        </div>
      )}
      {three && ready ? (
        <button
          type="button"
          className="button-ghost mt-4"
          aria-pressed={showingClosed}
          onClick={() => setShowingClosed(controls.current?.toggle() ?? false)}
        >
          {showingClosed ? "Show the open side" : "Flip the sign"}
        </button>
      ) : null}
    </div>
  );
}
