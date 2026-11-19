import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage from "@/app/terms/page";
import { TERMS_UPDATED } from "@/config/terms";

const SECTIONS = [
  ["about-these-terms", "About these terms"],
  ["orders", "Orders and payment"],
  ["your-account", "Your account"],
  ["points-and-rewards", "Points and rewards"],
  ["games-and-ads", "Mini-games and ads"],
  ["reviews", "Reviews"],
  ["contact-us", "Contact us"],
  ["changes", "Changes to these terms"],
] as const;

describe("Terms of Use page", () => {
  it("TC-P9-086 — shows the terms, their version date, a linkable section per topic and links to the privacy policy and rewards page (FR-120)", async () => {
    const { container } = render(await TermsPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Use" }),
    ).toBeInTheDocument();
    const updated = container.querySelector("time");
    expect(updated).toHaveAttribute("datetime", TERMS_UPDATED);
    expect(updated).toHaveTextContent("November 19, 2026");

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

    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "rewards page" })).toHaveAttribute(
      "href",
      "/account/rewards",
    );
  });
});
