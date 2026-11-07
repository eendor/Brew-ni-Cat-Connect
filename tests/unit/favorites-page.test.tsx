import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoritesView } from "@/components/account/favorites-view";
import { useAuth } from "@/context/auth-context";
import { fetchFavorites } from "@/lib/account/favorites";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/favorites", () => ({ fetchFavorites: vi.fn() }));
vi.mock("@/lib/menu/fetch-public-menu", () => ({ fetchPublicMenu: vi.fn() }));
vi.mock("@/components/menu/menu-item-order-dialog", () => ({
  MenuItemOrderDialog: () => <div>order dialog</div>,
}));

const menu = {
  categories: [
    {
      id: "bites",
      name: "Bites",
      items: [
        {
          id: "takoyaki",
          name: "Takoyaki",
          availability: "available",
          flavors: [],
          variants: [
            {
              id: "v1",
              name: "Regular",
              description: null,
              basePrice: 99,
              flavorPrices: [],
            },
          ],
        },
      ],
    },
  ],
};

describe("FavoritesView (FR-040)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "customer-123" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(fetchPublicMenu).mockResolvedValue(
      menu as unknown as Awaited<ReturnType<typeof fetchPublicMenu>>,
    );
  });

  it("lists favorites with the current price and an Order button", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue([
      { itemId: "takoyaki", createdAt: "2026-11-05T00:00:00Z" },
    ]);
    render(<FavoritesView />);

    expect(await screen.findByText("Takoyaki")).toBeInTheDocument();
    expect(screen.getByText(/99/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Order Takoyaki" }),
    ).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue([]);
    render(<FavoritesView />);

    expect(await screen.findByText("No Favorites Yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });
});
