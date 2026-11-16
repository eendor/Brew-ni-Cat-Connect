export type RewardItem = Readonly<{
  id: string;
  name: string;
  description: string;
  points: number;
  /** How many are left, or null when the owner set no stock (FR-088). */
  stockLeft?: number | null;
  /** Codes a day for everyone, or null for no limit (FR-088). */
  dailyLimit?: number | null;
  /** Why it can't be redeemed today, or null when it can. */
  unavailable?: RewardUnavailable | null;
}>;

export type RewardUnavailable =
  "out_of_stock" | "daily_limit_reached" | "reward_inactive";

/** A one-time code for a redeemed reward or a won prize (FR-091). */
export type RewardCode = Readonly<{
  code: string;
  rewardName: string;
  source: "points" | "mini-game";
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
}>;

export type RewardCodeStatus = "ready" | "used" | "expired";

export type LoyaltyProgramSettings = Readonly<{
  currencyStep: number;
  pointsPerStep: number;
  weeklyLimit: number;
}>;

export type LoyaltyReason =
  "order-completed" | "reward-redeemed" | "adjustment" | "mini-game";

export type LoyaltyTransaction = Readonly<{
  id: number;
  customerId: string;
  points: number;
  reason: LoyaltyReason;
  orderId: string | null;
  orderReference: string | null;
  note: string | null;
  createdAt: string;
}>;

export type RedeemSuccess = Readonly<{
  ok: true;
  code: string;
  /** When the code stops working; missing before the FR-091 migration. */
  expiresAt?: string;
  rewardName: string;
  pointsSpent: number;
  newBalance: number;
}>;

export type RedeemFailure = Readonly<{
  ok: false;
  error: string;
  balance?: number;
  required?: number;
  weeklyLimit?: number;
  redeemedThisWeek?: number;
}>;

export type RedeemResult = RedeemSuccess | RedeemFailure;
