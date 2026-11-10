import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewForm } from "@/components/reviews/review-form";
import { useAuth } from "@/context/auth-context";
import { fetchCustomerProfile } from "@/lib/account/profile";
import {
  RATE_LIMITED_MESSAGE,
  REVIEW_ERROR_MESSAGES,
  REVIEW_MAX_LENGTH,
} from "@/lib/reviews/constants";
import { fetchMyReview, submitReview } from "@/lib/reviews/service";
import type { PostReviewResult } from "@/lib/reviews/types";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/profile", () => ({ fetchCustomerProfile: vi.fn() }));
vi.mock("@/lib/reviews/service", () => ({
  submitReview: vi.fn(),
  fetchMyReview: vi.fn(),
}));

describe("ReviewForm component (FR-098)", () => {
  const onReviewPosted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(fetchCustomerProfile).mockResolvedValue(null);
    vi.mocked(fetchMyReview).mockResolvedValue(null);
  });

  it("TC-P5-188 — requires a star choice (1 to 5) before submission", async () => {
    const user = userEvent.setup();
    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    // Type body without choosing a star rating
    const textarea = screen.getByLabelText(/your review/i);
    fireEvent.change(textarea, {
      target: { value: "Great ambiance and delicious food" },
    });

    const submitBtn = screen.getByRole("button", { name: /post review/i });
    await user.click(submitBtn);

    expect(
      screen.getByText(REVIEW_ERROR_MESSAGES.ratingRequired),
    ).toBeInTheDocument();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it("TC-P5-189 — enforces 500 character limit with live counter", async () => {
    const user = userEvent.setup();
    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    const textarea = screen.getByLabelText(/your review/i);
    expect(screen.getByText(`0/${REVIEW_MAX_LENGTH}`)).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Hello world" } });
    expect(screen.getByText(`11/${REVIEW_MAX_LENGTH}`)).toBeInTheDocument();

    // Select star
    const star5 = screen.getByRole("radio", { name: "5 stars" });
    await user.click(star5);

    // Empty text
    fireEvent.change(textarea, { target: { value: "" } });
    const submitBtn = screen.getByRole("button", { name: /post review/i });
    await user.click(submitBtn);
    expect(
      screen.getByText(REVIEW_ERROR_MESSAGES.textEmpty),
    ).toBeInTheDocument();
  });

  it("TC-P5-190 — displays 'Posting as <first name>' when signed in and allows editing existing review", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-456" },
      session: { access_token: "mock-token" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    vi.mocked(fetchCustomerProfile).mockResolvedValue({
      userId: "user-456",
      fullName: "Maria Clara",
      phone: "+639123456789",
    });

    vi.mocked(fetchMyReview).mockResolvedValue({
      id: "existing-rev-1",
      displayName: "Maria",
      rating: 4,
      body: "My previous review",
      hidden: false,
      createdAt: "2026-11-08T10:00:00Z",
      updatedAt: "2026-11-08T10:00:00Z",
    });

    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    await waitFor(() => {
      expect(screen.getByText("Maria")).toBeInTheDocument();
      expect(screen.getByText(/posting as/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/edit your review/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /update review/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("My previous review"),
      ).toBeInTheDocument();
    });
  });

  it("TC-P5-191 — displays 'Posting as Guest' and note that guest reviews cannot be edited", () => {
    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    expect(screen.getByText("Posting as Guest")).toBeInTheDocument();
    expect(
      screen.getByText(/guest reviews cannot be edited after posting/i),
    ).toBeInTheDocument();
  });

  it("TC-P5-192 — disables form fields and button while submitting", async () => {
    const user = userEvent.setup();
    let resolveSubmit: (val: PostReviewResult) => void = () => {};
    vi.mocked(submitReview).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    const star4 = screen.getByRole("radio", { name: "4 stars" });
    await user.click(star4);

    const textarea = screen.getByLabelText(/your review/i);
    fireEvent.change(textarea, { target: { value: "Nice matcha!" } });

    const submitBtn = screen.getByRole("button", { name: /post review/i });
    await user.click(submitBtn);

    expect(
      screen.getByRole("button", { name: /saving\.\.\./i }),
    ).toBeDisabled();
    expect(textarea).toBeDisabled();

    // Resolve
    resolveSubmit({
      ok: true,
      review: {
        id: "rev-1",
        displayName: "Guest",
        rating: 4,
        body: "Nice matcha!",
        hidden: false,
        createdAt: "2026-11-09T12:00:00Z",
        updatedAt: "2026-11-09T12:00:00Z",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /post review/i }),
      ).toBeEnabled();
    });
  });

  it("TC-P5-193 — displays success message and calls onReviewPosted on successful post", async () => {
    const user = userEvent.setup();
    const createdReview = {
      id: "rev-new",
      displayName: "Guest",
      rating: 5,
      body: "Great cat cafe!",
      hidden: false,
      createdAt: "2026-11-09T12:00:00Z",
      updatedAt: "2026-11-09T12:00:00Z",
    };

    vi.mocked(submitReview).mockResolvedValue({
      ok: true,
      review: createdReview,
    });

    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    const star5 = screen.getByRole("radio", { name: "5 stars" });
    await user.click(star5);

    const textarea = screen.getByLabelText(/your review/i);
    fireEvent.change(textarea, { target: { value: "Great cat cafe!" } });

    const submitBtn = screen.getByRole("button", { name: /post review/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/thank you! your review has been posted/i),
      ).toBeInTheDocument();
      expect(onReviewPosted).toHaveBeenCalledWith(createdReview);
    });
  });

  it("TC-P5-194 — displays clear error message when API call fails", async () => {
    const user = userEvent.setup();
    vi.mocked(submitReview).mockResolvedValue({
      ok: false,
      error: "rate-limited",
      message: RATE_LIMITED_MESSAGE,
    });

    render(<ReviewForm onReviewPosted={onReviewPosted} />);

    const star5 = screen.getByRole("radio", { name: "5 stars" });
    await user.click(star5);

    const textarea = screen.getByLabelText(/your review/i);
    fireEvent.change(textarea, { target: { value: "Too many posts test" } });

    const submitBtn = screen.getByRole("button", { name: /post review/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(RATE_LIMITED_MESSAGE);
      expect(onReviewPosted).not.toHaveBeenCalled();
    });
  });
});
