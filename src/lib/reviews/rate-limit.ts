/**
 * Rate limit for `POST /api/reviews` (FR-098).
 *
 * Uses the per-IP rate limiter utility from orders.
 */

import { clientKey, createRateLimiter } from "@/lib/orders/rate-limit";
import {
  REVIEW_RATE_LIMIT,
  REVIEW_RATE_WINDOW_MS,
} from "@/lib/reviews/constants";

export { clientKey };

export const reviewRateLimiter = createRateLimiter(
  REVIEW_RATE_LIMIT,
  REVIEW_RATE_WINDOW_MS,
);
