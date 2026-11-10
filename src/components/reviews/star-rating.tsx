import type { ComponentPropsWithoutRef } from "react";

export function StarIcon({
  filled,
  className = "h-5 w-5",
  ...props
}: { filled: boolean; className?: string } & ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? "0" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function StarDisplay({
  rating,
  className = "flex items-center gap-0.5 text-amber-500",
  sizeClass = "h-4 w-4",
}: {
  rating: number;
  className?: string;
  sizeClass?: string;
}) {
  return (
    <div
      className={className}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          filled={star <= Math.round(rating)}
          className={`${sizeClass} ${star <= Math.round(rating) ? "text-amber-500" : "text-[var(--text-faint)] opacity-40"}`}
        />
      ))}
    </div>
  );
}

export function StarRatingPicker({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="ios-label block font-medium text-[var(--text-strong)]">
        Rating <span className="text-[var(--danger)]">*</span>
      </legend>
      <div
        className="flex items-center gap-1.5 pt-1"
        role="radiogroup"
        aria-label="Rating out of 5 stars"
        aria-invalid={error ? "true" : "false"}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isSelected = value === star;
          const isFilled = star <= value;
          return (
            <label
              key={star}
              htmlFor={`review-rating-${star}`}
              className={`cursor-pointer rounded-lg p-1 transition-transform hover:scale-110 active:scale-95 ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <input
                type="radio"
                id={`review-rating-${star}`}
                name="rating"
                value={star}
                checked={isSelected}
                onChange={() => onChange(star)}
                disabled={disabled}
                className="sr-only"
                aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
              />
              <StarIcon
                filled={isFilled}
                className={`pointer-events-none h-7 w-7 transition-colors ${
                  isFilled
                    ? "text-amber-500"
                    : "text-[var(--text-faint)] hover:text-amber-300"
                }`}
              />
              <span className="sr-only">
                {star} {star === 1 ? "star" : "stars"}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
