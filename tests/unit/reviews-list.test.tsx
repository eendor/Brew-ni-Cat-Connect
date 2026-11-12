import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReviewsList } from "@/components/reviews/reviews-list";
import { EMPTY_REVIEWS_MESSAGE } from "@/lib/reviews/constants";
import type { Review } from "@/lib/reviews/types";

const mockReviews: readonly Review[] = [
  {
    id: "rev-1",
    displayName: "Maria",
    rating: 5,
    body: "The caramel latte is superb and the cats are so calm.",
    hidden: false,
    createdAt: "2026-11-09T08:00:00Z",
    updatedAt: "2026-11-09T08:00:00Z",
  },
  {
    id: "rev-2",
    displayName: "Guest",
    rating: 4,
    body: "Good takoyaki and quick service.",
    hidden: false,
    createdAt: "2026-11-08T14:30:00Z",
    updatedAt: "2026-11-08T14:30:00Z",
  },
];

describe("ReviewsList component (FR-098)", () => {
  it("TC-P5-195 — renders average rating and total count formatted properly", () => {
    render(
      <ReviewsList
        reviews={mockReviews}
        totalCount={2}
        averageRating={4.5}
        isLoading={false}
      />,
    );

    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText(/based on 2 reviews/i)).toBeInTheDocument();
  });

  it("TC-P5-196 — renders empty state when total count is 0", () => {
    render(
      <ReviewsList
        reviews={[]}
        totalCount={0}
        averageRating={0}
        isLoading={false}
      />,
    );

    expect(screen.getByText(EMPTY_REVIEWS_MESSAGE)).toBeInTheDocument();
  });

  it("TC-P5-197 — renders reviews with star rating, display name, date, and text", () => {
    render(
      <ReviewsList
        reviews={mockReviews}
        totalCount={2}
        averageRating={4.5}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(
      screen.getByText("The caramel latte is superb and the cats are so calm."),
    ).toBeInTheDocument();

    expect(screen.getByText("Guest")).toBeInTheDocument();
    expect(
      screen.getByText("Good takoyaki and quick service."),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("img", { name: /out of 5 stars/i }).length,
    ).toBeGreaterThan(0);
  });

  it("TC-P5-198 — never displays customer ID, email, or phone number", () => {
    const { container } = render(
      <ReviewsList
        reviews={mockReviews}
        totalCount={2}
        averageRating={4.5}
        isLoading={false}
      />,
    );

    const html = container.innerHTML;
    expect(html).not.toContain("@");
    expect(html).not.toMatch(/\+639\d{9}/);
    expect(html).not.toMatch(/09\d{9}/);
    expect(html).not.toContain("customer_id");
    expect(html).not.toContain("customerId");
  });

  it("TC-P5-199 — renders 'Show more' button when hasMore is true and invokes onLoadMore", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();

    render(
      <ReviewsList
        reviews={mockReviews}
        totalCount={15}
        averageRating={4.5}
        isLoading={false}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );

    const showMoreBtn = screen.getByRole("button", { name: /show more/i });
    expect(showMoreBtn).toBeInTheDocument();

    await user.click(showMoreBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("TC-P5-200 — renders loading state and error state with retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    const { rerender } = render(
      <ReviewsList
        reviews={[]}
        totalCount={0}
        averageRating={0}
        isLoading={true}
      />,
    );

    expect(screen.getByText(/loading customer reviews/i)).toBeInTheDocument();

    rerender(
      <ReviewsList
        reviews={[]}
        totalCount={0}
        averageRating={0}
        isLoading={false}
        error="Network connection failure"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Network connection failure",
    );
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
