"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { setCurtainCovering } from "./curtain-state";
import { EASE, gsap, motionAllowed } from "./gsap";

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
    let animation: gsap.core.Timeline | null = null;
    let timer: number | undefined;

    const open = () => {
      fromRef.current = null;
      window.clearTimeout(timer);
      setCurtainCovering(false);
      animation?.kill();
      animation = gsap
        .timeline({ delay: 0.05 })
        .to(title, { yPercent: -115, duration: 0.35, ease: EASE.exit })
        .to(
          curtain,
          {
            clipPath: "inset(0% 0% 100% 0%)",
            duration: 0.65,
            ease: EASE.wipe,
          },
          "-=0.2",
        )
        .set(curtain, { visibility: "hidden" });
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
      animation?.kill();
      animation = gsap
        .timeline()
        .set(curtain, {
          visibility: "visible",
          clipPath: "inset(100% 0% 0% 0%)",
        })
        .set(title, { yPercent: 115 })
        .set(line, { scaleX: 0 })
        .to(curtain, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.5,
          ease: EASE.wipe,
        })
        .add(() => {
          router.push(`${url.pathname}${url.search}${url.hash}`);
        })
        .to(title, { yPercent: 0, duration: 0.7, ease: EASE.enter }, "-=0.3")
        .to(line, { scaleX: 1, duration: 0.9, ease: EASE.enter }, "<");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (fromRef.current) open();
      }, MAX_WAIT_MS);
    };

    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.clearTimeout(timer);
      animation?.kill();
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
