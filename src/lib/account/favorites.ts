/**
 * Customer favorites data service (FR-040).
 *
 * Reads and writes `public.favorites`. RLS limits every call to the signed-in
 * customer's own rows. The table stores only item IDs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

/** Postgres "unique_violation": the item is already a favorite. */
const UNIQUE_VIOLATION = "23505";

export type Favorite = Readonly<{
  itemId: string;
  createdAt: string;
}>;

type FavoriteOptions = Readonly<{
  userId: string;
  client?: SupabaseClient;
}>;

type FavoriteItemOptions = FavoriteOptions & Readonly<{ itemId: string }>;

export async function fetchFavorites({
  userId,
  client,
}: FavoriteOptions): Promise<Favorite[]> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id, created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    itemId: row.item_id,
    createdAt: row.created_at,
  }));
}

/** Adding is idempotent: saving an item twice is not an error. */
export async function addFavorite({
  userId,
  itemId,
  client,
}: FavoriteItemOptions): Promise<void> {
  const supabase = client ?? getAuthSupabaseClient();

  const { error } = await supabase
    .from("favorites")
    .insert({ customer_id: userId, item_id: itemId });

  if (error && error.code !== UNIQUE_VIOLATION) {
    throw new Error(error.message);
  }
}

export async function removeFavorite({
  userId,
  itemId,
  client,
}: FavoriteItemOptions): Promise<void> {
  const supabase = client ?? getAuthSupabaseClient();

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("customer_id", userId)
    .eq("item_id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}
