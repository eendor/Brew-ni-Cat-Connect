"use client";

import { animate } from "animejs";
import { useRef, useState } from "react";

import {
  type LuckyPawOutcome,
  type PlayResult,
  playErrorMessage,
  pointsLabel,
} from "@/lib/games/games";
import { TREAT_JAR } from "@/lib/games/sprites";

import { CatSprite } from "./cat-sprite";
import { SheetSprite } from "./game-icon";

type LuckyPawProps = Readonly<{
  disabled: boolean;
  reducedMotion: boolean;
  onPlay: () => Promise<PlayResult>;
}>;

function Jar() {
  return (
    <SheetSprite
      sheet={TREAT_JAR.sheet}
      width={TREAT_JAR.width}
      height={TREAT_JAR.height}
      className="block"
    />
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
      setMessage(
        result.points > 0
          ? `Latte pawed out ${pointsLabel(result.points)}!`
          : "Latte pawed out a treat! You've earned today's coins, so this one's for fun.",
      );
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
