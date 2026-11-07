import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoritesView } from "@/components/account/favorites-view";
import { useAuth } from "@/context/auth-context";
import { FavoritesProvider } from "@/context/favorites-context";
import { fetchFavorites, removeFavorite } from "@/lib/account/favorites";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/favorites", () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock("@/lib/menu/fetch-public-menu", () => ({ fetchPublicMenu: vi.fn() }));
vi.mock("@/components/menu/menu-item-order-dialog", () => ({
  MenuItemOrderDialog: ({ item }: { item: { name: string } }) => (
    <div>order dialog for {item.name}</div>
  ),
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
        {
          id: "nachos",
          name: "Nachos",
          availability: "unavailable",
          flavors: [],
          variants: [
            {
              id: "v2",
              name: "Regular",
              description: null,
              basePrice: 120,
              flavorPrices: [],
            },
          ],
        },
        {
          id: "latte",
          name: "Latte",
          availability: "available",
          flavors: [],
          variants: [
            {
              id: "latte-12",
              name: "12oz",
              description: null,
              basePrice: 89,
              flavorPrices: [],
            },
            {
              id: "latte-16",
              name: "16oz",
              description: null,
              basePrice: 109,
              flavorPrices: [],
            },
          ],
        },
      ],
    },
  ],
};

function saved(...itemIds: string[]) {
  return itemIds.map((itemId, index) => ({
    itemId,
    createdAt: `2026-11-0${7 - index}T00:00:00Z`,
  }));
}

function renderPage() {
  return render(
    <FavoritesProvider>
      <FavoritesView />
    </FavoritesProvider>,
  );
}

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
    vi.mocked(removeFavorite).mockResolvedValue(undefined);
  });

  it("TC-P5-077 — lists favorites with the current price and an Order button", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue(saved("takoyaki"));
    renderPage();

    expect(await screen.findByText("Takoyaki")).toBeInTheDocument();
    expect(screen.getByText(/99/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Order Takoyaki" }),
    ).toBeInTheDocument();
  });

  it("TC-P5-078 — shows the empty state", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No Favorites Yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("TC-P5-079 — leaves out saved items the website doesn't list", async () => {
    // "take-out-box" is sold only at the shop, so the website menu leaves it
    // out; "old-item" is no longer on the POS menu.
    vi.mocked(fetchFavorites).mockResolvedValue(
      saved("take-out-box", "old-item"),
    );
    renderPage();

    expect(await screen.findByText("No Favorites Yet")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("TC-P5-080 — shows an unavailable item without an Order button", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue(saved("nachos", "takoyaki"));
    renderPage();

    const rows = await screen.findAllByRole("listitem");
    expect(
      rows.map((row) => within(row).getByRole("heading").textContent),
    ).toEqual(["Nachos", "Takoyaki"]);
    expect(
      within(rows[0]!).getByText("Not available to order right now"),
    ).toBeInTheDocument();
    expect(
      within(rows[0]!).queryByRole("button", { name: "Order Nachos" }),
    ).not.toBeInTheDocument();
  });

  it("TC-P5-081 — shows a From price for several sizes, and Order opens the order dialog", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue(saved("latte"));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/From\s*₱89/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Order Latte" }));
    expect(screen.getByText("order dialog for Latte")).toBeInTheDocument();
  });

  it("TC-P5-082 — shows an error when the favorites can't load", async () => {
    vi.mocked(fetchFavorites).mockRejectedValue(new Error("network down"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load your favorites. Please try again later.",
    );
    expect(screen.queryByText("No Favorites Yet")).not.toBeInTheDocument();
  });

  it("TC-P5-083 — a heart removed here stays on the page so it can be saved again", async () => {
    vi.mocked(fetchFavorites).mockResolvedValue(saved("takoyaki"));
    const user = userEvent.setup();
    renderPage();

    const heart = await screen.findByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    await waitFor(() => expect(heart).toHaveAttribute("aria-pressed", "true"));
    await user.click(heart);

    expect(removeFavorite).toHaveBeenCalledWith({
      userId: "customer-123",
      itemId: "takoyaki",
    });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Takoyaki")).toBeInTheDocument();
  });
});
