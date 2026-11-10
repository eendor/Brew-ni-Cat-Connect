import { StarDisplay } from "@/components/reviews/star-rating";
import { formatReviewDate } from "@/lib/reviews/service";
import type { Review } from "@/lib/reviews/types";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="ios-card flex flex-col justify-between p-5 text-[var(--text-strong)] transition-all hover:border-[var(--glass-stroke-strong)] sm:p-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--separator)] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-strong)]">
              {review.displayName}
            </span>
            <span
              className="text-xs text-[var(--text-faint)]"
              aria-hidden="true"
            >
              •
            </span>
            <time
              dateTime={review.createdAt}
              className="text-xs text-[var(--text-muted)]"
            >
              {formatReviewDate(review.createdAt)}
            </time>
          </div>
          <StarDisplay rating={review.rating} />
        </div>
        <p className="mt-3.5 whitespace-pre-line text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
          {review.body}
        </p>
      </div>
    </article>
  );
}
