import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import {
  accountDisplayName,
  googlePhotoFromMetadata,
  initialsOf,
  safeGooglePhotoUrl,
} from "@/lib/account/avatar";
import { fetchCustomerProfile } from "@/lib/account/profile";
import { submitReview, validateReviewInput } from "@/lib/reviews/service";
import type { Review } from "@/lib/reviews/types";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/profile", () => ({ fetchCustomerProfile: vi.fn() }));
vi.mock("@/lib/reviews/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/reviews/service")>()),
  submitReview: vi.fn(),
  fetchMyReview: vi.fn().mockResolvedValue(null),
}));

const PHOTO = "https://lh3.googleusercontent.com/a/ACg8ocTest=s96-c";

const review: Review = {
  id: "r1",
  displayName: "Maria",
  rating: 5,
  body: "Lovely cats",
  hidden: false,
  avatarUrl: PHOTO,
  createdAt: "2026-11-17T00:00:00Z",
  updatedAt: "2026-11-17T00:00:00Z",
};

describe("Google profile photos (FR-119)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCustomerProfile).mockResolvedValue({
      userId: "u1",
      fullName: "Maria Clara",
      phone: "+639123456789",
    });
  });

  it("TC-P9-077 — only Google photo addresses are used", () => {
    expect(safeGooglePhotoUrl(PHOTO)).toBe(PHOTO);
    for (const bad of [
      "http://lh3.googleusercontent.com/a/x",
      "https://lh3.googleusercontent.com.evil.example/a/x",
      "https://evil.example/lh3.googleusercontent.com/a/x",
      "https://lh3.googleusercontent.com/a/x?y=1#z",
      "javascript:alert(1)",
      42,
      null,
    ]) {
      expect(safeGooglePhotoUrl(bad)).toBeNull();
    }
    expect(googlePhotoFromMetadata({ picture: PHOTO })).toBe(PHOTO);
    expect(
      googlePhotoFromMetadata({ avatar_url: "https://x.example/p.png" }),
    ).toBeNull();
    expect(initialsOf("maria clara santos")).toBe("MC");
    expect(initialsOf("")).toBe("?");
    expect(
      accountDisplayName({ email: "a@b.c", user_metadata: { name: " Ana " } }),
    ).toBe("Ana");
    expect(accountDisplayName({ email: "a@b.c" })).toBe("a@b.c");
  });

  it("TC-P9-078 — the avatar sends no referrer and falls back to initials", () => {
    const { container, rerender } = render(
      <Avatar name="Maria Clara" photoUrl={PHOTO} />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(img?.getAttribute("alt")).toBe("");
    fireEvent.error(img!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("avatar")).toHaveTextContent("MC");

    rerender(<Avatar name="Ana" photoUrl="https://evil.example/p.png" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("avatar")).toHaveTextContent("A");
  });

  it("TC-P9-079 — a review shows its photo, or initials without one", () => {
    const { container, rerender } = render(<ReviewCard review={review} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(PHOTO);
    rerender(<ReviewCard review={{ ...review, avatarUrl: null }} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("avatar")).toHaveTextContent("M");
  });

  it("TC-P9-080 — a signed-in customer can post without their photo", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", user_metadata: { avatar_url: PHOTO } },
      session: { access_token: "token" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(submitReview).mockResolvedValue({
      ok: true,
      review: { ...review, avatarUrl: null },
    });
    const user = userEvent.setup();
    render(<ReviewForm onReviewPosted={() => {}} />);

    const toggle = await screen.findByLabelText(/show my google photo/i);
    expect(toggle).toBeChecked();
    await user.click(toggle);
    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(screen.getByLabelText(/your review/i), {
      target: { value: "Lovely cats" },
    });
    await user.click(screen.getByRole("button", { name: /post review/i }));

    await waitFor(() =>
      expect(submitReview).toHaveBeenCalledWith(
        { rating: 5, body: "Lovely cats", showPhoto: false },
        "token",
      ),
    );
  });

  it("TC-P9-082 — the photo choice defaults to on and only an explicit false turns it off", () => {
    const on = validateReviewInput({ rating: 5, body: "Hi" });
    expect(on.ok && on.data.showPhoto).toBe(true);
    const off = validateReviewInput({
      rating: 5,
      body: "Hi",
      showPhoto: false,
    });
    expect(off.ok && off.data.showPhoto).toBe(false);
  });

  it("TC-P9-081 — guests and accounts without a Google photo see no photo switch", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    const { rerender } = render(<ReviewForm onReviewPosted={() => {}} />);
    expect(screen.queryByLabelText(/show my google photo/i)).toBeNull();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u2", user_metadata: {} },
      session: { access_token: "token" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    rerender(<ReviewForm onReviewPosted={() => {}} />);
    await screen.findByText(/posting as/i);
    expect(screen.queryByLabelText(/show my google photo/i)).toBeNull();
  });
});
