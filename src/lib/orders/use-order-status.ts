"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { fetchOrder } from "@/lib/orders/fetch-order";
import {
  isFinalOrderStatus,
  isOrderRealtimeTopic,
  ORDER_STATUS_CHANGED_EVENT,
  type OrderStatus,
  type OrderView,
} from "@/lib/orders/types";
import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { getPublicSupabaseClient } from "@/lib/supabase/public-client";

/** How often the page polls in the background when Realtime is not active or as fallback. */
export const ORDER_REFRESH_INTERVAL_MS = 30_000;

export type OrderStatusChangedPayload = Readonly<{
  status: OrderStatus;
  changedAt: string;
}>;

export interface UseOrderStatusResult {
  /** The latest loaded order view. */
  order: OrderView | null;
  /** Whether the Supabase Realtime channel is currently active and subscribed. */
  isRealtimeConnected: boolean;
  /** Whether a background or manual refresh is in flight. */
  isRefreshing: boolean;
  /** Trigger a manual status refresh. */
  refresh: () => Promise<void>;
  /** Error message if a status refresh fails. */
  error: string | null;
}

/**
 * Hook to manage live order status updates via Supabase Realtime with 30s polling fallback.
 *
 * Requirements (FR-046, FR-047, FR-048):
 * - Subscribes to the order's Realtime topic returned by `get_online_order()`.
 * - Validates topic format using `isOrderRealtimeTopic`.
 * - Listens for `ORDER_STATUS_CHANGED_EVENT` ('status-changed').
 * - Refetches order upon receiving status update broadcast.
 * - Stops listening and polling once a terminal status (`isFinalOrderStatus`) is reached.
 * - Cleans up subscriptions and timers on unmount.
 * - Gracefully handles connection drops or missing Realtime capability with polling and manual refresh.
 */
export function useOrderStatus(
  initialOrder: OrderView | null,
  trackingToken?: string | null,
  onOrder?: (order: OrderView) => void,
  client?: SupabaseClient,
): UseOrderStatusResult {
  const [fetchedOrder, setFetchedOrder] = useState<OrderView | null>(null);
  const [channelConnected, setChannelConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive current order from fetched update or initial prop
  const activeOrder =
    fetchedOrder &&
    initialOrder &&
    fetchedOrder.reference === initialOrder.reference
      ? fetchedOrder
      : (fetchedOrder ?? initialOrder);

  const onOrderRef = useRef(onOrder);
  useEffect(() => {
    onOrderRef.current = onOrder;
  }, [onOrder]);

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const orderRef = useRef(activeOrder);
  useEffect(() => {
    orderRef.current = activeOrder;
  }, [activeOrder]);

  const reference = activeOrder?.reference ?? null;
  const topic = activeOrder?.realtimeTopic ?? null;
  const currentStatus = activeOrder?.status ?? null;
  const isFinal = currentStatus !== null && isFinalOrderStatus(currentStatus);
  const canSubscribe =
    !isFinal && Boolean(reference && topic && isOrderRealtimeTopic(topic));

  const refresh = useCallback(async () => {
    if (!reference || isFetchingRef.current) return;
    if (orderRef.current && isFinalOrderStatus(orderRef.current.status)) return;

    isFetchingRef.current = true;
    if (isMountedRef.current) {
      setIsRefreshing(true);
    }

    try {
      const next = client
        ? await fetchOrder(reference, trackingToken, client)
        : await fetchOrder(reference, trackingToken);
      if (next && isMountedRef.current) {
        setFetchedOrder(next);
        setError(null);
        onOrderRef.current?.(next);
      }
    } catch {
      if (isMountedRef.current) {
        setError("Failed to refresh order status.");
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [reference, trackingToken, client]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!canSubscribe || !topic) {
      return;
    }

    let channel: RealtimeChannel | null = null;
    let supabaseClient: SupabaseClient | null = client ?? null;

    if (!supabaseClient) {
      try {
        supabaseClient = getPublicSupabaseClient();
      } catch {
        try {
          supabaseClient = getAuthSupabaseClient();
        } catch {
          supabaseClient = null;
        }
      }
    }

    if (supabaseClient) {
      try {
        channel = supabaseClient
          .channel(topic)
          .on("broadcast", { event: ORDER_STATUS_CHANGED_EVENT }, () => {
            void refresh();
          })
          .subscribe((status) => {
            if (!isMountedRef.current) return;
            if (status === "SUBSCRIBED") {
              setChannelConnected(true);
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setChannelConnected(false);
            }
          });
      } catch {
        channel = null;
      }
    }

    // Fallback: timed refresh every 30 seconds
    const timer = setInterval(() => {
      void refresh();
    }, ORDER_REFRESH_INTERVAL_MS);

    // Refresh when returning to tab
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (channel && supabaseClient) {
        try {
          void supabaseClient.removeChannel(channel);
        } catch {
          // Channel cleanup fallback
        }
      }
      setChannelConnected(false);
    };
  }, [canSubscribe, topic, refresh, client]);

  return {
    order: activeOrder,
    isRealtimeConnected: canSubscribe && channelConnected,
    isRefreshing,
    refresh,
    error,
  };
}

/**
 * Backward compatibility adapter matching Rodnee's signature on feat/live-order-status.
 */
export function useOrderUpdates(
  order: OrderView | null,
  trackingToken: string | null,
  onOrder: (order: OrderView) => void,
): void {
  useOrderStatus(order, trackingToken, onOrder);
}
