import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "@/lib/account/favorites";

type QueryError = { code: string; message: string } | null;

function createClient(overrides: {
  insertError?: QueryError;
  selectError?: QueryError;
  deleteError?: QueryError;
}) {
  const order = vi.fn().mockResolvedValue({
    data: overrides.selectError
      ? null
      : [{ item_id: "takoyaki", created_at: "2026-11-05T00:00:00Z" }],
    error: overrides.selectError ?? null,
  });
  const eqSelect = vi.fn(() => ({ order }));
  const insert = vi
    .fn()
    .mockResolvedValue({ error: overrides.insertError ?? null });
  const eqItem = vi
    .fn()
    .mockResolvedValue({ error: overrides.deleteError ?? null });
  const eqCustomer = vi.fn(() => ({ eq: eqItem }));
  const client = {
    from: vi.fn(() => ({
      select: () => ({ eq: eqSelect }),
      insert,
      delete: () => ({ eq: eqCustomer }),
    })),
  } as unknown as SupabaseClient;
  return { client, insert, eqItem, eqSelect, eqCustomer, order };
}

describe("Favorites helper (FR-040)", () => {
  it("TC-P5-065 — lists a customer's favorites, newest first", async () => {
    const { client, eqSelect, order } = createClient({});
    expect(await fetchFavorites({ userId: "customer-123", client })).toEqual([
      { itemId: "takoyaki", createdAt: "2026-11-05T00:00:00Z" },
    ]);
    expect(client.from).toHaveBeenCalledWith("favorites");
    expect(eqSelect).toHaveBeenCalledWith("customer_id", "customer-123");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("TC-P5-066 — adds a favorite", async () => {
    const { client, insert } = createClient({});
    await addFavorite({ userId: "customer-123", itemId: "takoyaki", client });
    expect(insert).toHaveBeenCalledWith({
      customer_id: "customer-123",
      item_id: "takoyaki",
    });
  });

  it("TC-P5-067 — treats adding a duplicate as success (idempotent)", async () => {
    const { client } = createClient({
      insertError: { code: "23505", message: "duplicate key" },
    });
    await expect(
      addFavorite({ userId: "customer-123", itemId: "takoyaki", client }),
    ).resolves.toBeUndefined();
  });

  it("TC-P5-068 — throws on other add errors", async () => {
    const { client } = createClient({
      insertError: { code: "42501", message: "permission denied" },
    });
    await expect(
      addFavorite({ userId: "customer-123", itemId: "takoyaki", client }),
    ).rejects.toThrow("permission denied");
  });

  it("TC-P5-069 — removes only the given item for that customer", async () => {
    const { client, eqItem, eqCustomer } = createClient({});
    await removeFavorite({
      userId: "customer-123",
      itemId: "takoyaki",
      client,
    });
    expect(eqCustomer).toHaveBeenCalledWith("customer_id", "customer-123");
    expect(eqItem).toHaveBeenCalledWith("item_id", "takoyaki");
  });

  it("TC-P5-070 — throws when listing or removing fails", async () => {
    const failing = createClient({
      selectError: { code: "PGRST301", message: "JWT expired" },
      deleteError: { code: "42501", message: "permission denied" },
    });
    await expect(
      fetchFavorites({ userId: "customer-123", client: failing.client }),
    ).rejects.toThrow("JWT expired");
    await expect(
      removeFavorite({
        userId: "customer-123",
        itemId: "takoyaki",
        client: failing.client,
      }),
    ).rejects.toThrow("permission denied");
  });
});
