/**
 * Client and server helpers for ratings and reviews (FR-098).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  REVIEWS_PAGE_SIZE,
  REVIEW_ERROR_MESSAGES,
  REVIEW_MAX_LENGTH,
} from "@/lib/reviews/constants";
import type {
  PostReviewInput,
  PostReviewResult,
  RawReviewRow,
  Review,
  ReviewsData,
} from "@/lib/reviews/types";
import { getPublicSupabaseClient } from "@/lib/supabase/public-client";

export function normalizeReview(row: RawReviewRow): Review {
  return {
    id: row.id,
    displayName: row.display_name,
    rating: row.rating,
    body: row.body,
    hidden: row.hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatReviewDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return dateString;
  }
}

export type ReviewInputValidation =
  | { ok: true; data: PostReviewInput }
  | { ok: false; error: string; message: string };

export function validateReviewInput(input: unknown): ReviewInputValidation {
  if (typeof input !== "object" || input === null) {
    return {
      ok: false,
      error: "invalid-input",
      message: "Invalid review request.",
    };
  }

  const { rating, body } = input as Record<string, unknown>;

  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return {
      ok: false,
      error: "invalid-rating",
      message: REVIEW_ERROR_MESSAGES.ratingRequired,
    };
  }

  if (typeof body !== "string") {
    return {
      ok: false,
      error: "invalid-body",
      message: REVIEW_ERROR_MESSAGES.textEmpty,
    };
  }

  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: "empty-body",
      message: REVIEW_ERROR_MESSAGES.textEmpty,
    };
  }

  if (trimmed.length > REVIEW_MAX_LENGTH) {
    return {
      ok: false,
      error: "body-too-long",
      message: REVIEW_ERROR_MESSAGES.textTooLong,
    };
  }

  return {
    ok: true,
    data: {
      rating,
      body: trimmed,
    },
  };
}

export async function fetchReviews({
  page = 0,
  pageSize = REVIEWS_PAGE_SIZE,
  client,
}: {
  page?: number;
  pageSize?: number;
  client?: SupabaseClient;
} = {}): Promise<ReviewsData> {
  const supabase = client ?? getPublicSupabaseClient();
  const start = page * pageSize;
  const end = start + pageSize - 1;

  // Fetch paginated reviews
  const {
    data: rows,
    count,
    error,
  } = await supabase
    .from("reviews")
    .select("id, display_name, rating, body, hidden, created_at, updated_at", {
      count: "exact",
    })
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) {
    throw new Error(error.message);
  }

  // Fetch all ratings for exact average rating calculation
  const { data: ratingRows, error: ratingError } = await supabase
    .from("reviews")
    .select("rating")
    .eq("hidden", false);

  if (ratingError) {
    throw new Error(ratingError.message);
  }

  const totalCount = count ?? ratingRows?.length ?? 0;
  let averageRating = 0;
  if (ratingRows && ratingRows.length > 0) {
    const sum = ratingRows.reduce((acc, row) => acc + (row.rating ?? 0), 0);
    averageRating = Number((sum / ratingRows.length).toFixed(1));
  }

  return {
    reviews: (rows as RawReviewRow[] | null)?.map(normalizeReview) ?? [],
    totalCount,
    averageRating,
  };
}

export async function fetchMyReview({
  token,
  client,
}: {
  token?: string | null;
  client?: SupabaseClient;
} = {}): Promise<Review | null> {
  const supabase = client ?? getPublicSupabaseClient(token);
  const { data, error } = await supabase.rpc("my_review");

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeReview(data as RawReviewRow);
}

export async function submitReview(
  input: PostReviewInput,
  token?: string | null,
): Promise<PostReviewResult> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    const result = await response.json();
    return result as PostReviewResult;
  } catch {
    return {
      ok: false,
      error: "network-error",
      message: REVIEW_ERROR_MESSAGES.networkError,
    };
  }
}
