"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { fetchOrder } from "@/lib/orders/fetch-order";
import { FINAL_ORDER_STATUSES, type OrderView } from "@/lib/orders/types";
import { getPublicSupabaseClient } from "@/lib/supabase/public-client";

/** How often the page checks again in case a Realtime message was missed. */
export const ORDER_REFRESH_MS = 30_000;

const FINAL: ReadonlySet<string> = new Set(FINAL_ORDER_STATUSES);

/**
 * Keeps an open order page current (FR-027, FR-028). The database sends a
 * `status-changed` broadcast on the order's own Realtime topic whenever the
 * shop moves it; the page then loads the order again, so the history and a
 * rejection reason come along. A check every 30 seconds and one when the tab
 * becomes visible cover a dropped connection. Listening stops once the order
 * is completed, rejected or cancelled.
 */
export function useOrderUpdates(
  order: OrderView | null,
  trackingToken: string | null,
  onOrder: (order: OrderView) => void,
): void {
  const onOrderRef = useRef(onOrder);
  useEffect(() => {
    onOrderRef.current = onOrder;
  }, [onOrder]);

  const reference = order?.reference ?? null;
  const topic = order?.realtimeTopic ?? null;
  const live = order !== null && !FINAL.has(order.status);

  useEffect(() => {
    if (!live || !reference || !topic || !trackingToken) return;

    let stopped = false;
    const refresh = async () => {
      try {
        const next = await fetchOrder(reference, trackingToken);
        if (next && !stopped) onOrderRef.current(next);
      } catch {
        // Keep the last status shown; the next check tries again.
      }
    };

    let channel: RealtimeChannel | null = null;
    try {
      channel = getPublicSupabaseClient()
        .channel(topic)
        .on("broadcast", { event: "status-changed" }, () => {
          void refresh();
        })
        .subscribe();
    } catch {
      channel = null;
    }

    const timer = setInterval(() => void refresh(), ORDER_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) {
        try {
          void getPublicSupabaseClient().removeChannel(channel);
        } catch {
          // Nothing to clean up without a client.
        }
      }
    };
  }, [live, reference, topic, trackingToken]);
}
