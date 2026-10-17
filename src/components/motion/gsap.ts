"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

/**
 * ScrollTrigger and SplitText, registered on first use. Registration needs
 * a real browser (ScrollTrigger reads media queries), so it only happens
 * once motion is actually running.
 */
export function motionPlugins() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    registered = true;
  }
  return { ScrollTrigger, SplitText };
}

/**
 * Whether the site animates. Off under prefers-reduced-motion, in browsers
 * that can't report it (and in jsdom), and on during captures with
 * `?motion`, like the 3D layer.
 */
export function motionAllowed(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return false;
  if (new URLSearchParams(window.location.search).has("motion")) return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fine pointer with hover: the only place pointer-led effects run. */
export function finePointer(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

/** One easing language for the whole site. */
export const EASE = {
  /** entrances: fast start, long settle */
  enter: "expo.out",
  /** exits: gather, then leave */
  exit: "power3.in",
  /** wipes and curtains */
  wipe: "power4.inOut",
} as const;

export { gsap };
