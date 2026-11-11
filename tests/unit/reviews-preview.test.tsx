import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewsPreview } from "@/components/reviews/reviews-preview";
import { siteConfig } from "@/config/site";
import { fetchReviews } from "@/lib/reviews/service";
import type { Review } from "@/lib/reviews/types";

vi.mock("@/lib/reviews/service", () => ({
  fetchReviews: vi.fn(),
  formatReviewDate: () => "Nov 10, 2026",
}));

const review = (n: number, rating: number): Review => ({
  id: `r${n}`,
  displayName: `Tester ${n}`,
  rating,
  body: `Test review ${n}`,
  hidden: false,
  createdAt: "2026-11-10T08:00:00Z",
  updatedAt: "2026-11-10T08:00:00Z",
});

describe("Reviews on the home page (FR-098)", () => {
  beforeEach(() => {
    vi.mocked(fetchReviews).mockReset();
  });

  it("TC-P5-204 shows the average, the count and the three newest reviews", async () => {
    vi.mocked(fetchReviews).mockResolvedValue({
      reviews: [review(1, 5), review(2, 4), review(3, 5)],
      totalCount: 7,
      averageRating: 4.57,
    });
    render(<ReviewsPreview />);
    expect(await screen.findByText("Test review 1")).toBeInTheDocument();
    expect(fetchReviews).toHaveBeenCalledWith({ page: 0, pageSize: 3 });
    const section = screen.getByTestId("home-reviews");
    expect(within(section).getAllByRole("article")).toHaveLength(3);
    expect(within(section).getByText("4.6")).toBeInTheDocument();
    expect(within(section).getByText("7 reviews")).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: "Read all reviews" }),
    ).toHaveAttribute("href", "/about#reviews");
    expect(
      within(section).getByRole("link", { name: "Leave a review" }),
    ).toHaveAttribute("href", "/about#reviews");
  });

  it("TC-P5-205 with no reviews yet it invites the first one", async () => {
    vi.mocked(fetchReviews).mockResolvedValue({
      reviews: [],
      totalCount: 0,
      averageRating: 0,
    });
    render(<ReviewsPreview />);
    expect(
      await screen.findByText("No reviews yet. Be the first."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Read all reviews" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Leave a review" }),
    ).toBeInTheDocument();
  });

  it("TC-P5-206 if the reviews can't load the link to them still shows", async () => {
    let fail: (error: Error) => void = () => {};
    vi.mocked(fetchReviews).mockReturnValue(
      new Promise((_, reject) => {
        fail = reject;
      }),
    );
    render(<ReviewsPreview />);
    await act(async () => fail(new Error("offline")));
    expect(
      screen.getByRole("link", { name: "Leave a review" }),
    ).toHaveAttribute("href", "/about#reviews");
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("No reviews yet. Be the first.")).toBeNull();
  });

  it("TC-P5-207 the menu and the footer link to the reviews", () => {
    expect(siteConfig.navigation).toContainEqual({
      label: "Reviews",
      href: "/about#reviews",
    });
  });
});
