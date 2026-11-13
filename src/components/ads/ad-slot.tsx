"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  AD_FILL_TIMEOUT_MS,
  AD_FILLED_MESSAGE,
  AD_HEIGHT,
  AD_SANDBOX,
  AD_WIDTH,
  adFrameSrc,
  adKey,
  isAdFreePath,
  readAdConsent,
  saveAdConsent,
  subscribeAdConsent,
} from "@/lib/ads/ads";

/**
 * One labeled ad for the mini-game area (FR-090). It asks first, and the ad
 * runs in a sandboxed frame so it can't move or cover this page.
 */
export function AdSlot() {
  const pathname = usePathname() ?? "/";
  const key = adKey();
  // "server" while rendering on the server, so nothing ad-related is sent
  const consent = useSyncExternalStore(
    subscribeAdConsent,
    readAdConsent,
    () => "server" as const,
  );

  if (!key || isAdFreePath(pathname) || consent === "server") return null;

  const choose = (value: "yes" | "no") => saveAdConsent(value);

  return (
    <aside
      aria-label="Advertisement"
      data-testid="ad-slot"
      className="mx-auto flex w-full max-w-[332px] flex-col items-center gap-2 rounded-2xl border border-[var(--border-soft)] p-4 text-center"
    >
      <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
        Ad
      </p>
      {consent === "yes" ? (
        <>
          <AdFrame adKey={key} />
          <button
            type="button"
            className="text-xs underline"
            onClick={() => choose("no")}
          >
            Turn off ads
          </button>
        </>
      ) : consent === "no" ? (
        <button
          type="button"
          className="text-xs underline"
          onClick={() => choose("yes")}
        >
          Show ads to support the shop
        </button>
      ) : (
        <>
          <p className="text-sm">
            Show an ad here? Ads help support the shop. They come from the
            Adsterra ad network and appear only in the games.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="button-primary"
              onClick={() => choose("yes")}
            >
              Show ads
            </button>
            <button
              type="button"
              className="button-ghost"
              onClick={() => choose("no")}
            >
              No thanks
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

type FillState = "loading" | "filled" | "empty";

/**
 * The sandboxed ad. The frame posts one message when an ad of real size
 * appears; if none comes in time, a short note replaces the blank box.
 */
function AdFrame({ adKey: key }: Readonly<{ adKey: string }>) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [fill, setFill] = useState<FillState>("loading");

  useEffect(() => {
    if (fill !== "loading") return;
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === frameRef.current?.contentWindow &&
        event.data === AD_FILLED_MESSAGE
      ) {
        setFill("filled");
      }
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => setFill("empty"), AD_FILL_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [fill, attempt]);

  if (fill === "empty") {
    return (
      <div data-testid="ad-empty" className="space-y-2 py-2 text-sm">
        <p className="text-[var(--text-muted)]">
          No ad to show right now. Thanks for keeping ads on.
        </p>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => {
            setAttempt((n) => n + 1);
            setFill("loading");
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative max-w-full"
      style={{ width: AD_WIDTH, height: AD_HEIGHT }}
    >
      {fill === "loading" ? (
        <p
          data-testid="ad-loading"
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--surface-overlay)] text-xs text-[var(--text-muted)]"
        >
          Loading ad…
        </p>
      ) : null}
      <iframe
        key={attempt}
        ref={frameRef}
        title="Advertisement"
        width={AD_WIDTH}
        height={AD_HEIGHT}
        src={adFrameSrc(key)}
        sandbox={AD_SANDBOX}
        referrerPolicy="no-referrer"
        className="relative max-w-full border-0"
      />
    </div>
  );
}
