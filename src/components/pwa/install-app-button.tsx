"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallAppButtonProps = Readonly<{
  className?: string;
}>;

function isInstalledApp() {
  const standalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return (
    standalone ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

/**
 * The footer's Install app button (FR-068). Browsers that cannot install the
 * site, and browsers already showing the installed app, get nothing.
 */
export function InstallAppButton({ className = "" }: InstallAppButtonProps) {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalledApp()) return;

    function handlePrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-sm text-sm leading-6 font-medium text-[var(--footer-strong)] transition-colors hover:text-[var(--footer-text)] ${className}`}
    >
      Install app
    </button>
  );
}
