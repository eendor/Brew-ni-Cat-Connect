import gsap from "gsap";

import { curtainCovering } from "@/components/motion/curtain-state";

type FrameCallback = (dt: number, time: number) => void;

const callbacks = new Set<FrameCallback>();
let time = 0;
let started = false;

function tick(_t: number, deltaMs: number) {
  // scenes rest while the tab is hidden, and while the route curtain closes
  // over the page and covers it; they move again as it opens, so the new
  // page's 3D comes in with the rest of the page
  if (document.hidden || curtainCovering()) return;
  const dt = Math.min(0.1, deltaMs / 1000);
  time += dt;
  for (const callback of callbacks) {
    try {
      callback(dt, time);
    } catch (error) {
      callbacks.delete(callback);
      console.warn("3D frame stopped", error);
    }
  }
}

/** One shared GSAP ticker drives every scene, so scroll and 3D stay in step. */
export function addFrame(callback: FrameCallback) {
  if (!started) {
    started = true;
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
  };
}
