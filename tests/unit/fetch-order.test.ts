import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/public-client", () => ({ getPublicSupabaseClient }));
const getAuthSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/auth-client", () => ({ getAuthSupabaseClient }));

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
    getAuthSupabaseClient.mockReset();
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

  it("TC-P5-040 — allows authenticated customer without token to fetch order (FR-044)", async () => {
    const authRpc = vi.fn().mockResolvedValue({ data: ORDER, error: null });
    getAuthSupabaseClient.mockReturnValue({ rpc: authRpc });

    await expect(fetchOrder(REFERENCE, null)).resolves.toBe(ORDER);
    expect(authRpc).toHaveBeenCalledWith("get_online_order", {
      p_reference: REFERENCE,
      p_tracking_token: null,
    });
    // the signed-in client, not the guest one
    expect(rpc).not.toHaveBeenCalled();
  });

  it("TC-P5-041 — passes explicit client if supplied", async () => {
    const customRpc = vi.fn().mockResolvedValue({ data: ORDER, error: null });
    const customClient = {
      rpc: customRpc,
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    await expect(fetchOrder(REFERENCE, TOKEN, customClient)).resolves.toBe(
      ORDER,
    );
    expect(customRpc).toHaveBeenCalledWith("get_online_order", {
      p_reference: REFERENCE,
      p_tracking_token: TOKEN,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
