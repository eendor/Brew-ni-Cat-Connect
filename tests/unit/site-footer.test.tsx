import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/layout/site-footer";
import { siteConfig } from "@/config/site";

describe("Site footer", () => {
  it("TC-P4-030 — keeps the contact and social link names, with decorative icons", () => {
    const { container } = render(<SiteFooter />);

    const facebook = screen.getByRole("link", { name: "Facebook" });
    const tiktok = screen.getByRole("link", { name: "TikTok" });
    expect(facebook).toHaveAttribute("href", siteConfig.social.facebook);
    expect(tiktok).toHaveAttribute("href", siteConfig.social.tiktok);
    for (const link of [facebook, tiktok]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    expect(
      screen.getByRole("link", { name: siteConfig.contact.phone }),
    ).toHaveAttribute("href", siteConfig.contact.phoneHref);
    expect(
      screen.getByRole("link", { name: siteConfig.contact.email }),
    ).toHaveAttribute("href", siteConfig.contact.emailHref);

    // address, phone, email, Facebook, TikTok and hours: hidden from
    // screen readers, so the names above stay the visible text
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(6);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    });
  });
});
