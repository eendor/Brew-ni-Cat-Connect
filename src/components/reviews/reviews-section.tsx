"use client";

import { useCallback, useEffect, useState } from "react";

import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { REVIEWS_PAGE_SIZE } from "@/lib/reviews/constants";
import { fetchReviews } from "@/lib/reviews/service";
import type { Review } from "@/lib/reviews/types";

export function ReviewsSection() {
  const [reviews, setReviews] = useState<readonly Review[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchReviews({ page: 0, pageSize: REVIEWS_PAGE_SIZE })
      .then((data) => {
        if (!active) return;
        setReviews(data.reviews);
        setTotalCount(data.totalCount);
        setAverageRating(data.averageRating);
        setPage(0);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(
          "Unable to load reviews. Please check your internet connection.",
        );
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReviews({ page: 0, pageSize: REVIEWS_PAGE_SIZE });
      setReviews(data.reviews);
      setTotalCount(data.totalCount);
      setAverageRating(data.averageRating);
      setPage(0);
    } catch {
      setError(
        "Unable to load reviews. Please check your internet connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await fetchReviews({
        page: nextPage,
        pageSize: REVIEWS_PAGE_SIZE,
      });
      setReviews((prev) => [...prev, ...data.reviews]);
      setPage(nextPage);
    } catch {
      // Ignore load more error
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleReviewPosted = (newReview: Review) => {
    setReviews((prev) => {
      const existsIndex = prev.findIndex((r) => r.id === newReview.id);
      if (existsIndex >= 0) {
        // Edit existing review
        const updated = [...prev];
        updated[existsIndex] = newReview;
        return updated;
      }
      // Prepend new review
      return [newReview, ...prev];
    });

    // Refresh totals and average by reloading or estimating
    setTotalCount((prev) => {
      const exists = reviews.some((r) => r.id === newReview.id);
      return exists ? prev : prev + 1;
    });

    // Re-fetch to get exact db-computed averages
    fetchReviews({ page: 0, pageSize: (page + 1) * REVIEWS_PAGE_SIZE })
      .then((data) => {
        setTotalCount(data.totalCount);
        setAverageRating(data.averageRating);
      })
      .catch(() => {
        // Ignore background refresh failure
      });
  };

  const hasMore = reviews.length < totalCount;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="py-16 sm:py-20 lg:py-24"
    >
      <Container className="space-y-12">
        <div>
          <SectionHeading
            id="reviews-heading"
            eyebrow="Community voices"
            title="Customer ratings and reviews"
            description="Read honest impressions from our guests or leave your own review about your visit to Brew ni Cat."
          />
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          {/* Reviews list */}
          <ReviewsList
            reviews={reviews}
            totalCount={totalCount}
            averageRating={averageRating}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            error={error}
            onRetry={loadInitial}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />

          {/* Review submission form */}
          <div className="lg:sticky lg:top-24">
            <ReviewForm onReviewPosted={handleReviewPosted} />
          </div>
        </div>
      </Container>
    </section>
  );
}
