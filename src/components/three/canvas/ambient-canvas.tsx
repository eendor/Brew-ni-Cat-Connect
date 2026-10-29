"use client";

import { watchVisible } from "../engine/runtime";
import { initAmbient, type AmbientMood } from "../scenes/ambient";
import { useScene } from "./use-scene";

type AmbientCanvasProps = Readonly<{
  mood: AmbientMood;
  onReady: () => void;
  onError: () => void;
}>;

export default function AmbientCanvas({
  mood,
  onReady,
  onError,
}: AmbientCanvasProps) {
  const canvasRef = useScene(
    async (canvas, quality) => {
      const scene = await initAmbient(canvas, quality, mood);
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
    { onReady, onError, underCurtain: true },
  );
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block size-full"
      aria-hidden="true"
      data-testid="ambient-canvas"
    />
  );
}
