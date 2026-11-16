/**
 * Review data models and responses (FR-098).
 */

export type Review = Readonly<{
  id: string;
  displayName: string;
  rating: number; // 1 to 5
  body: string;
  hidden: boolean;
  /** Google profile photo, only when the customer chose to show it (FR-119). */
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type RawReviewRow = Readonly<{
  id: string;
  display_name: string;
  rating: number;
  body: string;
  hidden: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}>;

export type PostReviewInput = Readonly<{
  rating: number;
  body: string;
  /** Show the customer's Google photo with the review. Defaults to true. */
  showPhoto?: boolean;
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
