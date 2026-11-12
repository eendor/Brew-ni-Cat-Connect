/**
 * Constants for customer reviews (FR-098).
 */

export const REVIEW_RATE_LIMIT = 3;
export const REVIEW_RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const REVIEW_MAX_LENGTH = 500;
export const REVIEWS_PAGE_SIZE = 10;

export const RATE_LIMITED_MESSAGE =
  "Too many reviews from this device. Please wait a few minutes and try again.";

export const REVIEW_ERROR_MESSAGES = {
  ratingRequired: "Please select a star rating between 1 and 5.",
  textEmpty: "Please enter your review.",
  textTooLong: `Please keep your review to ${REVIEW_MAX_LENGTH} characters or fewer.`,
  rateLimited: RATE_LIMITED_MESSAGE,
  unauthorized: "Your session has expired. Please sign in again.",
  networkError: "Unable to connect. Please check your internet connection.",
  serverError: "We couldn't save your review. Please try again later.",
  guestFlood:
    "Too many guest reviews. Please wait a few minutes and try again.",
} as const;

export const EMPTY_REVIEWS_MESSAGE = "No reviews yet. Be the first.";
