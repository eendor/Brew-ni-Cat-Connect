"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useImperativeHandle, useRef, type Ref } from "react";

import { watchVisible } from "../engine/runtime";
import { initVisit, type VisitFacts } from "../scenes/visit";
import { useScene } from "./use-scene";

gsap.registerPlugin(ScrollTrigger);

export type VisitControls = { toggle: () => boolean };

type VisitCanvasProps = Readonly<{
  facts: VisitFacts;
  onReady: () => void;
  onError: () => void;
  controlsRef: Ref<VisitControls>;
}>;

export default function VisitCanvas({
  facts,
  onReady,
  onError,
  controlsRef,
}: VisitCanvasProps) {
  const apiRef = useRef<VisitControls | null>(null);
  useImperativeHandle(
    controlsRef,
    () => ({ toggle: () => apiRef.current?.toggle() ?? false }),
    [],
  );
  const canvasRef = useScene(
    async (canvas, quality) => {
      const visit = await initVisit(canvas, quality, facts);
      apiRef.current = visit;
      const trigger = ScrollTrigger.create({
        trigger: canvas,
        start: "top 85%",
        end: "bottom top",
      });
      const visible = watchVisible(canvas);
      return {
        frame: (dt) => {
          if (visible.visible) visit.frame(dt, trigger.progress);
        },
        dispose: () => {
          apiRef.current = null;
          trigger.kill();
          visible.dispose();
          visit.dispose();
        },
      };
    },
    { onReady, onError },
  );
  return (
    <canvas
      ref={canvasRef}
      className="block size-full cursor-pointer"
      aria-hidden="true"
      data-testid="visit-canvas"
    />
  );
}
