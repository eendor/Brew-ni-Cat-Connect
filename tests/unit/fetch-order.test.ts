import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/public-client", () => ({ getPublicSupabaseClient }));

import { fetchOrder } from "@/lib/orders/fetch-order";
import type { OrderView } from "@/lib/orders/types";

const REFERENCE = "BNC-7K2Q9F";
const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";
const ORDER = { reference: REFERENCE, status: "pending" } as OrderView;
const rpc = vi.fn();

describe("fetchOrder", () => {
  beforeEach(() => {
    rpc.mockReset();
    getPublicSupabaseClient.mockReturnValue({ rpc });
  });

  it("TC-P4-129 — returns the order for a matching reference and token", async () => {
    rpc.mockResolvedValue({ data: ORDER, error: null });

    await expect(fetchOrder(REFERENCE, TOKEN)).resolves.toBe(ORDER);
    expect(rpc).toHaveBeenCalledWith("get_online_order", {
      p_reference: REFERENCE,
      p_tracking_token: TOKEN,
    });
  });

  it("TC-P4-130 — returns null when no order matches", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(fetchOrder(REFERENCE, TOKEN)).resolves.toBeNull();
  });

  it("TC-P4-131 — throws when the request fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "offline" } });

    await expect(fetchOrder(REFERENCE, TOKEN)).rejects.toThrow(
      "The order could not be loaded.",
    );
  });

  it("TC-P4-132 — checks the link before any request", async () => {
    await expect(fetchOrder("INVALID-REF", TOKEN)).resolves.toBeNull();
    await expect(fetchOrder(REFERENCE, "short_token")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
