import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdSlot } from "@/components/ads/ad-slot";
import {
  AD_CONSENT_KEY,
  AD_FILL_TIMEOUT_MS,
  AD_FILLED_MESSAGE,
  adDocument,
  adKey,
  isAdFreePath,
  resetAdConsentForTests,
} from "@/lib/ads/ads";

const navigation = vi.hoisted(() => ({ pathname: "/games" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

const KEY = "0123456789abcdef0123456789abcdef";

describe("Ads in the mini-game area (FR-090)", () => {
  beforeEach(() => {
    navigation.pathname = "/games";
    window.localStorage.clear();
    resetAdConsentForTests();
    vi.stubEnv("NEXT_PUBLIC_AD_KEY", KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TC-P9-007 — ads stay off without a valid ad key", () => {
    expect(adKey("")).toBeNull();
    expect(adKey("not-a-key")).toBeNull();
    expect(adKey(` ${KEY.toUpperCase()} `)).toBe(KEY);
    vi.stubEnv("NEXT_PUBLIC_AD_KEY", "");
    const { container } = render(<AdSlot />);
    expect(container).toBeEmptyDOMElement();
  });

  it("TC-P9-008 — asks first and loads nothing before the customer agrees", () => {
    render(<AdSlot />);
    expect(screen.getByText("Ad")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show ads" }),
    ).toBeInTheDocument();
    expect(screen.queryByTitle("Advertisement")).toBeNull();
    expect(document.querySelector("script[src*='bauval']")).toBeNull();
  });

  it("TC-P9-009 — after Show ads, the labeled ad loads in a sandboxed frame and the choice is kept", () => {
    render(<AdSlot />);
    fireEvent.click(screen.getByRole("button", { name: "Show ads" }));
    const frame = screen.getByTitle("Advertisement");
    // Update 2026-11-13: allow-same-origin is on so the ad can draw into its
    // inner frame; the data: URL keeps it on its own origin (TC-P9-052)
    expect(frame).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
    );
    expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    expect(decodeURIComponent(frame.getAttribute("src") ?? "")).toContain(KEY);
    expect(window.localStorage.getItem(AD_CONSENT_KEY)).toBe("yes");

    fireEvent.click(screen.getByRole("button", { name: "Turn off ads" }));
    expect(screen.queryByTitle("Advertisement")).toBeNull();
    expect(window.localStorage.getItem(AD_CONSENT_KEY)).toBe("no");
  });

  it("TC-P9-010 — No thanks shows no ad, and the customer can change their mind", () => {
    render(<AdSlot />);
    fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
    expect(screen.queryByTitle("Advertisement")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Show ads to support the shop" }),
    );
    expect(screen.getByTitle("Advertisement")).toBeInTheDocument();
  });

  it("TC-P9-011 — never shows on the menu, cart, checkout, order or account pages", () => {
    window.localStorage.setItem(AD_CONSENT_KEY, "yes");
    for (const path of [
      "/menu",
      "/cart",
      "/checkout",
      "/orders/abc",
      "/account/rewards",
    ]) {
      expect(isAdFreePath(path)).toBe(true);
      navigation.pathname = path;
      const { container, unmount } = render(<AdSlot />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(isAdFreePath("/menus-and-games")).toBe(false);
  });

  it("TC-P9-012 — the ad page only loads the Adsterra unit with the 300x250 options", () => {
    const html = adDocument(KEY);
    expect(html).toContain(`src="https://bauval.org/22/${KEY}"`);
    expect(html).toContain('"width":300');
    expect(html).toContain('"height":250');
  });

  it("TC-P9-044 — shows Loading ad until the frame reports a real ad, and ignores messages from other windows", () => {
    window.localStorage.setItem(AD_CONSENT_KEY, "yes");
    render(<AdSlot />);
    const frame = screen.getByTitle("Advertisement") as HTMLIFrameElement;
    expect(screen.getByTestId("ad-loading")).toHaveTextContent("Loading ad…");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: AD_FILLED_MESSAGE,
          source: window,
        }),
      );
    });
    expect(screen.getByTestId("ad-loading")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: AD_FILLED_MESSAGE,
          source: frame.contentWindow,
        }),
      );
    });
    expect(screen.queryByTestId("ad-loading")).toBeNull();
    expect(screen.getByTitle("Advertisement")).toBeInTheDocument();
  });

  it("TC-P9-045 — replaces a blank ad with a short note after the wait, and Try again reloads it", () => {
    vi.useFakeTimers();
    try {
      window.localStorage.setItem(AD_CONSENT_KEY, "yes");
      render(<AdSlot />);
      act(() => {
        vi.advanceTimersByTime(AD_FILL_TIMEOUT_MS);
      });
      expect(screen.queryByTitle("Advertisement")).toBeNull();
      expect(screen.getByTestId("ad-empty")).toHaveTextContent(
        "No ad to show right now.",
      );
      expect(
        screen.getByRole("button", { name: "Turn off ads" }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(screen.getByTitle("Advertisement")).toBeInTheDocument();
      expect(screen.getByTestId("ad-loading")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("TC-P9-046 — the ad page reports a filled ad by name only, before the ad script runs", () => {
    const html = adDocument(KEY);
    expect(html).toContain(`parent.postMessage("${AD_FILLED_MESSAGE}","*")`);
    expect(html.indexOf("MutationObserver")).toBeLessThan(
      html.indexOf("bauval.org"),
    );
  });

  it("TC-P9-052 — the ad page is a data: URL and never srcdoc, so allow-same-origin can't give it this site's origin", () => {
    window.localStorage.setItem(AD_CONSENT_KEY, "yes");
    render(<AdSlot />);
    const frame = screen.getByTitle("Advertisement");
    expect(frame.getAttribute("src")).toMatch(
      /^data:text\/html;charset=utf-8,/,
    );
    expect(frame.hasAttribute("srcdoc")).toBe(false);
    expect(frame.getAttribute("src")).toBe(
      `data:text/html;charset=utf-8,${encodeURIComponent(adDocument(KEY))}`,
    );
  });
});
