"use client";

import { useEffect, useRef } from "react";

import { addFrame } from "../engine/loop";
import {
  bindPointer,
  fontsReady,
  getQuality,
  type Quality,
} from "../engine/runtime";

type SceneHandle = Readonly<{
  frame: (dt: number, time: number) => void;
  dispose: () => void;
}>;

/**
 * Boots a scene on a canvas once fonts are ready, drives it from the shared
 * ticker and disposes it (and its WebGL context) on unmount. Any failure
 * reports through `onError` so the page keeps its static version.
 */
export function useScene(
  init: (canvas: HTMLCanvasElement, quality: Quality) => Promise<SceneHandle>,
  options: { onReady?: () => void; onError?: () => void } = {},
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initRef = useRef(init);
  const optionsRef = useRef(options);
  useEffect(() => {
    initRef.current = init;
    optionsRef.current = options;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let handle: SceneHandle | null = null;
    let stop: (() => void) | null = null;
    bindPointer();
    void (async () => {
      try {
        await fontsReady();
        if (disposed) return;
        handle = await initRef.current(canvas, getQuality());
        if (disposed) {
          handle.dispose();
          return;
        }
        stop = addFrame((dt, time) => handle?.frame(dt, time));
        optionsRef.current.onReady?.();
      } catch (error) {
        console.warn("3D scene unavailable, keeping the static view", error);
        optionsRef.current.onError?.();
      }
    })();
    return () => {
      disposed = true;
      stop?.();
      handle?.dispose();
    };
  }, []);

  return canvasRef;
}
