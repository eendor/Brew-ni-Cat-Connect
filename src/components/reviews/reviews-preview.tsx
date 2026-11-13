"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReviewCard } from "@/components/reviews/review-card";
import { StarDisplay } from "@/components/reviews/star-rating";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { EMPTY_REVIEWS_MESSAGE } from "@/lib/reviews/constants";
import { fetchReviews } from "@/lib/reviews/service";
import type { ReviewsData } from "@/lib/reviews/types";

/** How many of the newest reviews the home page shows. */
export const HOME_REVIEW_COUNT = 3;

/**
 * The newest reviews and the average rating on the home page (FR-098), so
 * customers find the reviews without opening the About page. The full list
 * and the form are on `/reviews`. If the reviews can't load, only the
 * two links show.
 */
export function ReviewsPreview() {
  const [data, setData] = useState<ReviewsData | null>(null);

  useEffect(() => {
    let active = true;
    fetchReviews({ page: 0, pageSize: HOME_REVIEW_COUNT })
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        // the links below still lead to the reviews
      });
    return () => {
      active = false;
    };
  }, []);

  const average = data ? Math.round(data.averageRating * 10) / 10 : 0;

  return (
    <section
      className="py-16 sm:py-20"
      aria-labelledby="home-reviews-heading"
      data-testid="home-reviews"
    >
      <Container className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="home-reviews-heading"
            eyebrow="Reviews"
            title="What customers say"
          />
          {data && data.totalCount > 0 ? (
            <div className="flex items-center gap-3 text-[var(--text-strong)]">
              <span className="font-display text-3xl">
                {average.toFixed(1)}
              </span>
              <StarDisplay rating={average} sizeClass="h-5 w-5" />
              <span className="text-sm text-[var(--text-muted)]">
                {data.totalCount} {data.totalCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : null}
        </div>

        {data && data.reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {data.reviews.slice(0, HOME_REVIEW_COUNT).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : data ? (
          <p className="text-[var(--text-muted)]">{EMPTY_REVIEWS_MESSAGE}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/reviews" className="button-primary">
            Leave a review
          </Link>
          {data && data.totalCount > 0 ? (
            <Link href="/reviews" className="button-ghost">
              Read all reviews
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
