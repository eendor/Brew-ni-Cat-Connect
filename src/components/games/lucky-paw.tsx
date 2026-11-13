"use client";

import { animate } from "animejs";
import { useRef, useState } from "react";

import {
  type LuckyPawOutcome,
  type PlayResult,
  playErrorMessage,
  pointsLabel,
} from "@/lib/games/games";

import { CatSprite } from "./cat-sprite";

type LuckyPawProps = Readonly<{
  disabled: boolean;
  reducedMotion: boolean;
  onPlay: () => Promise<PlayResult>;
}>;

function Jar() {
  return (
    <svg
      viewBox="0 0 96 112"
      width="96"
      height="112"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="22"
        y="4"
        width="52"
        height="14"
        rx="4"
        fill="var(--text-strong)"
      />
      <path
        d="M18 22 H78 Q86 22 86 32 V98 Q86 108 76 108 H20 Q10 108 10 98 V32 Q10 22 18 22 Z"
        fill="var(--fill-secondary)"
        stroke="var(--text-strong)"
        strokeWidth="3"
      />
      {[
        [30, 84],
        [48, 92],
        [64, 82],
        [38, 66],
        [58, 64],
        [46, 76],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="7"
          fill="var(--accent-fill)"
          stroke="var(--text-strong)"
          strokeWidth="2"
        />
      ))}
      <rect
        x="30"
        y="40"
        width="36"
        height="14"
        rx="3"
        fill="var(--surface-overlay)"
        opacity="0.8"
      />
    </svg>
  );
}

/**
 * Lucky paw (FR-089): shake the treat jar and Latte paws out some points.
 * The server draws the treat; the jar only shakes while it does.
 */
export function LuckyPaw({ disabled, reducedMotion, onPlay }: LuckyPawProps) {
  const jarRef = useRef<HTMLDivElement | null>(null);
  const [treat, setTreat] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shake = () => {
    const el = jarRef.current;
    if (!el || reducedMotion) return Promise.resolve();
    return new Promise<void>((resolve) => {
      animate(el, {
        rotate: [0, -14, 12, -10, 8, -4, 0],
        translateY: [0, -6, 0, -4, 0],
        duration: 900,
        ease: "inOutSine",
        onComplete: () => resolve(),
      });
    });
  };

  const play = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setMessage(null);
    setTreat(null);
    const [result] = await Promise.all([onPlay(), shake()]);
    if (!result.ok) {
      setMessage(playErrorMessage(result.error));
    } else {
      const drawn = result.outcome as LuckyPawOutcome;
      setTreat(drawn.treat);
      setMessage(`Latte pawed out ${pointsLabel(drawn.treat)}!`);
    }
    setBusy(false);
  };

  return (
    <div data-testid="lucky-paw" className="flex flex-col items-center gap-4">
      <div className="flex items-end justify-center gap-2">
        <div ref={jarRef} className="origin-bottom">
          <Jar />
        </div>
        <CatSprite
          cat="latte"
          mode={treat === null ? "look" : "meow"}
          scale={2}
        />
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-6 text-center text-sm font-medium text-[var(--text-strong)]"
      >
        {message ?? "Shake the jar to see what Latte finds."}
      </p>
      <button
        type="button"
        className="button-primary"
        disabled={disabled || busy}
        onClick={() => void play()}
      >
        {busy ? "Shaking…" : "Shake the jar"}
      </button>
    </div>
  );
}
