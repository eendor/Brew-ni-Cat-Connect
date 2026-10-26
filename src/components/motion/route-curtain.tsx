"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { setCurtainCovering } from "./curtain-state";
import { motionAllowed } from "./gsap";

/** The title card shown while each page loads. */
const TITLES: Readonly<Record<string, string>> = {
  "/": "Brew ni Cat",
  "/menu": "The Menu",
  "/about": "Our Story",
  "/gallery": "Gallery",
  "/contact": "Find Us",
  "/cart": "Your Order",
  "/checkout": "Checkout",
};

/**
 * The curtain runs on the browser's own animations and moves only
 * `transform`, so the compositor plays it even while the new page renders
 * and hydrates behind it. Easings match the site's gsap curves.
 */
const EASE_WIPE = "cubic-bezier(0.83, 0, 0.17, 1)";
const EASE_ENTER = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_EXIT = "cubic-bezier(0.32, 0, 0.67, 0)";

function play(
  element: HTMLElement,
  from: string,
  to: string,
  duration: number,
  easing: string,
  property: "transform" = "transform",
) {
  return element.animate([{ [property]: from }, { [property]: to }], {
    duration,
    easing,
    fill: "forwards",
  });
}

/** Longest the curtain waits for a page before opening anyway. */
const MAX_WAIT_MS = 6000;

function internalTarget(event: MouseEvent): URL | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (
    (anchor.target && anchor.target !== "_self") ||
    anchor.hasAttribute("download") ||
    anchor.dataset.curtain === "off"
  ) {
    return null;
  }
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // same page (including in-page anchors): no transition
  if (url.pathname === window.location.pathname) return null;
  return url;
}

/**
 * Cinematic page transitions. A click on an internal link draws a dark
 * title card up over the page, with the destination's name rising in the
 * display face; the route changes behind it, and the card wipes away as
 * soon as the new page has rendered, which is when that page's entrances
 * start. Back and forward, modified clicks and reduced motion keep plain
 * navigation.
 */
export function RouteCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLParagraphElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  /** The path the covered navigation started from, while covering. */
  const fromRef = useRef<string | null>(null);
  const openRef = useRef<() => void>(() => {});

  useEffect(() => {
    const curtain = curtainRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    if (!curtain || !title || !line) return;
    let running: Animation[] = [];
    let timer: number | undefined;
    // bumped on every start, so a stale step from an earlier run stands down
    let run = 0;

    const stopAll = () => {
      running.forEach((animation) => animation.cancel());
      running = [];
    };

    const open = () => {
      fromRef.current = null;
      window.clearTimeout(timer);
      setCurtainCovering(false);
      stopAll();
      const mine = ++run;
      const lift = play(
        title,
        "translateY(0%)",
        "translateY(-115%)",
        350,
        EASE_EXIT,
      );
      lift.pause();
      const wipe = play(
        curtain,
        "translateY(0%)",
        "translateY(-100%)",
        650,
        EASE_WIPE,
      );
      wipe.pause();
      running = [lift, wipe];
      window.setTimeout(() => {
        if (mine !== run) return;
        lift.play();
        window.setTimeout(() => {
          if (mine !== run) return;
          wipe.play();
          wipe.finished
            .then(() => {
              if (mine === run) curtain.style.visibility = "hidden";
            })
            .catch(() => {});
        }, 150);
      }, 50);
    };
    openRef.current = open;

    const onClick = (event: MouseEvent) => {
      if (!motionAllowed()) return;
      const url = internalTarget(event);
      if (!url) return;
      // the curtain takes over this navigation: Next's Link sees the
      // prevented event and stands down, while its own onClick still runs
      event.preventDefault();
      if (fromRef.current) return;
      fromRef.current = window.location.pathname;
      title.textContent = TITLES[url.pathname] ?? "Brew ni Cat";
      setCurtainCovering(true);
      stopAll();
      const mine = ++run;
      curtain.style.visibility = "visible";
      const cover = play(
        curtain,
        "translateY(100%)",
        "translateY(0%)",
        500,
        EASE_WIPE,
      );
      const rise = play(
        title,
        "translateY(115%)",
        "translateY(0%)",
        700,
        EASE_ENTER,
      );
      const draw = play(line, "scaleX(0)", "scaleX(1)", 900, EASE_ENTER);
      rise.pause();
      draw.pause();
      running = [cover, rise, draw];
      cover.finished
        .then(() => {
          if (mine !== run) return;
          // the title starts rising as the page change begins
          rise.play();
          draw.play();
          router.push(`${url.pathname}${url.search}${url.hash}`);
        })
        .catch(() => {});
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (fromRef.current) open();
      }, MAX_WAIT_MS);
    };

    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.clearTimeout(timer);
      stopAll();
      setCurtainCovering(false);
    };
  }, [router]);

  // the new route has rendered behind the curtain: open it
  useEffect(() => {
    if (fromRef.current && pathname !== fromRef.current) openRef.current();
  }, [pathname]);

  return (
    <div ref={curtainRef} className="route-curtain" aria-hidden="true">
      <div className="route-curtain__card">
        <Image
          src="/images/branding/brew-ni-cat-logo.png"
          width={72}
          height={72}
          alt=""
          className="route-curtain__logo"
        />
        <div className="route-curtain__mask">
          <p ref={titleRef} className="route-curtain__title" />
        </div>
        <span ref={lineRef} className="route-curtain__line" />
        <p className="route-curtain__place">Abellera St · Kabacan</p>
      </div>
    </div>
  );
}
