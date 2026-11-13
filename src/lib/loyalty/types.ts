export type RewardItem = Readonly<{
  id: string;
  name: string;
  description: string;
  points: number;
}>;

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
