"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { watchVisible } from "../engine/runtime";
import { initMenuHero } from "../scenes/menu-hero";
import { useScene } from "./use-scene";

gsap.registerPlugin(ScrollTrigger);

type MenuHeroCanvasProps = Readonly<{
  sectionId: string;
  onProgress: (progress: number) => void;
  onReady: () => void;
  onError: () => void;
}>;

export default function MenuHeroCanvas({
  sectionId,
  onProgress,
  onReady,
  onError,
}: MenuHeroCanvasProps) {
  const canvasRef = useScene(
    async (canvas, quality) => {
      const section = document.getElementById(sectionId);
      if (!section) throw new Error("menu hero section missing");
      // the trigger is created once the scene exists, so a failed start
      // leaves nothing behind
      let trigger: ScrollTrigger | null = null;
      const scene = await initMenuHero(canvas, quality, {
        progress: () => trigger?.progress ?? 0,
      });
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => onProgress(self.progress),
      });
      const intro = gsap.to(scene.state, {
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
          intro.kill();
          trigger?.kill();
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
      data-testid="menu-hero-canvas"
    />
  );
}
