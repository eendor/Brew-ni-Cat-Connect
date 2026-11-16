"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { rememberWaitingOrder } from "@/lib/games/waiting-order";

import { CatSprite } from "./cat-sprite";
import { GamesView } from "./games-view";

/**
 * Shown on an open order (FR-089): offers an interactive cat-games popup right
 * on the order screen plus a link to `/games`. Consent-gated ads render on the
 * order page directly when enabled.
 */
export function PlayWhileYouWait() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        data-testid="play-while-you-wait"
        className="ios-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center"
      >
        <CatSprite cat="kulas" mode="look" scale={2} />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Play while you wait
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Try Cat cups or Lucky paw with the café cats and earn a few loyalty
            points. You can come back to this order any time.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="button-primary"
            onClick={() => setOpen(true)}
          >
            Play popup
          </button>
          <Link
            href="/games"
            className="button-secondary"
            onClick={() =>
              rememberWaitingOrder(
                `${window.location.pathname}${window.location.hash}`,
              )
            }
          >
            Play cat games
          </Link>
        </div>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="play-games-popup-title"
                data-testid="play-games-popup"
                className="ios-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2
                    id="play-games-popup-title"
                    className="font-display text-2xl font-bold text-[var(--text-strong)]"
                  >
                    Play while you wait
                  </h2>
                  <button
                    type="button"
                    aria-label="Close games popup"
                    className="button-secondary min-h-11 px-4"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <GamesView embedded />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
