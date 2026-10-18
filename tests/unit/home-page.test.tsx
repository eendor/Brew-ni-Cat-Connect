import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

describe("Home page", () => {
  it("TC-P1-002 / TC-P2-001 — renders the real brand headline and customer CTAs", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Coffee, comfort, and a little cat energy.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kabacan, Cotabato · Est. June 2026"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Brew ni Cat Coffee Shop logo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse current menu" }),
    ).toHaveAttribute("href", "/menu");
    expect(
      screen.getByRole("link", { name: "Plan your visit" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("TC-P2-002 — presents approved favorite groups and public visit details", () => {
    render(<HomePage />);

    // one menu action on the page: the hero's (the favorites section that
    // repeated the hero's items and links was removed)
    expect(screen.getAllByRole("link", { name: /menu/i })).toHaveLength(1);

    expect(screen.getByText("Beside Pulido Eatery")).toBeInTheDocument();
    expect(screen.getByText("Cash and GCash")).toBeInTheDocument();
    expect(screen.getAllByText(/Closed every Sunday/i).length).toBeGreaterThan(
      0,
    );
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
