"use client";

import { useAuth } from "@/context/auth-context";
import { useFavorites } from "@/context/favorites-context";

type FavoriteButtonProps = Readonly<{
  itemId: string;
  itemName: string;
  className?: string;
}>;

/** Heart toggle for signed-in customers (FR-040). Hidden when signed out. */
export function FavoriteButton({
  itemId,
  itemName,
  className,
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isLoaded, isFavorite, toggleFavorite } = useFavorites();

  if (!user) return null;

  const saved = isFavorite(itemId);

  return (
    <button
      type="button"
      onClick={() => void toggleFavorite(itemId)}
      disabled={!isLoaded}
      aria-pressed={saved}
      aria-label={`Save ${itemName} to favorites`}
      className={`favorite-button${className ? ` ${className}` : ""}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-4.35-9.5-8.5C.9 9.6 2.3 5.5 6.1 5.1 8.4 4.9 10.6 6.2 12 8.2c1.4-2 3.6-3.3 5.9-3.1 3.8.4 5.2 4.5 3.6 7.4C19 16.65 12 21 12 21Z" />
      </svg>
    </button>
  );
}
