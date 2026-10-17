"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { watchVisible } from "../engine/runtime";
import { initShowcase } from "../scenes/showcase";
import type { ShowcaseItem } from "../showcase-data";
import { useScene } from "./use-scene";

gsap.registerPlugin(ScrollTrigger);

type ShowcaseCanvasProps = Readonly<{
  items: readonly ShowcaseItem[];
  sectionId: string;
  onProduct: (index: number) => void;
  onGlow: (hex: string) => void;
  onReady: () => void;
  onError: () => void;
}>;

export default function ShowcaseCanvas({
  items,
  sectionId,
  onProduct,
  onGlow,
  onReady,
  onError,
}: ShowcaseCanvasProps) {
  const canvasRef = useScene(
    async (canvas, quality) => {
      const section = document.getElementById(sectionId);
      if (!section) throw new Error("showcase section missing");
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
      });
      const scene = await initShowcase(canvas, items, quality, {
        onProduct,
        onGlow,
        progress: () => trigger.progress,
      });
      gsap.to(scene.state, {
        intro: 1,
        duration: 2.2,
        ease: "expo.out",
        delay: 0.15,
      });
      const visible = watchVisible(canvas.parentElement ?? canvas);
      return {
        frame: (dt) => {
          if (visible.visible) scene.frame(dt);
        },
        dispose: () => {
          trigger.kill();
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
      className="absolute inset-0 block size-full"
      aria-hidden="true"
      data-testid="showcase-canvas"
    />
  );
}
