/**
 * Rate limit for `POST /api/orders` (security-and-privacy §18.6).
 *
 * A fixed window per client address: up to `ORDER_RATE_LIMIT` attempts in
 * `ORDER_RATE_WINDOW_MS`. The counts live in the server's memory, so each
 * server instance counts on its own. That is enough to stop one browser or
 * script from flooding the shop with orders; it is not a shared quota.
 */

export const ORDER_RATE_LIMIT = 5;
export const ORDER_RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 5000;

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Window = { startedAt: number; count: number };

export function createRateLimiter(
  limit: number = ORDER_RATE_LIMIT,
  windowMs: number = ORDER_RATE_WINDOW_MS,
) {
  const windows = new Map<string, Window>();

  function prune(now: number): void {
    for (const [key, entry] of windows) {
      if (now - entry.startedAt >= windowMs) windows.delete(key);
    }
  }

  return {
    check(key: string, now: number = Date.now()): RateLimitDecision {
      let entry = windows.get(key);
      if (!entry || now - entry.startedAt >= windowMs) {
        if (windows.size >= MAX_TRACKED_CLIENTS) prune(now);
        entry = { startedAt: now, count: 0 };
        windows.set(key, entry);
      }
      if (entry.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((entry.startedAt + windowMs - now) / 1000),
          ),
        };
      }
      entry.count += 1;
      return { allowed: true };
    },
    reset(): void {
      windows.clear();
    },
  };
}

/** The client address from the hosting proxy's headers, or "unknown". */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export const orderRateLimiter = createRateLimiter();

export const RATE_LIMITED_MESSAGE =
  "Too many orders from this device. Please wait a few minutes and try again.";
