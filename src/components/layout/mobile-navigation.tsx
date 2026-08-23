"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { NavigationItem } from "@/config/site";

type MobileNavigationProps = Readonly<{
  items: readonly NavigationItem[];
}>;

export function MobileNavigation({ items }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function closeNavigation() {
    setIsOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm transition-colors hover:bg-[var(--surface-warm)]"
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

      <nav
        id="mobile-navigation"
        className="absolute inset-x-0 top-full border-t border-[var(--border-soft)] bg-[var(--surface-canvas)] px-5 py-5 shadow-[var(--shadow-card)]"
        aria-label="Mobile navigation"
        hidden={!isOpen}
      >
        <ul className="mx-auto grid w-full max-w-[72rem] gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--accent-soft)]"
                onClick={closeNavigation}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-4 w-full max-w-[72rem] border-t border-[var(--border-soft)] px-4 pt-4 text-sm text-[var(--text-muted)]">
          Online ordering is not yet active.
        </p>
      </nav>
    </div>
  );
}
