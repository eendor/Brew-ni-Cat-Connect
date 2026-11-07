import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoriteButton } from "@/components/menu/favorite-button";
import { useAuth } from "@/context/auth-context";
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "@/lib/account/favorites";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/favorites", () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

describe("FavoriteButton (FR-040)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchFavorites).mockResolvedValue([]);
    vi.mocked(addFavorite).mockResolvedValue(undefined);
    vi.mocked(removeFavorite).mockResolvedValue(undefined);
  });

  it("is hidden when signed out", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    render(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("toggles on and off", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "customer-123" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    const user = userEvent.setup();
    render(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />);

    const button = await screen.findByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    expect(addFavorite).toHaveBeenCalledWith({
      userId: "customer-123",
      itemId: "takoyaki",
    });

    await user.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-pressed", "false"),
    );
    expect(removeFavorite).toHaveBeenCalledWith({
      userId: "customer-123",
      itemId: "takoyaki",
    });
  });
});
