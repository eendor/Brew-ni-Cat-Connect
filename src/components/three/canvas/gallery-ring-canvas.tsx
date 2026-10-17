"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import { useImperativeHandle, useRef, type Ref } from "react";

import { watchVisible } from "../engine/runtime";
import { initGalleryRing, type RingPhoto } from "../scenes/gallery-ring";
import { useScene } from "./use-scene";

gsap.registerPlugin(ScrollTrigger);

export type GalleryRingControls = {
  go: (direction: number) => void;
  goTo: (index: number) => void;
};

type GalleryRingCanvasProps = Readonly<{
  photos: readonly RingPhoto[];
  onFocus: (index: number) => void;
  onReady: () => void;
  onError: () => void;
  controlsRef: Ref<GalleryRingControls>;
}>;

export default function GalleryRingCanvas({
  photos,
  onFocus,
  onReady,
  onError,
  controlsRef,
}: GalleryRingCanvasProps) {
  const apiRef = useRef<GalleryRingControls | null>(null);
  useImperativeHandle(
    controlsRef,
    () => ({
      go: (direction) => apiRef.current?.go(direction),
      goTo: (index) => apiRef.current?.goTo(index),
    }),
    [],
  );
  const canvasRef = useScene(
    async (canvas, quality) => {
      const ring = await initGalleryRing(canvas, photos, quality, onFocus);
      apiRef.current = ring;
      const trigger = ScrollTrigger.create({
        trigger: canvas,
        start: "top bottom",
        end: "bottom top",
      });
      const visible = watchVisible(canvas);
      return {
        frame: (dt) => {
          if (visible.visible) ring.frame(dt, trigger.progress);
        },
        dispose: () => {
          apiRef.current = null;
          trigger.kill();
          visible.dispose();
          ring.dispose();
        },
      };
    },
    { onReady, onError },
  );
  return (
    <canvas
      ref={canvasRef}
      className="block size-full cursor-grab touch-pan-y data-[grabbing]:cursor-grabbing"
      aria-hidden="true"
      data-testid="gallery-ring-canvas"
    />
  );
}
