"use client";

import { setCartFxActive } from "../cart-toss";
import { whenIdle } from "../engine/runtime";
import { initCartFx } from "../scenes/cart-fx";
import { useScene } from "./use-scene";

/** The toss renders from its own tween, so the shared loop has no work. */
const idle = () => {};

export default function CartFxCanvas() {
  const canvasRef = useScene(
    async (canvas, quality) => {
      const scene = await initCartFx(canvas, quality);
      setCartFxActive(true);
      return {
        frame: idle,
        dispose: () => {
          setCartFxActive(false);
          scene.dispose();
        },
      };
    },
    // nobody can add to the cart in the first moments, so let the page
    // hero load first
    { start: (_canvas, signal) => whenIdle(signal) },
  );
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] block h-screen w-screen"
      aria-hidden="true"
    />
  );
}
