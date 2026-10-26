"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { showcaseItems } from "./showcase-data";
import { useThreeEnabled } from "./use-three-enabled";

const ShowcaseCanvas = dynamic(() => import("./canvas/showcase-canvas"), {
  ssr: false,
});

const SECTION_ID = "home-showcase";

/**
 * Home hero. Server and first client render are the static version: the
 * real headline, CTAs and the five featured items as photo cards. With
 * WebGL and normal motion, it becomes a 3D showcase that turns through
 * the same five items on its own, or when you swipe or pick one. The page
 * scrolls normally past it.
 */
export function HomeShowcase() {
  const enabled = useThreeEnabled();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [target, setTarget] = useState(0);
  const pausedUntil = useRef(0);
  const onScreen = useRef(true);
  const glowRef = useRef<HTMLElement | null>(null);
  const lastGlow = useRef("");
  const three = enabled && !failed;
  const current = showcaseItems[active] ?? showcaseItems[0];

  const onProduct = useCallback((index: number) => setActive(index), []);
  const lastGlowAt = useRef(0);
  const onGlow = useCallback((hex: string) => {
    if (hex === lastGlow.current) return;
    // the colour changes every frame of a transition; restyling the whole
    // section that often stutters, so it updates a few times a second
    const now = performance.now();
    if (now - lastGlowAt.current < 120) return;
    lastGlow.current = hex;
    lastGlowAt.current = now;
    glowRef.current?.style.setProperty("--glow", hex);
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  function jumpTo(index: number) {
    // a pick holds the reel for a while before it moves on by itself
    pausedUntil.current = performance.now() + 12_000;
    setTarget(index);
  }

  // the reel advances on its own while the hero is on screen; the page
  // scrolls normally past it
  useEffect(() => {
    if (!three || !ready) return;
    const section = document.getElementById(SECTION_ID);
    const observer = new IntersectionObserver((entries) => {
      onScreen.current = entries.some((entry) => entry.isIntersecting);
    });
    if (section) observer.observe(section);
    const timer = window.setInterval(() => {
      if (!onScreen.current || document.hidden) return;
      if (performance.now() < pausedUntil.current) return;
      setTarget((index) => (index + 1) % showcaseItems.length);
    }, 5500);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [three, ready]);

  // the mouse wheel steps through the items while the page is at its top;
  // at the first and last item, or once the page has moved, it scrolls the
  // page as usual
  const targetNow = useRef(0);
  useEffect(() => {
    targetNow.current = target;
  }, [target]);
  useEffect(() => {
    if (!three || !ready) return;
    const section = document.getElementById(SECTION_ID);
    if (!section) return;
    let lockedUntil = 0;
    const onWheel = (event: WheelEvent) => {
      if (window.scrollY > 8) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (Math.abs(event.deltaY) < 4) return;
      const next = targetNow.current + (event.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= showcaseItems.length) return;
      event.preventDefault();
      const now = performance.now();
      // one step per wheel gesture, however long the gesture's tail is
      if (now < lockedUntil) return;
      lockedUntil = now + 900;
      pausedUntil.current = now + 12_000;
      setTarget(next);
    };
    section.addEventListener("wheel", onWheel, { passive: false });
    return () => section.removeEventListener("wheel", onWheel);
  }, [three, ready]);

  // swipe or drag sideways across the stage to change item
  const swipe = useRef<number | null>(null);
  function onPointerDown(event: React.PointerEvent) {
    swipe.current = event.clientX;
  }
  function onPointerUp(event: React.PointerEvent) {
    const from = swipe.current;
    swipe.current = null;
    if (from === null) return;
    const dx = event.clientX - from;
    if (Math.abs(dx) < 48) return;
    const count = showcaseItems.length;
    jumpTo((target + (dx < 0 ? 1 : count - 1)) % count);
  }

  return (
    <section
      id={SECTION_ID}
      ref={glowRef}
      className={`showcase${three ? " showcase--3d" : ""}${ready ? " showcase--ready" : ""}`}
      aria-labelledby="home-heading"
      style={{ "--glow": showcaseItems[0]?.glow } as CSSProperties}
    >
      <div className="showcase__sticky">
        {three ? (
          <div
            className="showcase__stage"
            aria-hidden="true"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <ShowcaseCanvas
              items={showcaseItems}
              target={target}
              onProduct={onProduct}
              onGlow={onGlow}
              onReady={onReady}
              onError={onError}
            />
          </div>
        ) : null}

        <div className="showcase__hud">
          <div className="showcase__intro">
            <p className="eyebrow-light" data-rise="">
              Kabacan, Cotabato · Est. June 2026
            </p>
            <h1 id="home-heading" className="showcase__title" data-split="">
              Coffee, comfort, and a little cat energy.
            </h1>
            <p className="showcase__lede" data-rise="">
              Settle in at Brew ni Cat for drinks, snacks, noodles, combos, and
              cozy community moments in the heart of Kabacan.
            </p>
            <div
              className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
              data-rise=""
            >
              <Link href="/menu" className="button-primary" data-magnetic="">
                Browse current menu
              </Link>
              <Link href="/contact" className="button-ghost">
                Plan your visit
              </Link>
            </div>
          </div>

          {three && current ? (
            <div className="showcase__product">
              <div
                key={current.id}
                className="showcase__product-copy"
                aria-live="polite"
              >
                <p className="showcase__nick">{current.nickname}</p>
                <p className="showcase__price">
                  <span className="sr-only">{current.name}, </span>
                  {current.price}
                </p>
              </div>
              <ol
                className="showcase__ticks"
                aria-label="Jump to a featured item"
              >
                {showcaseItems.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={index === active ? "true" : undefined}
                      onClick={() => jumpTo(index)}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>

      {!three ? (
        <div className="showcase__static">
          <h2 className="sr-only">Featured drinks and bites</h2>
          <ul className="showcase__static-grid" data-rise-group="">
            {showcaseItems.map((item) => (
              <li
                key={item.id}
                className="showcase__static-item"
                style={{ "--c": item.glow } as CSSProperties}
              >
                <Image
                  src={item.photo}
                  alt={item.alt}
                  width={600}
                  height={800}
                  sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 230px"
                />
                <div>
                  <p className="showcase__static-name">{item.name}</p>
                  <p className="showcase__static-nick">{item.nickname}</p>
                  <p className="showcase__static-price">{item.price}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
