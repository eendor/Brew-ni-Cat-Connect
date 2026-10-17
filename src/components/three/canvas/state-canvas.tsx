"use client";

import { watchVisible } from "../engine/runtime";
import { initState, type StateKind, type StateTone } from "../scenes/state";
import { useScene } from "./use-scene";

type StateCanvasProps = Readonly<{
  kind: StateKind;
  tone: StateTone;
  onReady: () => void;
  onError: () => void;
}>;

export default function StateCanvas({
  kind,
  tone,
  onReady,
  onError,
}: StateCanvasProps) {
  const canvasRef = useScene(
    async (canvas, quality) => {
      const scene = await initState(canvas, quality, kind, tone);
      const visible = watchVisible(canvas, "0px");
      return {
        frame: (dt) => {
          if (visible.visible) scene.frame(dt);
        },
        dispose: () => {
          visible.dispose();
          scene.dispose();
        },
      };
    },
    { onReady, onError },
  );
  return (
    <canvas
      ref={canvasRef}
      className="block size-full"
      aria-hidden="true"
      data-testid="state-canvas"
    />
  );
}
