"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import {
  AD_HEIGHT,
  AD_WIDTH,
  adDocument,
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
          <iframe
            title="Advertisement"
            width={AD_WIDTH}
            height={AD_HEIGHT}
            srcDoc={adDocument(key)}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="max-w-full border-0"
          />
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
