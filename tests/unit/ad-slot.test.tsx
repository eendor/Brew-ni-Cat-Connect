import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdSlot } from "@/components/ads/ad-slot";
import {
  AD_CONSENT_KEY,
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
    expect(frame).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-popups allow-popups-to-escape-sandbox",
    );
    expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(frame.getAttribute("srcdoc")).toContain(KEY);
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
});
