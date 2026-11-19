import { formatPrice } from "@/lib/menu/format-price";
import type {
  LoyaltyReason,
  RewardCode,
  RewardCodeStatus,
  RewardItem,
} from "./types";

/**
 * Coins keep one decimal place (decided 2026-11-19). Sums of 0.1s in
 * JavaScript drift (0.1 + 0.2 = 0.30000000000000004), so every coin amount
 * is rounded to 0.1 before it is shown or compared.
 */
export function roundCoins(coins: number): number {
  return Math.round(coins * 10) / 10;
}

/** "1 coin", "2.5 coins", "0.1 coins". */
export function formatCoins(coins: number): string {
  const rounded = roundCoins(coins);
  return `${rounded} ${rounded === 1 ? "coin" : "coins"}`;
}

/**
 * Formats a coin delta with an explicit leading sign:
 * + for positive, − (minus sign) for negative.
 */
export function formatPointsDelta(points: number): string {
  const coins = roundCoins(points);
  if (coins > 0) {
    return `+${coins}`;
  }
  if (coins < 0) {
    return `−${Math.abs(coins)}`;
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
      return note && note.trim().length > 0 ? note.trim() : "Coins adjustment";
    default:
      return "Coins update";
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
 * Explains the coin earning rule in plain words using formatPrice.
 */
export function formatEarningRule(
  currencyStep: number,
  pointsPerStep = 1,
): string {
  return `Earn ${formatCoins(pointsPerStep)} for every ${formatPrice(currencyStep)} spent on completed orders, counted to 0.1 of a coin.`;
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
      return `Not enough coins. You need ${details.required ?? "more"} coins for this reward.`;
    case "out_of_stock":
      return "Sorry, this reward just sold out. Your coins weren't used.";
    case "daily_limit_reached":
      return "This reward is all claimed for today. Try again tomorrow. Your coins weren't used.";
    case "reward_inactive":
    case "reward_not_found":
      return "This reward isn't available anymore. Your coins weren't used.";
    default:
      return error || "Redemption could not be processed. Please try again.";
  }
}
