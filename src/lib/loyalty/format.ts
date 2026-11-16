import { formatPrice } from "@/lib/menu/format-price";
import type {
  LoyaltyReason,
  RewardCode,
  RewardCodeStatus,
  RewardItem,
} from "./types";

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
    case "mini-game":
      return note && note.trim().length > 0 ? note.trim() : "Mini-game";
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

/** Whether a code can still be used at the counter (FR-091). */
export function rewardCodeStatus(
  code: Pick<RewardCode, "expiresAt" | "redeemedAt">,
  now: Date = new Date(),
): RewardCodeStatus {
  if (code.redeemedAt) return "used";
  if (Date.parse(code.expiresAt) <= now.getTime()) return "expired";
  return "ready";
}

/** Why a reward can't be redeemed today, in plain words, or null (FR-088). */
export function formatRewardAvailability(
  reward: Pick<RewardItem, "stockLeft" | "unavailable">,
): string | null {
  switch (reward.unavailable) {
    case "out_of_stock":
      return "Sold out";
    case "daily_limit_reached":
      return "All claimed today. Back tomorrow";
    case "reward_inactive":
      return "Not available";
    default:
      break;
  }
  if (typeof reward.stockLeft === "number" && reward.stockLeft <= 5) {
    return `Only ${reward.stockLeft} left`;
  }
  return null;
}

/** The message for a refused redemption. */
export function formatRedeemError(
  error: string,
  details: Readonly<{ weeklyLimit?: number; required?: number }> = {},
): string {
  switch (error) {
    case "weekly_limit_reached":
      return `You have reached your weekly redemption limit (${details.weeklyLimit ?? 2} per week). Please try again next week.`;
    case "insufficient_points":
      return `Insufficient points. You need ${details.required ?? "more"} points for this reward.`;
    case "out_of_stock":
      return "Sorry, this reward just sold out. Your points weren't used.";
    case "daily_limit_reached":
      return "This reward is all claimed for today. Try again tomorrow. Your points weren't used.";
    case "reward_inactive":
    case "reward_not_found":
      return "This reward isn't available anymore. Your points weren't used.";
    default:
      return error || "Redemption could not be processed. Please try again.";
  }
}
