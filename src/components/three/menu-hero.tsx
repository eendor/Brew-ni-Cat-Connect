"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { useThreeEnabled } from "./use-three-enabled";

const MenuHeroCanvas = dynamic(() => import("./canvas/menu-hero-canvas"), {
  ssr: false,
});

const SECTION_ID = "menu-hero";

/**
 * Menu page hero. The server render is a plain header with the real H1,
 * breadcrumb and lede. With WebGL and normal motion it becomes a pinned,
 * full-viewport 3D intro that hands over to the menu grid as you scroll.
 */
export function MenuHero() {
  const enabled = useThreeEnabled();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const three = enabled && !failed;

  const onProgress = useCallback((progress: number) => {
    sectionRef.current?.style.setProperty("--hero-p", progress.toFixed(4));
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  return (
    <section
      id={SECTION_ID}
      ref={sectionRef}
      className={`menu-hero${three ? " menu-hero--3d" : ""}${ready ? " menu-hero--ready" : ""}`}
      aria-labelledby="page-heading"
    >
      <div className="menu-hero__sticky">
        {three ? (
          <div className="menu-hero__stage" aria-hidden="true">
            <MenuHeroCanvas
              sectionId={SECTION_ID}
              onProgress={onProgress}
              onReady={onReady}
              onError={onError}
            />
          </div>
        ) : null}
        <div className="menu-hero__hud">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center rounded-sm font-bold underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--text-strong)]"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Menu</li>
            </ol>
          </nav>
          <p className="eyebrow mt-4" data-rise="">
            Current catalog
          </p>
          <h1 id="page-heading" className="menu-hero__title" data-split="">
            The Menu
          </h1>
          <p className="menu-hero__lede" data-rise="">
            Browse Brew ni Cat’s current categories, choices, sizes, flavors,
            and prices. Availability may change at the shop.
          </p>
        </div>
      </div>
    </section>
  );
}
