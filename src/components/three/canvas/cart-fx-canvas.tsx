"use client";

import { setCartFxActive } from "../cart-toss";
import { initCartFx } from "../scenes/cart-fx";
import { useScene } from "./use-scene";

export default function CartFxCanvas() {
  const canvasRef = useScene(async (canvas, quality) => {
    const scene = await initCartFx(canvas, quality);
    setCartFxActive(true);
    return {
      frame: (dt, time) => scene.frame(dt, time),
      dispose: () => {
        setCartFxActive(false);
        scene.dispose();
      },
    };
  });
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] block h-screen w-screen"
      aria-hidden="true"
    />
  );
}
