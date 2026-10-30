import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/layout/site-footer";
import { fallbackAbout } from "@/lib/site-content/fallback-pages";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import { emailHref, phoneHref } from "@/lib/site-content/format";

const content = { ...fallbackShop, about: fallbackAbout };

describe("Site footer", () => {
  it("TC-P4-030 — keeps the contact and social link names, with decorative icons", () => {
    const { container } = render(<SiteFooter content={content} />);

    const facebook = screen.getByRole("link", { name: "Facebook" });
    const tiktok = screen.getByRole("link", { name: "TikTok" });
    expect(facebook).toHaveAttribute("href", content.social.facebook);
    expect(tiktok).toHaveAttribute("href", content.social.tiktok);
    for (const link of [facebook, tiktok]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    expect(
      screen.getByRole("link", { name: content.contact.phone }),
    ).toHaveAttribute("href", phoneHref(content.contact.phone));
    expect(
      screen.getByRole("link", { name: content.contact.email }),
    ).toHaveAttribute("href", emailHref(content.contact.email));

    // address, phone, email, Facebook, TikTok and hours: hidden from
    // screen readers, so the names above stay the visible text
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(6);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    });
  });

  it("TC-P4-214 — shows the contact details, hours, payments and links the owner saved", () => {
    const { container } = render(
      <SiteFooter
        content={{
          ...content,
          contact: { phone: "+63 900 000 0000", email: "hello@example.com" },
          hours: {
            days: {
              ...content.hours.days,
              saturday: { opens: "09:00", closes: "17:00" },
            },
            note: "",
          },
          payments: { methods: ["Cash", "GCash", "Maya"], qrCode: null },
          social: { ...content.social, tiktok: "" },
          about: { ...content.about, footerText: "See you at the counter." },
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "+63 900 000 0000" }),
    ).toHaveAttribute("href", "tel:+639000000000");
    expect(
      screen.getByRole("link", { name: "hello@example.com" }),
    ).toHaveAttribute("href", "mailto:hello@example.com");
    expect(screen.getByText("See you at the counter.")).toBeInTheDocument();
    expect(
      screen.getByText("Cash, GCash, and Maya accepted"),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("9 AM to 5 PM on Saturday");
    expect(container.textContent).not.toMatch(/Closed every Saturday/);
    // an empty link hides that button
    expect(screen.queryByRole("link", { name: "TikTok" })).toBeNull();
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
  });
});
