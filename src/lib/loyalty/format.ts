import { formatPrice } from "@/lib/menu/format-price";
import type { LoyaltyReason } from "./types";

/**
 * Formats a point delta with an explicit leading sign:
 * + for positive, − (minus sign) for negative.
 */
export function formatPointsDelta(points: number): string {
  if (points > 0) {
    return `+${points}`;
  }
  if (points < 0) {
    return `−${Math.abs(points)}`;
  }
  return "0";
}

/**
 * Human-readable plain wording for transaction reasons.
 */
export function formatReason(
  reason: LoyaltyReason,
  note?: string | null,
): string {
  switch (reason) {
    case "order-completed":
      return "Order completed";
    case "reward-redeemed":
      return "Reward redeemed";
    case "adjustment":
      return note && note.trim().length > 0 ? note.trim() : "Points adjustment";
    default:
      return "Points update";
  }
}

/**
 * Formats an ISO date string into a friendly date display.
 */
export function formatLoyaltyDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Explains the points earning rule in plain words using formatPrice.
 */
export function formatEarningRule(
  currencyStep: number,
  pointsPerStep = 1,
): string {
  const pointsLabel = pointsPerStep === 1 ? "point" : "points";
  return `Earn ${pointsPerStep} ${pointsLabel} for every ${formatPrice(currencyStep)} spent on completed orders.`;
}

/**
 * Explains the weekly reward redemption limit in plain words.
 */
export function formatWeeklyLimit(weeklyLimit: number): string {
  const limitLabel = weeklyLimit === 1 ? "reward" : "rewards";
  return `Redeem up to ${weeklyLimit} ${limitLabel} per week.`;
}
