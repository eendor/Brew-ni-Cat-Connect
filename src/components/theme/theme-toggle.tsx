"use client";

import { useEffect, useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import {
  chooseTheme,
  followDeviceTheme,
  readTheme,
  subscribeTheme,
  syncThemeColor,
  type Theme,
} from "@/lib/theme/theme";

/** The page's theme, kept in step with the toggle (day on the server). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "day");
}

/**
 * Mounted once in the layout: sets the browser bar color after hydration and
 * follows the device's dark mode until the visitor picks a theme.
 */
export function ThemeSync() {
  useEffect(() => {
    syncThemeColor();
    return followDeviceTheme();
  }, []);
  return null;
}

type ThemeToggleProps = Readonly<{
  /** `button`: a round glass icon button (the desktop header).
   * `switch`: a "Night mode" row with an iOS switch (the phone menu). */
  variant?: "button" | "switch";
  className?: string;
}>;

/** Switches between the day and night themes (FR-094). */
export function ThemeToggle({
  variant = "button",
  className = "",
}: ThemeToggleProps) {
  const night = useTheme() === "night";
  const toggle = () => chooseTheme(night ? "day" : "night");

  if (variant === "switch") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={night}
        onClick={toggle}
        className={`flex min-h-11 w-full items-center justify-between gap-4 text-left ${className}`}
      >
        <span className="flex items-center gap-3">
          <MoonIcon className="size-5 text-[var(--text-muted)]" />
          <span>Night mode</span>
        </span>
        <span className="ios-switch" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={night ? "Switch to day theme" : "Switch to night theme"}
      title={night ? "Day theme" : "Night theme"}
      className={`ios-icon-button ${className}`}
    >
      {night ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </button>
  );
}
