"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/auth-context";

export function AccountNav() {
  const { user, signOut, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div
        className="inline-flex min-h-11 w-20 items-center justify-center opacity-0"
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/account/sign-in"
        className="nav-link inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-xs font-bold tracking-[0.1em] text-[var(--text-muted)] uppercase hover:text-[var(--text-strong)]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold tracking-[0.08em] text-[var(--text-strong)] uppercase transition-colors hover:border-[var(--accent-solid)]"
        aria-expanded={isOpen}
        aria-label="Account menu"
      >
        <span>Account</span>
        <svg
          className={`size-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-2 shadow-[var(--shadow-card)] z-50">
          {user.email ? (
            <div className="px-3 py-2 text-xs text-[var(--text-muted)] truncate border-b border-[var(--border-soft)] mb-1">
              {user.email}
            </div>
          ) : null}
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false);
                  await signOut();
                }}
                className="flex w-full items-center rounded-xl px-3 py-2 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors text-left uppercase tracking-[0.08em]"
              >
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
