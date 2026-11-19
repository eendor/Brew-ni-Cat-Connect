/**
 * Ratings for each menu item (FR-121).
 *
 * Everyone reads the averages through `public.item_rating_summary()`. A
 * signed-in customer rates an item from a completed order through
 * `public.rate_item()`, which also refuses the shop-only items, and reads back
 * only their own ratings.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { getPublicSupabaseClient } from "@/lib/supabase/public-client";

export type ItemRatingSummary = Readonly<{
  average: number;
  count: number;
}>;

export type RateItemResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>;

const RATE_ERRORS: Readonly<Record<string, string>> = {
  unauthorized: "Sign in to rate items.",
  invalid_rating: "Choose 1 to 5 stars.",
  not_rateable: "This item can't be rated.",
  not_ordered: "You can rate an item after an order with it is completed.",
};

/** Each rated item's average and count, by item ID. */
export async function fetchItemRatings(
  client: SupabaseClient = getPublicSupabaseClient(),
): Promise<Map<string, ItemRatingSummary>> {
  const { data, error } = await client.rpc("item_rating_summary");
  if (error) throw new Error(error.message);
  const ratings = new Map<string, ItemRatingSummary>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const average = Number(row.average);
    const count = Number(row.rating_count);
    if (typeof row.item_id === "string" && count > 0 && average > 0) {
      ratings.set(row.item_id, { average, count });
    }
  }
  return ratings;
}

/** The signed-in customer's own ratings, by item ID. */
export async function fetchMyItemRatings(
  userId: string,
  client: SupabaseClient = getAuthSupabaseClient(),
): Promise<Map<string, number>> {
  const { data, error } = await client
    .from("item_ratings")
    .select("item_id, rating")
    .eq("customer_id", userId);
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).map((row) => [String(row.item_id), Number(row.rating)]),
  );
}

export async function rateItem(
  itemId: string,
  rating: number,
  client: SupabaseClient = getAuthSupabaseClient(),
): Promise<RateItemResult> {
  const { data, error } = await client.rpc("rate_item", {
    p_item_id: itemId,
    p_rating: rating,
  });
  if (error) {
    return { ok: false, message: "We couldn't save your rating. Try again." };
  }
  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message:
      RATE_ERRORS[result.error ?? ""] ??
      "We couldn't save your rating. Try again.",
  };
}
