"use client";

import gsap from "gsap";

import { useEffect, useRef } from "react";

import { watchVisible } from "../engine/runtime";
import { initShowcase } from "../scenes/showcase";
import type { ShowcaseItem } from "../showcase-data";
import { useScene } from "./use-scene";

/** Progress (0..1) at which the scene rests on a featured item. */
function reelPosition(index: number, count: number) {
  const last = Math.max(1, count - 1);
  return index <= 0 ? 0 : Math.min(1, (index + 0.2) / (last + 0.5));
}

type ShowcaseCanvasProps = Readonly<{
  items: readonly ShowcaseItem[];
  /** Index of the featured item to show; changes tween the reel to it. */
  target: number;
  onProduct: (index: number) => void;
  onGlow: (hex: string) => void;
  onReady: () => void;
  onError: () => void;
}>;

export default function ShowcaseCanvas({
  items,
  target,
  onProduct,
  onGlow,
  onReady,
  onError,
}: ShowcaseCanvasProps) {
  const targetRef = useRef(target);
  const reelRef = useRef<((index: number) => void) | null>(null);
  useEffect(() => {
    targetRef.current = target;
    reelRef.current?.(target);
  }, [target]);

  const canvasRef = useScene(
    async (canvas, quality) => {
      // the reel moves on its own, not with the page: `reel.t` is the same
      // 0..1 progress the scene used to read from the page scroll
      const reel = { t: reelPosition(targetRef.current, items.length) };
      const scene = await initShowcase(canvas, items, quality, {
        onProduct,
        onGlow,
        progress: () => reel.t,
      });
      reelRef.current = (index: number) => {
        gsap.to(reel, {
          t: reelPosition(index, items.length),
          duration: 1.6,
          ease: "power3.inOut",
          overwrite: true,
        });
      };
      // the intro starts once two frames are on screen: the shared ticker
      // has no lag smoothing, so a slow first frame on a phone would
      // otherwise skip part of it
      let intro: gsap.core.Tween | null = null;
      let drawn = 0;
      const visible = watchVisible(canvas.parentElement ?? canvas);
      return {
        frame: (dt) => {
          if (!visible.visible) return;
          scene.frame(dt);
          drawn += 1;
          if (intro || drawn < 2) return;
          intro = gsap.to(scene.state, {
            intro: 1,
            duration: 2.2,
            ease: "expo.out",
            delay: 0.15,
          });
        },
        dispose: () => {
          intro?.kill();
          reelRef.current = null;
          gsap.killTweensOf(reel);
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
      data-testid="showcase-canvas"
    />
  );
}
