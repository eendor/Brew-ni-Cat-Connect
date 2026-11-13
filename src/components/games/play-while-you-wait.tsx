"use client";

import Link from "next/link";

import { rememberWaitingOrder } from "@/lib/games/waiting-order";

import { CatSprite } from "./cat-sprite";

/**
 * Shown on an open order (FR-089): points the customer to the cat games while
 * the shop prepares their order. No ads appear on the order page itself.
 */
export function PlayWhileYouWait() {
  return (
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
      <Link
        href="/games"
        className="button-primary shrink-0"
        onClick={() =>
          rememberWaitingOrder(
            `${window.location.pathname}${window.location.hash}`,
          )
        }
      >
        Play cat games
      </Link>
    </div>
  );
}
