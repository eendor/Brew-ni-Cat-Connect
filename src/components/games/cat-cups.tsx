"use client";

import { animate } from "animejs";
import { useRef, useState } from "react";

import {
  type CatCupsOutcome,
  type PlayResult,
  playErrorMessage,
  pointsLabel,
} from "@/lib/games/games";

import { CatSprite } from "./cat-sprite";

type CatCupsProps = Readonly<{
  disabled: boolean;
  reducedMotion: boolean;
  onPlay: (choice: number) => Promise<PlayResult>;
}>;

const CUPS = [0, 1, 2] as const;

function Cup() {
  return (
    <svg
      viewBox="0 0 80 72"
      width="80"
      height="72"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14 66 L22 10 Q23 6 27 6 L53 6 Q57 6 58 10 L66 66 Z"
        fill="var(--accent-fill)"
        stroke="var(--text-strong)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="8"
        y="62"
        width="64"
        height="8"
        rx="3"
        fill="var(--text-strong)"
      />
      <path
        d="M26 30 H54"
        stroke="var(--surface-overlay)"
        strokeWidth="4"
        opacity="0.6"
      />
    </svg>
  );
}

/**
 * Cat cups (FR-089): Oreo hides under one of three cups and the customer
 * picks one. The server has already hidden him; the cups lift to show
 * where he was.
 */
export function CatCups({ disabled, reducedMotion, onPlay }: CatCupsProps) {
  const cupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<CatCupsOutcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lift = (index: number, up: boolean) => {
    const el = cupRefs.current[index];
    if (!el) return Promise.resolve();
    if (reducedMotion) {
      el.style.transform = up ? "translateY(-64px)" : "";
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      animate(el, {
        translateY: up ? -64 : 0,
        rotate: up ? (index - 1) * 6 : 0,
        duration: up ? 520 : 360,
        ease: up ? "outBack" : "inOutQuad",
        onComplete: () => resolve(),
      });
    });
  };

  const pick = async (choice: number) => {
    if (busy || disabled || outcome) return;
    setBusy(true);
    setPicked(choice);
    setMessage(null);
    const result = await onPlay(choice);
    if (!result.ok) {
      setPicked(null);
      setMessage(playErrorMessage(result.error));
      setBusy(false);
      return;
    }
    const drawn = result.outcome as CatCupsOutcome;
    setOutcome(drawn);
    await lift(choice, true);
    if (drawn.hiddenUnder !== choice) await lift(drawn.hiddenUnder, true);
    setMessage(
      drawn.won
        ? `You found Oreo! +${pointsLabel(result.points)}`
        : `Oreo was under cup ${drawn.hiddenUnder + 1}. +${pointsLabel(result.points)} for playing`,
    );
    setBusy(false);
  };

  const reset = async () => {
    setBusy(true);
    await Promise.all(CUPS.map((i) => lift(i, false)));
    setOutcome(null);
    setPicked(null);
    setMessage(null);
    setBusy(false);
  };

  return (
    <div data-testid="cat-cups" className="flex flex-col items-center gap-4">
      <div className="flex items-end justify-center gap-2 pt-14 sm:gap-6 sm:pt-16">
        {CUPS.map((i) => (
          <div
            key={i}
            className="relative flex h-[88px] w-20 items-end justify-center sm:w-[88px]"
          >
            {outcome?.hiddenUnder === i ? (
              <span className="absolute bottom-0" data-testid="oreo-found">
                <CatSprite
                  cat="oreo"
                  mode={outcome.won ? "meow" : "look"}
                  scale={1.75}
                />
              </span>
            ) : null}
            <div
              ref={(el) => {
                cupRefs.current[i] = el;
              }}
              className="relative z-10"
            >
              <button
                type="button"
                aria-label={`Cup ${i + 1}`}
                aria-pressed={picked === i}
                disabled={disabled || busy || outcome !== null}
                onClick={() => void pick(i)}
                className="flex min-h-11 items-end rounded-[var(--shape-md)] p-1 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:hover:translate-y-0"
              >
                <Cup />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-6 text-center text-sm font-medium text-[var(--text-strong)]"
      >
        {message ?? (outcome ? "" : "Which cup is Oreo under?")}
      </p>
      {outcome && !busy ? (
        <button
          type="button"
          className="button-secondary"
          onClick={() => void reset()}
        >
          Hide him again
        </button>
      ) : null}
    </div>
  );
}
