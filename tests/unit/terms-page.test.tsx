import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage from "@/app/terms/page";
import { TERMS_UPDATED } from "@/config/terms";

const SECTIONS = [
  ["about-these-terms", "About these terms"],
  ["orders", "Orders and payment"],
  ["your-account", "Your account"],
  ["points-and-rewards", "Coins and rewards"],
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
    expect(updated).toHaveTextContent("November 25, 2026");

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

  it("TC-P9-118 — gives the games' odds and the coin rules that Google Play's loyalty rules ask for (FR-120, ADR-039)", async () => {
    const { container } = render(await TermsPage());
    const text = (id: string) =>
      (container.querySelector(`section#${id}`)?.textContent ?? "").replace(
        /\s+/g,
        " ",
      );

    const coins = text("points-and-rewards");
    expect(coins).toContain("You can't buy coins");
    expect(coins).toContain("Each coin takes ₱1 off");
    expect(coins).toContain("up to 20% of the order's subtotal");

    const games = text("games-and-ads");
    expect(games).toContain("a 1 in 3 chance of winning 0.2 coins");
    expect(games).toContain("0.1 coins (60 in 100) or 0.2 coins (40 in 100)");
    expect(games).toContain("up to 2 coins a day");
    expect(games).toContain("first 3 plays each day");
  });
});
