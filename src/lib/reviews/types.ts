/**
 * Review data models and responses (FR-098).
 */

export type Review = Readonly<{
  id: string;
  displayName: string;
  rating: number; // 1 to 5
  body: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type RawReviewRow = Readonly<{
  id: string;
  display_name: string;
  rating: number;
  body: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}>;

export type PostReviewInput = Readonly<{
  rating: number;
  body: string;
}>;

export type PostReviewSuccess = Readonly<{
  ok: true;
  review: Review;
}>;

export type PostReviewFailure = Readonly<{
  ok: false;
  error: string;
  message: string;
  retryAfterSeconds?: number;
}>;

export type PostReviewResult = PostReviewSuccess | PostReviewFailure;

export type ReviewsData = Readonly<{
  reviews: readonly Review[];
  totalCount: number;
  averageRating: number;
}>;
