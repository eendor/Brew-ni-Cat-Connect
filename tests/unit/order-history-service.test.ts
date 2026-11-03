import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { fetchCustomerOrders } from "@/lib/orders/order-history";

function createMockDbClient({
  data = [],
  count = 0,
  error = null,
}: {
  data?: unknown[];
  count?: number;
  error?: { message: string } | null;
} = {}) {
  const rangeMock = vi.fn().mockResolvedValue({ data, count, error });
  const eqMock = vi.fn().mockReturnValue({ range: rangeMock });
  const orderMock = vi.fn().mockReturnValue({ range: rangeMock, eq: eqMock });
  const selectMock = vi.fn().mockReturnValue({ order: orderMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  const client = {
    from: fromMock,
  } as unknown as SupabaseClient;

  return { client, fromMock, selectMock, orderMock, eqMock, rangeMock };
}

describe("fetchCustomerOrders service helper (FR-039)", () => {
  it("TC-P5-020 — queries online_orders with newest first and calculates page range", async () => {
    const rawData = [
      {
        id: "uuid-1",
        reference: "BNC-ABCDEF",
        status: "pending",
        fulfillment: "pickup",
        customer_name: "Test Customer",
        payment_preference: "Cash",
        notes: "No sugar",
        subtotal: "250.00",
        item_count: "2",
        rejection_reason: null,
        created_at: "2026-11-01T12:00:00Z",
        items: [
          {
            line_number: 1,
            item_id: "latte",
            item_name: "Latte",
            variant_id: "v-16",
            variant_name: "16 oz",
            flavor: "Caramel",
            unit_price: "125.00",
            quantity: "2",
            line_total: "250.00",
          },
        ],
      },
    ];

    const { client, fromMock, orderMock, eqMock, rangeMock } =
      createMockDbClient({
        data: rawData,
        count: 25,
        error: null,
      });

    const result = await fetchCustomerOrders({
      page: 2,
      pageSize: 10,
      client,
    });

    expect(fromMock).toHaveBeenCalledWith("online_orders");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(eqMock).not.toHaveBeenCalled(); // no userId passed → no explicit filter
    expect(rangeMock).toHaveBeenCalledWith(10, 19); // Page 2 of 10 -> indices 10 to 19

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalCount).toBe(25);
    expect(result.totalPages).toBe(3); // Math.ceil(25 / 10) = 3
    expect(result.orders).toHaveLength(1);

    const order = result.orders[0];
    expect(order?.reference).toBe("BNC-ABCDEF");
    expect(order?.subtotal).toBe(250);
    expect(order?.itemCount).toBe(2);
    expect(order?.items[0]?.itemName).toBe("Latte");
    expect(order?.items[0]?.unitPrice).toBe(125);
  });

  it("TC-P5-021 — handles empty order list cleanly", async () => {
    const { client, rangeMock } = createMockDbClient({
      data: [],
      count: 0,
      error: null,
    });

    const result = await fetchCustomerOrders({
      page: 1,
      pageSize: 10,
      client,
    });

    expect(rangeMock).toHaveBeenCalledWith(0, 9);
    expect(result.orders).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it("TC-P5-022 — throws descriptive error when query fails", async () => {
    const { client } = createMockDbClient({
      data: null as unknown as unknown[],
      count: 0,
      error: { message: "connection timeout" },
    });

    await expect(fetchCustomerOrders({ client })).rejects.toThrow(
      "Failed to load order history: connection timeout",
    );
  });

  it("TC-P5-023 — sends eq(customer_id, userId) filter when userId is provided", async () => {
    const { client, eqMock, rangeMock } = createMockDbClient({
      data: [],
      count: 0,
      error: null,
    });

    await fetchCustomerOrders({
      page: 1,
      pageSize: 10,
      userId: "user-uuid-abc",
      client,
    });

    expect(eqMock).toHaveBeenCalledWith("customer_id", "user-uuid-abc");
    expect(rangeMock).toHaveBeenCalledWith(0, 9);
  });
});
