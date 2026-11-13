"use client";

import { animate, type JSAnimation } from "animejs";
import { useEffect, useRef } from "react";

import { onCurtainCloses } from "@/components/motion/curtain-state";
import {
  festiveSeason,
  paradeLap,
  paradeWalkers,
  restMs,
  walkMs,
} from "@/lib/cats/cats";
import { meow } from "@/lib/sound/cat-sounds";

import type { ParadeStage, ParadeState } from "./parade-stage";

/** How long the cats take to turn their heads to the visitor and back. */
const GLANCE_MS = 700;

/** A 2D canvas (jsdom has none, so the strip stays hidden in unit tests). */
function canDraw() {
  if (typeof window.CanvasRenderingContext2D === "undefined") return false;
  try {
    return Boolean(document.createElement("canvas").getContext("2d"));
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
 * cats, drawn as pixel art in Aseprite, walk across in single file. In November and
 * December they wear bells and pull a cosy coffee-cup sleigh with Luna, a mama
 * cat soon, resting inside with her kittens; from January they just stroll.
 * anime.js walks each lap in one smooth walk from one side to the other;
 * passing the middle the cats glance out and one meows. After a rest they
 * come back the other way. The strip has its own space in the footer, so it
 * never covers the page. With reduced motion the parade stands still in the
 * middle. Without a 2D canvas the strip stays hidden. Page transitions get a soft
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
    if (!element || !surface || !canDraw()) return;
    const still = reducedMotion();
    const walkers = paradeWalkers(window.innerWidth);
    element.dataset.ready = "true";
    element.dataset.cats = walkers.map((cat) => cat.id).join(" ");
    element.dataset.sleigh = String(festiveSeason(new Date()));

    const state: ParadeState = { x: -1e4, dir: 1, stride: 0, look: 0 };
    let stage: ParadeStage | null = null;
    let closed = false;
    let rest = 0;
    const motions: JSAnimation[] = [];
    const run = (motion: JSAnimation) => {
      motions.push(motion);
      return motion;
    };
    /** "true" while walking across, "false" resting or still. */
    const walking = (on: boolean) => {
      element.dataset.walking = String(on);
    };

    /**
     * One lap: in from one side and out the other in one smooth walk, with
     * no halt (2026-11-13). Passing the middle, the cats glance out at the
     * visitor and the lead meows, still walking. Then a rest, and back.
     */
    const lap = () => {
      if (!stage || closed) return;
      motions.length = 0;
      const width = element.clientWidth;
      const height = element.clientHeight;
      const {
        start,
        stop: middle,
        end,
      } = paradeLap(width, stage.span(), state.dir);
      const total = walkMs(end - start, height);
      const toMiddle = walkMs(middle - start, height);
      state.x = start;
      state.stride = 1;
      state.look = 0;
      walking(true);
      delete element.dataset.greeting;
      run(
        animate(state, {
          x: end,
          duration: total,
          ease: "linear",
          onComplete: () => {
            walking(false);
            state.dir = state.dir > 0 ? -1 : 1;
            rest = window.setTimeout(lap, restMs(Math.random()));
          },
        }),
      );
      // one animation for the glance: two on "look" would replace each other
      run(
        animate(state, {
          look: [
            {
              to: 0.8,
              duration: GLANCE_MS,
              delay: Math.max(0, toMiddle - GLANCE_MS),
              ease: "inOutQuad",
            },
            { to: 0, duration: GLANCE_MS, delay: GLANCE_MS, ease: "inOutQuad" },
          ],
        }),
      );
      // the lead meows as the parade passes the middle
      run(
        animate(
          { at: 0 },
          {
            at: 1,
            duration: Math.max(1, toMiddle),
            onComplete: () => {
              element.dataset.greeting = "true";
              stage?.meow(0);
            },
          },
        ),
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
        stage = createParadeStage(
          surface,
          walkers,
          state,
          still,
          festiveSeason(new Date()),
        );
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
