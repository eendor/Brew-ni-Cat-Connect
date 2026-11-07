"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "@/lib/account/favorites";

type FavoriteButtonProps = Readonly<{
  itemId: string;
  itemName: string;
}>;

/** Heart toggle for signed-in customers (FR-040). Hidden when signed out. */
export function FavoriteButton({ itemId, itemName }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    fetchFavorites({ userId: user.id })
      .then((favorites) => {
        if (active) {
          setIsFavorite(favorites.some((f) => f.itemId === itemId));
        }
      })
      .catch(() => {
        // Keep the heart unsaved if favorites can't load.
      });

    return () => {
      active = false;
    };
  }, [user, itemId]);

  if (!user) return null;

  const toggle = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) {
        await addFavorite({ userId: user.id, itemId });
      } else {
        await removeFavorite({ userId: user.id, itemId });
      }
    } catch {
      setIsFavorite(!next);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFavorite}
      aria-label={`Save ${itemName} to favorites`}
      className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--separator)] text-lg text-[var(--accent-solid)] transition-colors hover:bg-[var(--glass-hover)]"
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
