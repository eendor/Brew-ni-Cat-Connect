"use client";

import { useEffect } from "react";

/**
 * Drives the scroll-linked parts of the site's motion with two CSS hooks on
 * <html>, so every effect stays declarative in globals.css:
 *   - `data-scrolled` once the page leaves the top (frosted header tightens)
 *   - `--hero-progress` 0→1 across the first viewport (hero scale/parallax)
 * Renders nothing, so SSR markup is unchanged. Updates are rAF-throttled and
 * skipped entirely under prefers-reduced-motion.
 */
export function ScrollMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let frame = 0;
    let lastProgress = "";

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      root.toggleAttribute("data-scrolled", y > 12);
      if (reduceQuery?.matches) {
        root.style.removeProperty("--hero-progress");
        lastProgress = "";
        return;
      }
      // Past the first viewport the value stays at 1, so skip redundant
      // writes that would otherwise restyle the document on every frame.
      const progress = Math.min(1, Math.max(0, y / window.innerHeight)).toFixed(
        3,
      );
      if (progress !== lastProgress) {
        lastProgress = progress;
        root.style.setProperty("--hero-progress", progress);
      }
    };

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
