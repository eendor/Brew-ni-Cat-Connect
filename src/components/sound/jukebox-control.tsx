"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  JUKEBOX_EVENT,
  jukeboxState,
  playJukebox,
  SONGS,
  skipJukebox,
  stopJukebox,
  type JukeboxState,
} from "@/lib/sound/jukebox";

const IDLE: JukeboxState = { playing: false, song: 0 };

function subscribe(onChange: () => void) {
  window.addEventListener(JUKEBOX_EVENT, onChange);
  return () => window.removeEventListener(JUKEBOX_EVENT, onChange);
}

const buttonClass =
  "inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-sm text-sm leading-6 font-medium text-[var(--footer-strong)] transition-colors hover:text-[var(--footer-text)]";

function NoteIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="size-4 shrink-0"
    >
      <path
        fill="currentColor"
        d="M6 2.5 13 1v9.2a2.3 2.3 0 1 1-1.4-2.1V4.1L7.4 5v6.7A2.3 2.3 0 1 1 6 9.6Z"
      />
    </svg>
  );
}

/**
 * The footer jukebox (FR-115, ADR-033): soft French café music, never
 * autoplayed. Play starts it from a visitor's press; Next song skips; the
 * name of the song and where it comes from show while it plays. It keeps
 * playing from page to page, because the footer stays.
 */
export function JukeboxControl() {
  const state = useSyncExternalStore(subscribe, jukeboxState, () => IDLE);
  const song = SONGS[state.song]!;

  // stop the music if the footer ever goes away
  useEffect(() => () => stopJukebox(), []);

  return (
    <div className="inline-flex flex-wrap items-center gap-x-3">
      <button
        type="button"
        aria-pressed={state.playing}
        onClick={() => (state.playing ? stopJukebox() : playJukebox())}
        className={buttonClass}
        data-testid="jukebox-play"
      >
        <NoteIcon />
        {state.playing ? "Stop music" : "Play café music"}
      </button>
      {state.playing ? (
        <button
          type="button"
          onClick={skipJukebox}
          className={buttonClass}
          data-testid="jukebox-next"
        >
          Next song
        </button>
      ) : null}
      <span aria-live="polite" className="text-xs" data-testid="jukebox-now">
        {state.playing ? (
          <>
            Now playing: <i lang="fr">{song.title}</i> ({song.credit})
          </>
        ) : null}
      </span>
    </div>
  );
}
