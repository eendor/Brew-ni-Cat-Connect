/**
 * Loyalty points and rewards data service (Phase 5, FR-050 to FR-055).
 *
 * Reads transactions, balance, active rewards, and program settings.
 * RLS ensures customers can only read their own loyalty transactions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { roundCoins } from "@/lib/loyalty/format";
import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";
import type {
  LoyaltyProgramSettings,
  LoyaltyReason,
  LoyaltyTransaction,
  RedeemResult,
  RewardCode,
  RewardItem,
} from "./types";

type UserQueryOptions = Readonly<{
  userId: string;
  client?: SupabaseClient;
}>;

type RawTransactionRow = {
  id: number;
  customer_id: string;
  points: number;
  reason: string;
  order_id: string | null;
  note: string | null;
  created_at: string;
  online_orders: { reference: string } | { reference: string }[] | null;
};

/**
 * Calculates the customer's coin balance, to 0.1 of a coin.
 */
export async function fetchLoyaltyBalance({
  userId,
  client,
}: UserQueryOptions): Promise<number> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("points")
    .eq("customer_id", userId);

  if (error) {
    throw new Error(`Failed to load loyalty balance: ${error.message}`);
  }

  return roundCoins(
    (data ?? []).reduce((sum, row) => sum + (Number(row.points) || 0), 0),
  );
}

/**
 * Retrieves the customer's loyalty transaction history, newest first.
 */
export async function fetchLoyaltyHistory({
  userId,
  client,
}: UserQueryOptions): Promise<readonly LoyaltyTransaction[]> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select(
      "id, customer_id, points, reason, order_id, note, created_at, online_orders(reference)",
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load loyalty history: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawTransactionRow[];

  return rows.map((row) => {
    let orderRef: string | null = null;
    if (row.online_orders) {
      if (Array.isArray(row.online_orders)) {
        orderRef = row.online_orders[0]?.reference ?? null;
      } else {
        orderRef = row.online_orders.reference ?? null;
      }
    }

    return {
      id: row.id,
      customerId: row.customer_id,
      points: Number(row.points),
      reason: row.reason as LoyaltyReason,
      orderId: row.order_id,
      orderReference: orderRef,
      note: row.note,
      createdAt: row.created_at,
    };
  });
}

/**
 * Fetches the active rewards catalog from public.loyalty_rewards().
 */
export async function fetchLoyaltyRewards(
  client?: SupabaseClient,
): Promise<readonly RewardItem[]> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase.rpc("loyalty_rewards");

  if (error) {
    throw new Error(`Failed to load rewards: ${error.message}`);
  }

  return (data ?? []) as RewardItem[];
}

/**
 * Fetches the program rules and settings from public.loyalty_settings().
 */
export async function fetchLoyaltySettings(
  client?: SupabaseClient,
): Promise<LoyaltyProgramSettings> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase.rpc("loyalty_settings");

  if (error) {
    throw new Error(`Failed to load loyalty settings: ${error.message}`);
  }

  const result = data as {
    currencyStep?: number;
    pointsPerStep?: number;
    weeklyLimit?: number;
  };

  return {
    currencyStep: Number(result?.currencyStep ?? 50),
    pointsPerStep: Number(result?.pointsPerStep ?? 1),
    weeklyLimit: Number(result?.weeklyLimit ?? 2),
  };
}

/**
 * Redeems an active reward using the customer's loyalty balance.
 */
export async function redeemReward(
  rewardId: string,
  client?: SupabaseClient,
): Promise<RedeemResult> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase.rpc("redeem_reward", {
    p_reward_id: rewardId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return data as RedeemResult;
}

type RawCodeRow = {
  code: string;
  reward_name: string;
  source: "points" | "mini-game";
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
};

/** PostgREST answers PGRST205 (or 42P01) when a table doesn't exist. */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table/i.test(error.message ?? "")
  );
}

/**
 * The customer's reward and prize codes, newest first (FR-091). Before the
 * codes migration is on the database there are none to show.
 */
export async function fetchRewardCodes({
  userId,
  client,
}: UserQueryOptions): Promise<readonly RewardCode[]> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("reward_codes")
    .select("code, reward_name, source, created_at, expires_at, redeemed_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(`Failed to load your codes: ${error.message}`);
  }

  return ((data ?? []) as RawCodeRow[]).map((row) => ({
    code: row.code,
    rewardName: row.reward_name,
    source: row.source,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    redeemedAt: row.redeemed_at,
  }));
}
