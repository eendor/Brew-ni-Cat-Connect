"use client";

import { animate, type JSAnimation } from "animejs";
import { useEffect, useRef } from "react";

import { onCurtainCloses } from "@/components/motion/curtain-state";
import {
  paradeLap,
  paradeWalkers,
  restMs,
  STOP_MS,
  walkMs,
} from "@/lib/cats/cats";
import { meow } from "@/lib/sound/cat-sounds";

import type { ParadeStage, ParadeState } from "./parade-stage";

/** WebGL2 without touching jsdom's unimplemented canvas API. */
function canDraw3d() {
  if (typeof window.WebGL2RenderingContext === "undefined") return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

function reducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The cat parade along the top of the footer (FR-099, ADR-032): the shop's
 * cats, built in three.js, walk across in single file like reindeer, with
 * reins and bells, pulling a coffee-cup sleigh with Kasper asleep inside.
 * anime.js walks each lap: in from one side, a stop in the middle where the
 * cats look out and one meows, then off the other side; after a rest they
 * come back the other way. The strip has its own space in the footer, so it
 * never covers the page. With reduced motion the parade stands still in the
 * middle. Without WebGL2 the strip stays hidden. Page transitions get a soft
 * meow (switchable in the footer).
 */
export function CatParade() {
  const strip = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const meowCat = useRef<() => void>(() => {});

  useEffect(
    () =>
      onCurtainCloses(() => {
        if (meow()) meowCat.current();
      }),
    [],
  );

  useEffect(() => {
    const element = strip.current;
    const surface = canvas.current;
    if (!element || !surface || !canDraw3d()) return;
    const still = reducedMotion();
    const walkers = paradeWalkers(window.innerWidth);
    element.dataset.ready = "true";
    element.dataset.cats = walkers.map((cat) => cat.id).join(" ");

    const state: ParadeState = { x: -1e4, dir: 1, stride: 0, look: 0 };
    let stage: ParadeStage | null = null;
    let closed = false;
    let rest = 0;
    const motions: JSAnimation[] = [];
    const run = (motion: JSAnimation) => {
      motions.push(motion);
      return motion;
    };
    /** "true" walking, "stopped" at the stop in the middle, "false" resting or still. */
    const walking = (on: boolean | "stopped") => {
      element.dataset.walking = String(on);
    };

    /** One lap: in, a stop in the middle, out; then a rest and back. */
    const lap = () => {
      if (!stage || closed) return;
      motions.length = 0;
      const width = element.clientWidth;
      const height = element.clientHeight;
      const { start, stop, end } = paradeLap(width, stage.span(), state.dir);
      state.x = start;
      state.stride = 1;
      state.look = 0;
      walking(true);
      run(
        animate(state, {
          x: stop,
          duration: walkMs(stop - start, height),
          ease: "linear",
          onComplete: () => {
            walking("stopped");
            run(animate(state, { stride: 0, duration: 450, ease: "outQuad" }));
            run(
              animate(state, {
                look: 1,
                duration: 600,
                delay: 300,
                ease: "inOutQuad",
                onComplete: () => stage?.meow(0),
              }),
            );
            run(
              animate(state, {
                look: 0,
                stride: 1,
                duration: 500,
                delay: STOP_MS,
                ease: "inOutQuad",
              }),
            );
            run(
              animate(state, {
                x: end,
                duration: walkMs(end - stop, height),
                delay: STOP_MS + 150,
                ease: "linear",
                onBegin: () => walking(true),
                onComplete: () => {
                  walking(false);
                  state.dir = state.dir > 0 ? -1 : 1;
                  rest = window.setTimeout(lap, restMs(Math.random()));
                },
              }),
            );
          },
        }),
      );
    };

    meowCat.current = () => {
      if (stage && state.stride < 1) stage.meow(0);
      else stage?.meow(Math.floor(Math.random() * walkers.length));
    };

    // only draw while the strip is on screen
    const watcher =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) =>
            stage?.setVisible(Boolean(entry?.isIntersecting)),
          )
        : null;

    void import("./parade-stage")
      .then(({ createParadeStage }) => {
        if (closed) return;
        stage = createParadeStage(surface, walkers, state, still);
        watcher?.observe(element);
        if (still) {
          // standing in the middle, looking out
          const { stop } = paradeLap(element.clientWidth, stage.span(), 1);
          state.x = stop;
          state.look = 1;
          walking(false);
          stage.draw();
        } else {
          rest = window.setTimeout(lap, 400);
        }
      })
      .catch((error: unknown) => {
        console.warn("Cat parade unavailable", error);
        delete element.dataset.ready;
      });

    return () => {
      closed = true;
      window.clearTimeout(rest);
      watcher?.disconnect();
      for (const motion of motions) motion.pause();
      stage?.dispose();
    };
  }, []);

  return (
    <div
      ref={strip}
      className="cat-parade"
      data-testid="cat-parade"
      data-walking="false"
      aria-hidden="true"
    >
      <canvas ref={canvas} className="cat-parade__canvas" />
    </div>
  );
}
