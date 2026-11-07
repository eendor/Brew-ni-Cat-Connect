"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MenuItemOrderDialog } from "@/components/menu/menu-item-order-dialog";
import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import { fetchFavorites } from "@/lib/account/favorites";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import {
  formatPrice,
  getItemPrices,
  getLowestItemPrice,
} from "@/lib/menu/format-price";
import type { MenuCatalog, MenuItem } from "@/types/menu";

type FavoriteEntry = Readonly<{ item: MenuItem; categoryName: string }>;

/** Saved items with their current price from the live menu (FR-040). */
export function FavoritesView() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [catalog, setCatalog] = useState<MenuCatalog | null>(null);
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordering, setOrdering] = useState<FavoriteEntry | null>(null);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;

    Promise.all([fetchFavorites({ userId: user.id }), fetchPublicMenu()])
      .then(([favorites, menu]) => {
        if (!active) return;
        const all: FavoriteEntry[] = menu.categories.flatMap((category) =>
          category.items.map((item) => ({
            item,
            categoryName: category.name,
          })),
        );
        setCatalog(menu);
        setEntries(
          favorites
            .map((favorite) => all.find((e) => e.item.id === favorite.itemId))
            .filter((e): e is FavoriteEntry => e !== undefined),
        );
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load your favorites. Please try again later.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, isAuthLoading]);

  return (
    <Container className="py-8 md:py-12 max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-strong)] tracking-tight">
          Favorites
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Items you saved, shown with their current price.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="h-44 animate-pulse rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
      ) : entries.length === 0 && !error ? (
        <div className="ios-card p-10 text-center">
          <h2 className="font-display text-xl text-[var(--text-strong)]">
            No Favorites Yet
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Tap the heart on a menu item to save it here.
          </p>
          <div className="mt-6">
            <Link
              href="/menu"
              className="button-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 font-semibold"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => {
            const prices = getItemPrices(entry.item).filter(
              (price): price is number => price !== null,
            );
            const lowest = getLowestItemPrice(prices);
            const canOrder =
              entry.item.availability === "available" &&
              entry.item.variants.length > 0;

            return (
              <li
                key={entry.item.id}
                className="ios-card flex items-center justify-between gap-4 border border-[var(--separator)] p-5"
              >
                <div>
                  <h2 className="font-semibold text-[var(--text-strong)]">
                    {entry.item.name}
                  </h2>
                  {lowest !== null ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      {formatPrice(lowest)}
                    </p>
                  ) : null}
                  {!canOrder ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Not available to order right now
                    </p>
                  ) : null}
                </div>
                {canOrder ? (
                  <button
                    type="button"
                    onClick={() => setOrdering(entry)}
                    aria-label={`Order ${entry.item.name}`}
                    className="button-primary inline-flex min-h-10 items-center justify-center rounded-full px-5 font-semibold"
                  >
                    Order
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {ordering ? (
        <MenuItemOrderDialog
          item={ordering.item}
          catalog={catalog ?? undefined}
          categoryName={ordering.categoryName}
          onClose={() => setOrdering(null)}
        />
      ) : null}
    </Container>
  );
}
