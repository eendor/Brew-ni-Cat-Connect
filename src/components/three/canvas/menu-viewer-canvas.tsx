"use client";

import { useEffect, useRef } from "react";

import { watchVisible } from "../engine/runtime";
import type { ModelSpec } from "../menu-models";
import { initMenuViewer, type MenuViewer } from "../scenes/menu-viewer";
import { useScene } from "./use-scene";

type MenuViewerCanvasProps = Readonly<{
  spec: ModelSpec;
  onReady?: () => void;
  onError?: () => void;
}>;

function warnUnavailable(error: unknown) {
  console.warn("3D model unavailable, keeping the photo", error);
}

/**
 * The Menu's 3D viewer canvas. It boots once with the first model and swaps
 * models in place as `spec` changes; a model that fails to build reports
 * through `onError` so the dialog falls back to the photo.
 */
export default function MenuViewerCanvas({
  spec,
  onReady,
  onError,
}: MenuViewerCanvasProps) {
  const specRef = useRef(spec);
  const viewerRef = useRef<MenuViewer | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    specRef.current = spec;
    onErrorRef.current = onError;
  });

  const canvasRef = useScene(
    async (canvas, quality) => {
      const viewer = await initMenuViewer(canvas, quality, specRef.current);
      viewerRef.current = viewer;
      // a size or flavor picked while the first model was loading
      viewer.show(specRef.current).catch((error: unknown) => {
        warnUnavailable(error);
        onErrorRef.current?.();
      });
      const visible = watchVisible(canvas.parentElement ?? canvas);
      return {
        frame: (dt, time) => {
          if (visible.visible) viewer.frame(dt, time);
        },
        dispose: () => {
          viewerRef.current = null;
          visible.dispose();
          viewer.dispose();
        },
      };
    },
    { onReady, onError },
  );

  useEffect(() => {
    viewerRef.current?.show(spec).catch((error: unknown) => {
      warnUnavailable(error);
      onErrorRef.current?.();
    });
  }, [spec]);

  return (
    <canvas
      ref={canvasRef}
      className="menu-viewer__canvas"
      aria-hidden="true"
      data-testid="menu-viewer-canvas"
    />
  );
}
