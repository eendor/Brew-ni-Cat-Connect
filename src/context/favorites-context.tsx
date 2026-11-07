"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/context/auth-context";
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
  type Favorite,
} from "@/lib/account/favorites";

export type FavoritesContextValue = Readonly<{
  /** The signed-in customer's saved items, newest first. */
  favorites: readonly Favorite[];
  /** False while the saved items are loading or nobody is signed in. */
  isLoaded: boolean;
  isFavorite: (itemId: string) => boolean;
  /** Saves or removes the item, and puts the heart back if that fails. */
  toggleFavorite: (itemId: string) => Promise<void>;
}>;

type LoadedFavorites = Readonly<{
  userId: string;
  favorites: readonly Favorite[];
}>;

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const signedOutValue: FavoritesContextValue = {
  favorites: [],
  isLoaded: false,
  isFavorite: () => false,
  toggleFavorite: async () => {},
};

function newestFirst(a: Favorite, b: Favorite) {
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * Loads the signed-in customer's favorites once and shares them, so every
 * heart on the menu reads the same list instead of querying on its own
 * (FR-040).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<LoadedFavorites | null>(null);
  const pending = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    let active = true;

    fetchFavorites({ userId })
      .then((favorites) => {
        if (active) setLoaded({ userId, favorites });
      })
      .catch(() => {
        // Hearts start empty; saving still works because adding is idempotent.
        if (active) setLoaded({ userId, favorites: [] });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  // A list loaded for someone else is never shown after an account switch.
  const current = userId && loaded?.userId === userId ? loaded : null;
  const favorites = useMemo(() => current?.favorites ?? [], [current]);

  const isFavorite = useCallback(
    (itemId: string) => favorites.some((entry) => entry.itemId === itemId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (itemId: string) => {
      if (!userId || !current || pending.current.has(itemId)) return;
      const existing = favorites.find((entry) => entry.itemId === itemId);
      const update = (change: (list: readonly Favorite[]) => Favorite[]) =>
        setLoaded((previous) =>
          previous?.userId === userId
            ? { userId, favorites: change(previous.favorites) }
            : previous,
        );
      const withoutItem = (list: readonly Favorite[]) =>
        list.filter((entry) => entry.itemId !== itemId);

      pending.current.add(itemId);
      if (existing) {
        update(withoutItem);
      } else {
        const saved = { itemId, createdAt: new Date().toISOString() };
        update((list) => [saved, ...withoutItem(list)]);
      }

      try {
        if (existing) {
          await removeFavorite({ userId, itemId });
        } else {
          await addFavorite({ userId, itemId });
        }
      } catch {
        if (existing) {
          update((list) => [...withoutItem(list), existing].sort(newestFirst));
        } else {
          update(withoutItem);
        }
      } finally {
        pending.current.delete(itemId);
      }
    },
    [userId, current, favorites],
  );

  const value = useMemo<FavoritesContextValue>(
    () =>
      current
        ? { favorites, isLoaded: true, isFavorite, toggleFavorite }
        : signedOutValue,
    [current, favorites, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  return useContext(FavoritesContext) ?? signedOutValue;
}
