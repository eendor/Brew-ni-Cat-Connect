"use client";

import { useEffect, useRef } from "react";

import {
  afterRest,
  CAT_SHEETS,
  CAT_SPEED,
  type CatAction,
  catCount,
  catSheetUrl,
  nextRest,
  nextTarget,
  PIXEL_CATS,
} from "@/lib/cats/cats";

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type Cat = {
  node: HTMLElement;
  id: string;
  canItch: boolean;
  x: number;
  dir: 1 | -1;
  action: CatAction;
  target: number;
  until: number;
};

function show(cat: Cat, action: CatAction) {
  const sheet = CAT_SHEETS[action];
  const { node } = cat;
  cat.action = action;
  node.dataset.action = action;
  node.style.backgroundImage = `url(${catSheetUrl(cat.id, action)})`;
  node.style.setProperty("--frames", String(sheet.frames));
  node.style.setProperty("--ms", `${sheet.ms}ms`);
  node.style.setProperty("--repeat", sheet.once ? "1" : "infinite");
  // start the new sheet from its first frame
  node.style.animationName = "none";
  void node.offsetWidth;
  node.style.animationName = "";
}

function place(cat: Cat) {
  cat.node.style.transform = `translateX(${Math.round(cat.x)}px) scaleX(${cat.dir})`;
}

/**
 * Pixel cats that wander along their own strip at the top of the footer
 * (FR-099): they walk or run somewhere, then sit, wash, meow, stretch or lie
 * down for a nap, and walk on. The strip is decorative (aria-hidden) and
 * ignores taps. Nothing moves while the tab is hidden or the strip is off
 * screen, and with reduced motion the cats sit still in a row.
 */
export function CatStrip() {
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const nodes = [...element.querySelectorAll<HTMLElement>(".pixel-cat")];
    const width = () => element.clientWidth || window.innerWidth;
    const size = () => nodes[0]?.offsetWidth || 150;
    const count = catCount(width());
    const cats: Cat[] = nodes.map((node, index) => ({
      node,
      id: PIXEL_CATS[index]!.id,
      canItch: PIXEL_CATS[index]!.canItch,
      x: 0,
      dir: 1,
      action: "sitting",
      target: 0,
      until: 0,
    }));
    cats.forEach((cat, index) => {
      cat.node.hidden = index >= count;
      cat.node.style.left = "0";
      cat.node.style.marginLeft = "0";
    });
    const shown = cats.slice(0, count);
    const spread = (index: number) =>
      ((index + 0.5) / count) * width() - size() / 2;

    if (prefersReducedMotion()) {
      shown.forEach((cat, index) => {
        cat.x = spread(index);
        cat.dir = index % 2 ? -1 : 1;
        show(cat, "sitting");
        place(cat);
      });
      return;
    }

    const rest = (cat: Cat, now: number) => {
      const next = nextRest(Math.random(), Math.random(), cat.canItch);
      show(cat, next.action);
      cat.until = now + next.ms;
    };
    const walk = (cat: Cat) => {
      cat.target = nextTarget(Math.random(), cat.x, width(), size());
      cat.dir = cat.target >= cat.x ? 1 : -1;
      show(cat, Math.random() < 0.15 ? "run" : "walk");
    };

    let last = performance.now();
    shown.forEach((cat, index) => {
      cat.x = spread(index) + (Math.random() - 0.5) * size();
      cat.dir = Math.random() < 0.5 ? 1 : -1;
      // start part-way through a rest so the cats never move in step
      rest(cat, last - Math.random() * 3_000);
      place(cat);
    });

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      for (const cat of shown) {
        if (cat.action === "walk" || cat.action === "run") {
          const move = CAT_SPEED[cat.action] * size() * dt;
          const left = cat.target - cat.x;
          if (Math.abs(left) <= move) {
            cat.x = cat.target;
            rest(cat, now);
          } else {
            cat.x += Math.sign(left) * move;
          }
          place(cat);
        } else if (now >= cat.until) {
          const next = afterRest(cat.action, Math.random());
          if (next) {
            show(cat, next.action);
            cat.until = now + next.ms;
          } else walk(cat);
        }
      }
    };

    let frame = 0;
    let running = false;
    const loop = (now: number) => {
      step(now);
      frame = requestAnimationFrame(loop);
    };
    const run = (on: boolean) => {
      if (on === running) return;
      running = on;
      element.classList.toggle("is-paused", !on);
      if (on) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      } else cancelAnimationFrame(frame);
    };
    run(true);
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) =>
            run(Boolean(entry?.isIntersecting)),
          )
        : null;
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      run(false);
    };
  }, []);

  return (
    <div
      ref={strip}
      className="cat-strip"
      data-testid="cat-strip"
      aria-hidden="true"
    >
      {PIXEL_CATS.map((cat, index) => (
        <div
          key={cat.id}
          className="pixel-cat"
          data-cat={cat.id}
          data-action="sitting"
          style={{
            left: `${((index + 0.5) / PIXEL_CATS.length) * 100}%`,
            backgroundImage: `url(${catSheetUrl(cat.id, "sitting")})`,
            zIndex: (index * 3) % PIXEL_CATS.length,
            bottom: `calc(var(--cat-size) * -0.36 + ${(index % 3) * 2}px)`,
          }}
        />
      ))}
    </div>
  );
}
