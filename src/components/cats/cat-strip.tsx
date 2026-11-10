"use client";

import { useEffect, useRef, useState } from "react";

import { CatFigure } from "@/components/cats/cat-figure";
import {
  type ShopCat,
  CAT_WALK_MS,
  SHOP_CATS,
  nextCatIndex,
  nextCatWait,
} from "@/lib/cats/cats";

type Walk = Readonly<{ cat: ShopCat; id: number }>;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The shop's cats (FR-099). They walk across an empty strip at the top of the
 * footer now and then, so they never cover buttons, links or text, and the
 * strip ignores taps. With reduced motion they sit still (NFR-032); while the
 * tab is hidden or the strip is off screen no walk starts; the page works the
 * same without them (NFR-035).
 */
export function CatStrip() {
  const strip = useRef<HTMLDivElement>(null);
  const [walk, setWalk] = useState<Walk | null>(null);

  useEffect(() => {
    // With reduced motion the sitting cats show instead (CSS), and none walk.
    if (prefersReducedMotion()) return;
    let inView = false;
    let last: number | null = null;
    let count = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (wait: number) => {
      clearTimeout(timer);
      timer = setTimeout(start, wait);
    };
    function start() {
      if (document.hidden || !inView) {
        // Try again later instead of walking where no one can see it.
        schedule(nextCatWait(Math.random()));
        return;
      }
      last = nextCatIndex(Math.random(), last);
      count += 1;
      setWalk({ cat: SHOP_CATS[last] ?? SHOP_CATS[0]!, id: count });
      schedule(CAT_WALK_MS + nextCatWait(Math.random()));
    }

    const observer =
      typeof IntersectionObserver === "function" && strip.current
        ? new IntersectionObserver((entries) => {
            inView = entries.some((entry) => entry.isIntersecting);
          })
        : null;
    if (observer && strip.current) observer.observe(strip.current);
    else inView = true;

    const onVisibility = () => {
      if (document.hidden) setWalk(null);
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule(nextCatWait(Math.random()));
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={strip}
      className="cat-strip"
      aria-hidden="true"
      data-testid="cat-strip"
    >
      <div className="cat-strip__sitting">
        {SHOP_CATS.map((cat) => (
          <CatFigure key={cat.name} cat={cat} walking={false} />
        ))}
      </div>
      {walk ? (
        <div
          key={walk.id}
          className="cat-strip__walker"
          style={{ animationDuration: `${CAT_WALK_MS}ms` }}
          onAnimationEnd={() => setWalk(null)}
        >
          <CatFigure cat={walk.cat} walking />
        </div>
      ) : null}
    </div>
  );
}
