"use client";

import { StarIcon } from "@/components/reviews/star-rating";

type ItemRatingControlProps = Readonly<{
  itemName: string;
  value: number;
  disabled?: boolean;
  onRate: (rating: number) => void;
}>;

/** Five star buttons for rating one item from a completed order (FR-121). */
export function ItemRatingControl({
  itemName,
  value,
  disabled = false,
  onRate,
}: ItemRatingControlProps) {
  return (
    <div
      role="group"
      aria-label={`Rate ${itemName}`}
      className="flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onRate(star)}
            aria-pressed={value === star}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            className="inline-flex size-11 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
          >
            <StarIcon
              filled={filled}
              className={`size-5 ${filled ? "text-amber-500" : "text-[var(--text-faint)]"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
