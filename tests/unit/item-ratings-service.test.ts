import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  fetchItemRatings,
  fetchMyItemRatings,
  rateItem,
} from "@/lib/menu/item-ratings";

const rpcClient = (data: unknown, error: { message: string } | null = null) =>
  ({
    rpc: vi.fn().mockResolvedValue({ data, error }),
  }) as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };

describe("Item ratings service (FR-121)", () => {
  it("TC-P9-092 — reads the averages by item, saves a rating and explains each refusal", async () => {
    const summary = await fetchItemRatings(
      rpcClient([
        { item_id: "latte", average: "4.5", rating_count: 12 },
        { item_id: "empty", average: null, rating_count: 0 },
      ]),
    );
    expect([...summary]).toEqual([["latte", { average: 4.5, count: 12 }]]);

    const saving = rpcClient({ ok: true, itemId: "latte", rating: 5 });
    expect(await rateItem("latte", 5, saving)).toEqual({ ok: true });
    expect(saving.rpc).toHaveBeenCalledWith("rate_item", {
      p_item_id: "latte",
      p_rating: 5,
    });

    expect(
      await rateItem("box", 5, rpcClient({ ok: false, error: "not_rateable" })),
    ).toEqual({ ok: false, message: "This item can't be rated." });
    expect(
      await rateItem(
        "mocha",
        5,
        rpcClient({ ok: false, error: "not_ordered" }),
      ),
    ).toEqual({
      ok: false,
      message: "You can rate an item after an order with it is completed.",
    });
    expect(
      await rateItem("latte", 5, rpcClient(null, { message: "offline" })),
    ).toEqual({
      ok: false,
      message: "We couldn't save your rating. Try again.",
    });

    const eq = vi.fn().mockResolvedValue({
      data: [{ item_id: "latte", rating: 4 }],
      error: null,
    });
    const own = await fetchMyItemRatings("customer-1", {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq }),
      }),
    } as unknown as SupabaseClient);
    expect(eq).toHaveBeenCalledWith("customer_id", "customer-1");
    expect([...own]).toEqual([["latte", 4]]);
  });
});
