import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PrivacyPage from "@/app/privacy/page";
import { PRIVACY_POLICY_UPDATED } from "@/config/privacy";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import { emailHref, phoneHref } from "@/lib/site-content/format";
import { fallbackSiteContent } from "@/lib/site-content/load";
import type { SiteContent } from "@/lib/site-content/types";

// The page reads the saved contact details; this stand-in lets a test change
// them. Without a change the page shows the fallback copy.
const live = vi.hoisted(() => ({ content: null as SiteContent | null }));

vi.mock("@/lib/site-content/load", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/site-content/load")>();
  return {
    ...actual,
    getSiteContent: async () => live.content ?? actual.fallbackSiteContent,
  };
});

afterEach(() => {
  live.content = null;
});

const SECTIONS = [
  ["who-we-are", "Who we are"],
  ["what-we-collect", "What we collect and why"],
  ["on-your-device", "What stays on your device"],
  ["service-providers", "Who helps us run it"],
  ["how-long", "How long we keep it"],
  ["your-rights", "Your rights"],
  ["delete-your-data", "How to delete your data"],
  ["contact-us", "Contact us"],
  ["changes", "Changes to this policy"],
] as const;

describe("Privacy Policy page", () => {
  it("TC-P5-088 — shows the policy, its version date and a linkable section for each topic", async () => {
    const { container } = render(await PrivacyPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    const updated = container.querySelector("time");
    expect(updated).toHaveAttribute("datetime", PRIVACY_POLICY_UPDATED);
    expect(updated).toHaveTextContent("November 9, 2026");

    for (const [id, title] of SECTIONS) {
      const section = container.querySelector(`section#${id}`);
      expect(section, id).not.toBeNull();
      expect(
        within(section as HTMLElement).getByRole("heading", {
          level: 2,
          name: title,
        }),
      ).toBeInTheDocument();
    }

    // Meta's data deletion field points at this anchor
    const deletion = container.querySelector(
      "section#delete-your-data",
    ) as HTMLElement;
    expect(within(deletion).getAllByRole("listitem")).toHaveLength(3);
    expect(deletion).toHaveTextContent(
      /delete your account, profile and favorites/,
    );
    expect(deletion).toHaveTextContent(/no link to your account/);
  });

  it("TC-P5-089 — gives the contact details the owner saved, and hides an empty Facebook link", async () => {
    live.content = {
      ...fallbackSiteContent,
      contact: { phone: "+63 900 000 0000", email: "hello@example.com" },
      social: { ...fallbackShop.social, facebook: "https://facebook.com/x" },
    };
    const first = render(await PrivacyPage());
    const contact = within(
      first.container.querySelector("section#contact-us") as HTMLElement,
    );
    expect(
      contact.getByRole("link", { name: "+63 900 000 0000" }),
    ).toHaveAttribute("href", phoneHref("+63 900 000 0000"));
    expect(
      contact.getByRole("link", { name: "hello@example.com" }),
    ).toHaveAttribute("href", emailHref("hello@example.com"));
    const facebook = contact.getByRole("link", { name: "Facebook Page" });
    expect(facebook).toHaveAttribute("href", "https://facebook.com/x");
    expect(facebook).toHaveAttribute("target", "_blank");
    expect(facebook).toHaveAttribute("rel", "noopener noreferrer");
    first.unmount();

    live.content = {
      ...live.content,
      social: { ...live.content.social, facebook: "" },
    };
    render(await PrivacyPage());
    expect(screen.queryByRole("link", { name: "Facebook Page" })).toBeNull();
  });

  it("TC-P5-090 — states what the site keeps the way the code keeps it", async () => {
    const { container } = render(await PrivacyPage());
    const text = container.textContent ?? "";

    // no tracking, and passwords only in Supabase Auth
    expect(text).toMatch(/no analytics, advertising or tracking cookies/);
    expect(text).toMatch(/scrambled \(hashed\) form/);
    // the order link's token stays out of the server (security §18.3)
    expect(text).toMatch(/Browsers don't send that part to our server/);
    expect(text).toMatch(/never shows your phone number/);
    // the Messenger assistant writes nothing (security §19.3, §19.5)
    expect(text).toMatch(/It saves nothing to our database/);
    expect(text).toMatch(/at most 24 hours/);
    // rider delivery is never sent by the site (security §17.1)
    expect(text).toMatch(/The website doesn't send it anywhere/);
    // RA 10173 rights and the regulator
    expect(text).toMatch(/Republic Act No\. 10173/);
    expect(text).toMatch(/National Privacy Commission/);
    expect(screen.getByRole("link", { name: "profile page" })).toHaveAttribute(
      "href",
      "/account/profile",
    );
    // no claims the shop has not made
    expect(text).not.toMatch(/never share|100%|guarantee|encrypted at rest/i);
  });
});
