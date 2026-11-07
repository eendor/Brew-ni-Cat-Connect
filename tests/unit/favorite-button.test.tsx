import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoriteButton } from "@/components/menu/favorite-button";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { useAuth } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { FavoritesProvider } from "@/context/favorites-context";
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "@/lib/account/favorites";
import type { MenuItem } from "@/types/menu";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/favorites", () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

function signInAs(id: string | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: id ? { id } : null,
    isLoading: false,
  } as unknown as ReturnType<typeof useAuth>);
}

function withFavorites(children: ReactNode) {
  return <FavoritesProvider>{children}</FavoritesProvider>;
}

const takoyaki: MenuItem = {
  id: "takoyaki",
  name: "Takoyaki",
  availability: "available",
  flavors: [],
  variants: [
    {
      id: "takoyaki-6",
      name: "6 pcs",
      basePrice: 99,
      flavorPrices: [],
      description: null,
    },
  ],
};

describe("FavoriteButton (FR-040)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchFavorites).mockResolvedValue([]);
    vi.mocked(addFavorite).mockResolvedValue(undefined);
    vi.mocked(removeFavorite).mockResolvedValue(undefined);
  });

  it("TC-P5-071 — is hidden when signed out", () => {
    signInAs(null);
    render(
      withFavorites(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />),
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(fetchFavorites).not.toHaveBeenCalled();
  });

  it("TC-P5-072 — toggles on and off", async () => {
    signInAs("customer-123");
    const user = userEvent.setup();
    render(
      withFavorites(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />),
    );

    const button = await screen.findByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    await waitFor(() => expect(button).toBeEnabled());
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

  it("TC-P5-073 — loads the favorites once for every heart and keeps the same item in sync", async () => {
    signInAs("customer-123");
    vi.mocked(fetchFavorites).mockResolvedValue([
      { itemId: "latte", createdAt: "2026-11-05T00:00:00Z" },
    ]);
    const user = userEvent.setup();
    render(
      withFavorites(
        <>
          <FavoriteButton itemId="latte" itemName="Latte" />
          <FavoriteButton itemId="takoyaki" itemName="Takoyaki" />
          <FavoriteButton itemId="takoyaki" itemName="Takoyaki" />
        </>,
      ),
    );

    const latte = screen.getByRole("button", {
      name: "Save Latte to favorites",
    });
    await waitFor(() => expect(latte).toHaveAttribute("aria-pressed", "true"));
    expect(fetchFavorites).toHaveBeenCalledTimes(1);
    expect(fetchFavorites).toHaveBeenCalledWith({ userId: "customer-123" });

    const [first, second] = screen.getAllByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    expect(second).toHaveAttribute("aria-pressed", "false");
    await user.click(first!);
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("TC-P5-074 — puts the heart back when saving fails", async () => {
    signInAs("customer-123");
    vi.mocked(addFavorite).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(
      withFavorites(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />),
    );

    const button = screen.getByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(addFavorite).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-pressed", "false"),
    );
  });

  it("TC-P5-075 — ignores a second tap while the first one is saving", async () => {
    signInAs("customer-123");
    let finishSaving: () => void = () => {};
    vi.mocked(addFavorite).mockReturnValue(
      new Promise<void>((resolve) => {
        finishSaving = resolve;
      }),
    );
    const user = userEvent.setup();
    render(
      withFavorites(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />),
    );

    const button = screen.getByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await user.click(button);

    expect(addFavorite).toHaveBeenCalledTimes(1);
    expect(removeFavorite).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-pressed", "true");
    finishSaving();
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
  });

  it("TC-P5-076 — waits for the list and never shows the last customer's hearts", async () => {
    signInAs("customer-a");
    vi.mocked(fetchFavorites).mockResolvedValueOnce([
      { itemId: "takoyaki", createdAt: "2026-11-05T00:00:00Z" },
    ]);
    const view = render(
      withFavorites(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />),
    );
    const button = screen.getByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));

    // The next customer's list is still loading: the heart is empty and
    // disabled, not the first customer's saved heart.
    vi.mocked(fetchFavorites).mockReturnValueOnce(new Promise(() => {}));
    signInAs("customer-b");
    view.rerender(
      withFavorites(<FavoriteButton itemId="takoyaki" itemName="Takoyaki" />),
    );
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(fetchFavorites).toHaveBeenLastCalledWith({ userId: "customer-b" });
  });

  it("TC-P5-085 — the menu card puts the heart beside Add to order, only when signed in", async () => {
    signInAs(null);
    const signedOut = render(
      <CartProvider>
        {withFavorites(<MenuItemCard item={takoyaki} />)}
      </CartProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Order Takoyaki" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save Takoyaki to favorites" }),
    ).not.toBeInTheDocument();
    signedOut.unmount();

    signInAs("customer-123");
    render(
      <CartProvider>
        {withFavorites(
          <>
            <MenuItemCard item={takoyaki} />
            <MenuItemCard
              item={{
                ...takoyaki,
                id: "nachos",
                name: "Nachos",
                availability: "unavailable",
              }}
            />
          </>,
        )}
      </CartProvider>,
    );

    const [card, soldOut] = screen.getAllByRole("article");
    const heart = within(card!).getByRole("button", {
      name: "Save Takoyaki to favorites",
    });
    const footer = heart.parentElement;
    expect(footer).toHaveClass("menu-card__footer");
    expect(
      within(footer!).getByRole("button", { name: "Order Takoyaki" }),
    ).not.toContainElement(heart);

    // A sold-out item can still be saved; it just has no Order button.
    expect(
      within(soldOut!).queryByRole("button", { name: "Order Nachos" }),
    ).not.toBeInTheDocument();
    expect(
      within(soldOut!).getByRole("button", {
        name: "Save Nachos to favorites",
      }),
    ).toBeInTheDocument();
  });
});
