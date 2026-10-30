"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EASE, gsap } from "@/components/motion/gsap";
import { usePresence } from "@/components/motion/use-presence";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ExternalLink } from "@/components/ui/external-link";
import {
  ClockIcon,
  FacebookIcon,
  MapPinIcon,
  TikTokIcon,
} from "@/components/ui/icons";
import { siteConfig, type NavigationItem } from "@/config/site";
import { useAuth } from "@/context/auth-context";
import { useShopFacts } from "@/context/shop-facts-context";
import { hoursSummary, shortAddress } from "@/lib/site-content/format";

import { NavLink } from "./nav-link";

// 1rem icons; mt-0.5 centers one on the first 1.25rem line of small text.
const noteIconClass = "mt-0.5 size-4 shrink-0 text-[var(--accent-strong)]";

// 48px round icon links, named by their aria-label.
const socialLinkClass =
  "inline-flex size-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-strong)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--accent-solid)]";

type MobileNavigationProps = Readonly<{
  items: readonly NavigationItem[];
}>;

export function MobileNavigation({ items }: MobileNavigationProps) {
  const { user, signOut } = useAuth();
  const { address, hours, social } = useShopFacts();
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
          {user ? (
            <li className="mt-1 border-t border-[var(--border-soft)] pt-2">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-wider truncate">
                  Account
                  {user.email ? (
                    <span className="normal-case"> ({user.email})</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    closeNavigation();
                    await signOut();
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                >
                  Sign out
                </button>
              </div>
            </li>
          ) : (
            <li className="mt-1 border-t border-[var(--border-soft)] pt-2">
              <NavLink
                href="/account/sign-in"
                className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--accent-soft)] aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-[var(--accent-solid)]"
                onClick={closeNavigation}
              >
                Sign in
              </NavLink>
            </li>
          )}
          <li className="mt-1 border-t border-[var(--border-soft)] pt-2">
            <ThemeToggle
              variant="switch"
              className="rounded-xl px-4 py-3 text-base font-bold text-[var(--text-strong)]"
            />
          </li>
        </ul>
        <div
          className="mx-auto mt-4 flex w-full max-w-[var(--shell-width)] flex-col gap-1 border-t border-[var(--border-soft)] px-4 pt-4 text-sm text-[var(--text-muted)]"
          data-nav-note=""
        >
          <span className="flex items-start gap-2 font-bold text-[var(--text-strong)]">
            <MapPinIcon className={noteIconClass} />
            {shortAddress(address)}
          </span>
          <span className="flex items-start gap-2">
            <ClockIcon className={noteIconClass} />
            {hoursSummary(hours)}
          </span>
          <div className="mt-3 flex gap-3">
            {social.facebook ? (
              <ExternalLink
                href={social.facebook}
                aria-label={`${siteConfig.shortName} on Facebook`}
                className={socialLinkClass}
              >
                <FacebookIcon className="size-5" />
              </ExternalLink>
            ) : null}
            {social.tiktok ? (
              <ExternalLink
                href={social.tiktok}
                aria-label={`${siteConfig.shortName} on TikTok`}
                className={socialLinkClass}
              >
                <TikTokIcon className="size-5" />
              </ExternalLink>
            ) : null}
          </div>
        </div>
      </nav>
    </div>
  );
}
