"use client";

import { useEffect, useRef } from "react";

import { addFrame } from "../engine/loop";
import { releaseRenderer } from "../engine/renderer";
import {
  bindPointer,
  fontsReady,
  getQuality,
  type Quality,
  whenCurtainSettled,
} from "../engine/runtime";

type SceneHandle = Readonly<{
  frame: (dt: number, time: number) => void;
  dispose: () => void;
}>;

type SceneOptions = {
  onReady?: () => void;
  onError?: () => void;
  /**
   * Holds the start back, for example until the canvas nears the viewport
   * (`whenNear`) or the browser is idle (`whenIdle`). Aborted on unmount.
   */
  start?: (canvas: HTMLCanvasElement, signal: AbortSignal) => Promise<void>;
  /**
   * A hero scene at the top of its page: it builds while the route curtain
   * still covers the page (its wrapper holds the curtain closed with
   * `useCurtainHold`), so the page is revealed with the scene already drawn.
   * Other scenes wait until the curtain has fully opened.
   */
  underCurtain?: boolean;
};

/**
 * Boots a scene on a canvas once fonts are ready (and `start` allows),
 * draws its first frame, drives it from the shared ticker and disposes it
 * (and its WebGL context) on unmount. On a page that a route curtain opens
 * onto, a hero scene (`underCurtain`) builds behind the curtain, and any
 * other scene starts only after the curtain has fully opened, so building
 * them never makes the transition stutter. Any failure frees whatever the
 * scene had already set up on the canvas and reports through `onError`, so
 * the page keeps its static version.
 */
export function useScene(
  init: (canvas: HTMLCanvasElement, quality: Quality) => Promise<SceneHandle>,
  options: SceneOptions = {},
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
    const abort = new AbortController();
    bindPointer();
    void (async () => {
      try {
        await optionsRef.current.start?.(canvas, abort.signal);
        if (disposed) return;
        if (!optionsRef.current.underCurtain) {
          await whenCurtainSettled(abort.signal);
          if (disposed) return;
        }
        await fontsReady();
        if (disposed) return;
        handle = await initRef.current(canvas, getQuality());
        if (disposed) {
          handle.dispose();
          return;
        }
        // the first frame is drawn now, even behind the curtain: the scene
        // is on its canvas the moment it is shown, and the first frame's
        // one-off work (shadow maps, texture uploads) is done by then
        handle.frame(0, 0);
        stop = addFrame((dt, time) => handle?.frame(dt, time));
        optionsRef.current.onReady?.();
      } catch (error) {
        releaseRenderer(canvas);
        if (disposed) return;
        console.warn("3D scene unavailable, keeping the static view", error);
        optionsRef.current.onError?.();
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      stop?.();
      handle?.dispose();
      releaseRenderer(canvas);
    };
  }, []);

  return canvasRef;
}
