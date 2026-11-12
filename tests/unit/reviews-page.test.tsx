import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ReviewsPage from "@/app/reviews/page";
import { ReviewsHashRedirect } from "@/components/reviews/reviews-hash-redirect";
import { siteConfig } from "@/config/site";

vi.mock("@/components/reviews/reviews-section", () => ({
  ReviewsSection: () => <section id="reviews" data-testid="reviews-section" />,
}));

vi.mock("@/components/ui/page-intro", () => ({
  PageIntro: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

describe("The Reviews page (FR-098, update 2026-11-13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("TC-P5-213 has its own page with the reviews list and form", () => {
    render(<ReviewsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Reviews" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("reviews-section")).toBeInTheDocument();
  });

  it("TC-P5-214 the navigation's Reviews link opens /reviews, not About", () => {
    const link = siteConfig.navigation.find((item) => item.label === "Reviews");
    expect(link?.href).toBe("/reviews");
  });

  it("TC-P5-215 an old /about#reviews link forwards to /reviews", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      hash: "#reviews",
      replace,
    });
    render(<ReviewsHashRedirect />);
    expect(replace).toHaveBeenCalledWith("/reviews");
  });

  it("TC-P5-216 the About page without the hash stays put", () => {
    const replace = vi.fn();
    const location = { ...window.location, hash: "", replace };
    vi.stubGlobal("location", location);
    render(<ReviewsHashRedirect />);
    expect(replace).not.toHaveBeenCalled();
    // ...until the hash changes to #reviews while About is open
    location.hash = "#reviews";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(replace).toHaveBeenCalledWith("/reviews");
  });
});
