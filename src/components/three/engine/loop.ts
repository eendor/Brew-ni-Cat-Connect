import gsap from "gsap";

type FrameCallback = (dt: number, time: number) => void;

const callbacks = new Set<FrameCallback>();
let time = 0;
let started = false;

function tick(_t: number, deltaMs: number) {
  if (document.hidden) return;
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
