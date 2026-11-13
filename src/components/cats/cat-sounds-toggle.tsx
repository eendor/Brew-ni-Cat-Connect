"use client";

import { useSyncExternalStore } from "react";

import {
  CAT_SOUNDS_EVENT,
  catSoundsOn,
  meow,
  setCatSounds,
} from "@/lib/sound/cat-sounds";

function subscribe(onChange: () => void) {
  window.addEventListener(CAT_SOUNDS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CAT_SOUNDS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The footer's "Cat sounds" switch (ADR-032): turns the meow on page
 * transitions on or off for this device. Turning it on plays one meow, so
 * the visitor hears what it does.
 */
export function CatSoundsToggle() {
  const on = useSyncExternalStore(subscribe, catSoundsOn, () => true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        setCatSounds(!on);
        if (!on) meow();
      }}
      className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-sm text-sm leading-6 font-medium text-[var(--footer-strong)] transition-colors hover:text-[var(--footer-text)]"
    >
      Cat sounds: {on ? "on" : "off"}
    </button>
  );
}
