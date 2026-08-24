import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

describe("Home page", () => {
  it("TC-P1-002 / TC-P2-001 — renders the real brand, official logo, and customer CTAs", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Coffee, comfort, and a little cat energy.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Brew ni Cat Coffee Shop logo" }),
    ).toHaveAttribute("src", expect.stringContaining("brew-ni-cat-logo.png"));
    expect(
      screen.getByRole("link", { name: "Browse current menu" }),
    ).toHaveAttribute("href", "/menu");
    expect(
      screen.getByRole("link", { name: "Plan your visit" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("TC-P2-002 — presents approved favorite groups and public visit details", () => {
    render(<HomePage />);

    for (const favorite of ["Matcha", "Takoyaki", "Fries"]) {
      expect(
        screen.getByRole("heading", { level: 3, name: favorite }),
      ).toBeInTheDocument();
    }

    const favoriteMenuLinks = screen.getAllByRole("link", {
      name: "Browse the menu",
    });
    expect(favoriteMenuLinks).toHaveLength(3);
    for (const link of favoriteMenuLinks) {
      expect(link).toHaveAttribute("href", "/menu");
    }

    expect(screen.getByText("Beside Pulido Eatery")).toBeInTheDocument();
    expect(screen.getByText("Cash and GCash")).toBeInTheDocument();
    expect(screen.getByText(/Operating hours may vary/i)).toBeInTheDocument();
  });

  it("TC-P2-003 — removes Phase 1 developer-facing placeholder messaging", () => {
    const { container } = render(<HomePage />);
    const pageText = container.textContent?.toLowerCase() ?? "";

    expect(pageText).not.toMatch(/project foundation/);
    expect(pageText).not.toMatch(/next milestone/);
    expect(pageText).not.toMatch(/future customer experience/);
    expect(pageText).not.toMatch(/ordering not yet active/);
  });
});
