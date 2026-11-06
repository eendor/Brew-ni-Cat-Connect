import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchOrder = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/fetch-order", () => ({ fetchOrder }));

import {
  ORDER_REFRESH_INTERVAL_MS,
  useOrderStatus,
} from "@/lib/orders/use-order-status";
import type { OrderView } from "@/lib/orders/types";

const REFERENCE = "BNC-7K2Q9F";
const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";
const TOPIC = "order:3kQ9F2aBcDeFgHiJkLmNoP";

const BASE_ORDER: OrderView = {
  reference: REFERENCE,
  status: "pending",
  fulfillment: "pickup",
  customerName: "Juan Dela Cruz",
  paymentPreference: "GCash",
  notes: "Less sweet please",
  items: [
    {
      itemId: "item-1",
      itemName: "Iced Latte",
      variantId: "v-1",
      variantName: "16 oz",
      flavor: null,
      unitPrice: 120,
      quantity: 1,
      lineTotal: 120,
    },
  ],
  subtotal: 120,
  itemCount: 1,
  rejectionReason: null,
  createdAt: "2026-11-04T08:00:00Z",
  statusHistory: [{ status: "pending", changedAt: "2026-11-04T08:00:00Z" }],
  realtimeTopic: TOPIC,
};

describe("useOrderStatus hook", () => {
  let mockBroadcastHandler: ((payload: unknown) => void) | null = null;
  let mockRemovedChannels: unknown[] = [];

  const mockChannel = {
    on: vi.fn(
      (
        _type: string,
        _filter: unknown,
        handler: (payload: unknown) => void,
      ) => {
        mockBroadcastHandler = handler;
        return mockChannel;
      },
    ),
    subscribe: vi.fn((callback?: (status: string) => void) => {
      if (callback) {
        callback("SUBSCRIBED");
      }
      return mockChannel;
    }),
  };

  const mockClient = {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(async (ch: unknown) => {
      mockRemovedChannels.push(ch);
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchOrder.mockReset();
    mockBroadcastHandler = null;
    mockRemovedChannels = [];
    mockChannel.on.mockClear();
    mockChannel.subscribe.mockClear();
    (mockClient.channel as ReturnType<typeof vi.fn>).mockClear();
    (mockClient.removeChannel as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("TC-P5-043 — successfully subscribes to the order's Realtime topic (FR-047)", () => {
    const { result } = renderHook(() =>
      useOrderStatus(BASE_ORDER, TOKEN, undefined, mockClient),
    );

    expect(mockClient.channel).toHaveBeenCalledWith(TOPIC);
    expect(mockChannel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "status-changed" },
      expect.any(Function),
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(result.current.isRealtimeConnected).toBe(true);
  });

  it("TC-P5-044 — refetches and updates order when status-changed broadcast arrives (FR-046, FR-047)", async () => {
    const updatedOrder: OrderView = {
      ...BASE_ORDER,
      status: "preparing",
      statusHistory: [
        ...BASE_ORDER.statusHistory,
        { status: "preparing", changedAt: "2026-11-04T08:05:00Z" },
      ],
    };
    fetchOrder.mockResolvedValueOnce(updatedOrder);

    const onOrder = vi.fn();
    const { result } = renderHook(() =>
      useOrderStatus(BASE_ORDER, TOKEN, onOrder, mockClient),
    );

    expect(result.current.order?.status).toBe("pending");

    await act(async () => {
      mockBroadcastHandler?.({
        status: "preparing",
        changedAt: "2026-11-04T08:05:00Z",
      });
    });

    expect(fetchOrder).toHaveBeenCalledWith(REFERENCE, TOKEN, mockClient);
    expect(result.current.order?.status).toBe("preparing");
    expect(onOrder).toHaveBeenCalledWith(updatedOrder);
  });

  it("TC-P5-045 — stops Realtime listening and cleans up on final order status (completed/rejected/cancelled)", async () => {
    const completedOrder: OrderView = {
      ...BASE_ORDER,
      status: "completed",
    };

    const { result } = renderHook(() =>
      useOrderStatus(completedOrder, TOKEN, undefined, mockClient),
    );

    expect(mockClient.channel).not.toHaveBeenCalled();
    expect(result.current.isRealtimeConnected).toBe(false);
  });

  it("TC-P5-046 — handles Realtime unavailable and connection failure gracefully (FR-048)", () => {
    mockChannel.subscribe.mockImplementationOnce(
      (callback?: (status: string) => void) => {
        if (callback) {
          callback("CHANNEL_ERROR");
        }
        return mockChannel;
      },
    );

    const { result } = renderHook(() =>
      useOrderStatus(BASE_ORDER, TOKEN, undefined, mockClient),
    );

    expect(result.current.isRealtimeConnected).toBe(false);
  });

  it("TC-P5-047 — manual refresh refetches order status and handles refreshing state (FR-048)", async () => {
    const updatedOrder: OrderView = {
      ...BASE_ORDER,
      status: "ready",
    };
    fetchOrder.mockResolvedValueOnce(updatedOrder);

    const { result } = renderHook(() =>
      useOrderStatus(BASE_ORDER, TOKEN, undefined, mockClient),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchOrder).toHaveBeenCalledWith(REFERENCE, TOKEN, mockClient);
    expect(result.current.order?.status).toBe("ready");
    expect(result.current.isRefreshing).toBe(false);
  });

  it("TC-P5-048 — automatically refreshes order every 30 seconds when active (FR-048)", async () => {
    fetchOrder.mockResolvedValue(BASE_ORDER);

    renderHook(() => useOrderStatus(BASE_ORDER, TOKEN, undefined, mockClient));

    expect(fetchOrder).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(ORDER_REFRESH_INTERVAL_MS);
    });

    expect(fetchOrder).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(ORDER_REFRESH_INTERVAL_MS);
    });

    expect(fetchOrder).toHaveBeenCalledTimes(2);
  });

  it("TC-P5-049 — unmount properly cleans up channel subscription and timers", () => {
    const { unmount } = renderHook(() =>
      useOrderStatus(BASE_ORDER, TOKEN, undefined, mockClient),
    );

    unmount();

    expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("TC-P5-050 — ignores subscription for invalid realtimeTopic", () => {
    const invalidTopicOrder = {
      ...BASE_ORDER,
      realtimeTopic: "invalid_topic",
    };

    const { result } = renderHook(() =>
      useOrderStatus(invalidTopicOrder, TOKEN, undefined, mockClient),
    );

    expect(mockClient.channel).not.toHaveBeenCalled();
    expect(result.current.isRealtimeConnected).toBe(false);
  });
});
