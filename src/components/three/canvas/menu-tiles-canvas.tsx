"use client";

import { initMenuCards } from "../scenes/menu-cards";
import { useScene } from "./use-scene";

export default function MenuTilesCanvas() {
  const canvasRef = useScene(async (canvas, quality) => {
    const scene = await initMenuCards(canvas, quality);
    document.documentElement.classList.add("three-menu");
    return {
      frame: (dt) => scene.frame(dt),
      dispose: () => {
        document.documentElement.classList.remove("three-menu");
        scene.dispose();
      },
    };
  });
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[25] block h-screen w-screen"
      aria-hidden="true"
    />
  );
}
