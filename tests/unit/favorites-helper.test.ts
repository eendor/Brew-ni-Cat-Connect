import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "@/lib/account/favorites";

function createClient(overrides: {
  insertError?: { code: string; message: string } | null;
}) {
  const order = vi.fn().mockResolvedValue({
    data: [{ item_id: "takoyaki", created_at: "2026-11-05T00:00:00Z" }],
    error: null,
  });
  const insert = vi
    .fn()
    .mockResolvedValue({ error: overrides.insertError ?? null });
  const eqItem = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ order }) }),
      insert,
      delete: () => ({ eq: () => ({ eq: eqItem }) }),
    })),
  } as unknown as SupabaseClient;
  return { client, insert, eqItem };
}

describe("Favorites helper (FR-040)", () => {
  it("lists a customer's favorites", async () => {
    const { client } = createClient({});
    expect(await fetchFavorites({ userId: "customer-123", client })).toEqual([
      { itemId: "takoyaki", createdAt: "2026-11-05T00:00:00Z" },
    ]);
  });

  it("adds a favorite", async () => {
    const { client, insert } = createClient({});
    await addFavorite({ userId: "customer-123", itemId: "takoyaki", client });
    expect(insert).toHaveBeenCalledWith({
      customer_id: "customer-123",
      item_id: "takoyaki",
    });
  });

  it("treats adding a duplicate as success (idempotent)", async () => {
    const { client } = createClient({
      insertError: { code: "23505", message: "duplicate key" },
    });
    await expect(
      addFavorite({ userId: "customer-123", itemId: "takoyaki", client }),
    ).resolves.toBeUndefined();
  });

  it("throws on other add errors", async () => {
    const { client } = createClient({
      insertError: { code: "42501", message: "permission denied" },
    });
    await expect(
      addFavorite({ userId: "customer-123", itemId: "takoyaki", client }),
    ).rejects.toThrow("permission denied");
  });

  it("removes only the given item for that customer", async () => {
    const { client, eqItem } = createClient({});
    await removeFavorite({
      userId: "customer-123",
      itemId: "takoyaki",
      client,
    });
    expect(eqItem).toHaveBeenCalledWith("item_id", "takoyaki");
  });
});
