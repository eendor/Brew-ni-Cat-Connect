import { ReviewCard } from "@/components/reviews/review-card";
import { StarDisplay } from "@/components/reviews/star-rating";
import { EMPTY_REVIEWS_MESSAGE } from "@/lib/reviews/constants";
import type { Review } from "@/lib/reviews/types";

export type ReviewsListProps = Readonly<{
  reviews: readonly Review[];
  totalCount: number;
  averageRating: number;
  isLoading: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}>;

export function ReviewsList({
  reviews,
  totalCount,
  averageRating,
  isLoading,
  isLoadingMore = false,
  error,
  onRetry,
  onLoadMore,
  hasMore = false,
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <div
        className="ios-card flex flex-col items-center justify-center p-12 text-center"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--separator)] border-t-[var(--accent-solid)]" />
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Loading customer reviews...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="ios-card flex flex-col items-center justify-center p-8 text-center sm:p-12"
        role="alert"
      >
        <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="button-secondary mt-4 text-sm"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (totalCount === 0 || reviews.length === 0) {
    return (
      <div className="ios-card p-8 text-center sm:p-12">
        <p className="text-base font-medium text-[var(--text-strong)] sm:text-lg">
          {EMPTY_REVIEWS_MESSAGE}
        </p>
        <p className="mt-1.5 text-xs text-[var(--text-muted)] sm:text-sm">
          Have you enjoyed our coffee or Takoyaki? Leave our first review below!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Scorecard */}
      <div className="ios-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl font-extrabold text-[var(--text-strong)] sm:text-4xl">
            {averageRating.toFixed(1)}
          </span>
          <div className="space-y-0.5">
            <StarDisplay rating={averageRating} sizeClass="h-5 w-5" />
            <p className="text-xs text-[var(--text-muted)]">
              Based on {totalCount} {totalCount === 1 ? "review" : "reviews"}
            </p>
          </div>
        </div>
      </div>

      {/* Review cards */}
      <div
        className="grid gap-4 sm:gap-5"
        role="feed"
        aria-label="Customer reviews"
      >
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Show more button */}
      {hasMore && onLoadMore ? (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="button-secondary"
          >
            {isLoadingMore ? "Loading..." : "Show more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
