import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";
import { siteConfig } from "@/config/site";

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
    expect(screen.getByText("Mon–Fri · 11 AM – 9 PM")).toBeInTheDocument();
    expect(screen.getByText("Sun · 1 PM – 9 PM")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Closed every Saturday/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/10 PM|Closed every Sunday/i)).toBeNull();
  });

  it("TC-P2-003 — removes Phase 1 developer-facing placeholder messaging", () => {
    const { container } = render(<HomePage />);
    const pageText = container.textContent?.toLowerCase() ?? "";

    expect(pageText).not.toMatch(/project foundation/);
    expect(pageText).not.toMatch(/next milestone/);
    expect(pageText).not.toMatch(/future customer experience/);
    expect(pageText).not.toMatch(/ordering not yet active/);
  });

  it("TC-P4-032 — keeps the visit labels and the Maps link name, with decorative icons", () => {
    const { container } = render(<HomePage />);

    const terms = Array.from(container.querySelectorAll("dt"));
    expect(terms.map((term) => term.textContent)).toEqual([
      "Find us",
      "Landmark",
      "Hours",
      "Payment",
    ]);
    terms.forEach((term) => {
      expect(term.querySelectorAll("svg")).toHaveLength(1);
    });

    const maps = screen.getByRole("link", { name: "Open in Maps" });
    expect(maps).toHaveAttribute("href", siteConfig.address.mapUrl);
    expect(maps).toHaveAttribute("target", "_blank");
    expect(maps).toHaveAttribute("rel", "noopener noreferrer");

    // four fact labels, the address pin and the Maps button
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(6);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    });
  });
});
