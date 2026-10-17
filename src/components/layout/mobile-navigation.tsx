"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EASE, gsap } from "@/components/motion/gsap";
import { usePresence } from "@/components/motion/use-presence";
import type { NavigationItem } from "@/config/site";

import { NavLink } from "./nav-link";

type MobileNavigationProps = Readonly<{
  items: readonly NavigationItem[];
}>;

export function MobileNavigation({ items }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  // the panel drops in with its links cascading; it lifts away on close
  const { present } = usePresence(isOpen, navRef, {
    enter: (nav) =>
      gsap
        .timeline()
        .fromTo(
          scrimRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.35, ease: "power2.out" },
        )
        .fromTo(
          nav,
          { autoAlpha: 0, yPercent: -8 },
          { autoAlpha: 1, yPercent: 0, duration: 0.55, ease: EASE.enter },
          0,
        )
        .fromTo(
          nav.querySelectorAll("li, [data-nav-note]"),
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: EASE.enter,
            stagger: 0.05,
            clearProps: "opacity,visibility,transform",
          },
          0.08,
        ),
    exit: (nav) =>
      gsap
        .timeline()
        .to(nav, {
          autoAlpha: 0,
          yPercent: -6,
          duration: 0.28,
          ease: EASE.exit,
        })
        .to(scrimRef.current, { autoAlpha: 0, duration: 0.28 }, 0),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleEscape);
    // lock page scroll behind the open menu (scrollbar-gutter keeps width)
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      root.style.overflow = previous;
    };
  }, [isOpen]);

  function closeNavigation() {
    setIsOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm transition-colors hover:bg-[var(--surface-warm)]"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {present
        ? createPortal(
            // portalled: the header's backdrop-filter would otherwise be the
            // containing block of this fixed scrim
            <div
              ref={scrimRef}
              className="mobile-nav-scrim fixed inset-0 z-40 bg-[var(--ink-scrim)] backdrop-blur-sm lg:hidden"
              aria-hidden="true"
              data-testid="mobile-nav-scrim"
              onClick={closeNavigation}
            />,
            document.body,
          )
        : null}

      <nav
        ref={navRef}
        id="mobile-navigation"
        className="absolute inset-x-0 top-full border-t border-[var(--border-soft)] bg-[var(--surface-canvas)] px-5 py-5 shadow-[var(--shadow-card)]"
        aria-label="Mobile navigation"
        hidden={!present}
        inert={present && !isOpen}
      >
        <ul className="mx-auto grid w-full max-w-[var(--shell-width)] gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--accent-soft)] aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-[var(--accent-solid)]"
                onClick={closeNavigation}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div
          className="mx-auto mt-4 flex w-full max-w-[var(--shell-width)] flex-col gap-1 border-t border-[var(--border-soft)] px-4 pt-4 text-sm text-[var(--text-muted)]"
          data-nav-note=""
        >
          <span className="font-bold text-[var(--text-strong)]">
            Segundo St, Poblacion, Kabacan
          </span>
          <span>Open 11 AM to 10 PM. Closed every Sunday.</span>
        </div>
      </nav>
    </div>
  );
}
