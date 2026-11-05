"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  isFinalOrderStatus,
  type OrderStatus,
  type OrderStatusEvent,
  type OrderView,
} from "@/lib/orders/types";
import { useOrderStatus } from "@/lib/orders/use-order-status";

export type TrackerStage = {
  status: OrderStatus;
  label: string;
  description: string;
};

export const TRACKER_STAGES: readonly TrackerStage[] = [
  {
    status: "pending",
    label: "Pending",
    description: "Order placed, waiting for shop confirmation",
  },
  {
    status: "accepted",
    label: "Accepted",
    description: "Shop accepted your order",
  },
  {
    status: "preparing",
    label: "Preparing",
    description: "Your drinks and food are being prepared",
  },
  {
    status: "ready",
    label: "Ready",
    description: "Ready for pickup at the counter",
  },
  {
    status: "completed",
    label: "Completed",
    description: "Order picked up and completed",
  },
];

export interface OrderStatusTrackerProps {
  /** The initial or currently loaded order. */
  order?: OrderView | null;
  /** Tracking token for guest orders or re-fetching. */
  trackingToken?: string | null;
  /** Callback fired whenever Realtime or polling updates the order. */
  onOrderUpdate?: (order: OrderView) => void;
  /** Optional loading state override. */
  isLoading?: boolean;
  /** Optional error state override. */
  error?: string | null;
  /** Optional custom class name. */
  className?: string;
}

function formatEventTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

function formatStatusName(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Order Received";
    case "accepted":
      return "Accepted by Shop";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for Pickup";
    case "completed":
      return "Completed";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function OrderStatusTracker({
  order: initialOrder,
  trackingToken,
  onOrderUpdate,
  isLoading = false,
  error: customError,
  className = "",
}: OrderStatusTrackerProps) {
  const {
    order: liveOrder,
    isRealtimeConnected,
    isRefreshing,
    refresh,
    error: hookError,
  } = useOrderStatus(initialOrder ?? null, trackingToken, onOrderUpdate);

  const activeOrder = liveOrder ?? initialOrder ?? null;
  const currentError = customError ?? hookError;

  // Map history events by status for fast lookup of timestamps
  const historyMap = useMemo(() => {
    const map = new Map<OrderStatus, OrderStatusEvent>();
    if (activeOrder?.statusHistory) {
      for (const entry of activeOrder.statusHistory) {
        map.set(entry.status, entry);
      }
    }
    return map;
  }, [activeOrder]);

  // Loading state
  if (isLoading || (!activeOrder && !currentError)) {
    return (
      <div
        data-testid="order-tracker-loading"
        className={`ios-card p-6 animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-36 rounded bg-[var(--fill-secondary)]" />
          <div className="h-5 w-24 rounded-full bg-[var(--fill-secondary)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[var(--fill-secondary)]" />
              <div className="h-4 w-16 rounded bg-[var(--fill-secondary)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state without order data
  if (currentError && !activeOrder) {
    return (
      <div
        data-testid="order-tracker-error"
        className={`ios-card p-6 border border-[var(--danger)]/30 ${className}`}
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-[var(--danger)] font-semibold text-lg">
            Unable to load order status
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {currentError}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="button-secondary mt-4 text-xs"
          >
            {isRefreshing ? "Refreshing..." : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (!activeOrder) return null;

  const currentStatus = activeOrder.status;
  const isRejected = currentStatus === "rejected";
  const isCancelled = currentStatus === "cancelled";
  const isTerminal = isFinalOrderStatus(currentStatus);

  const currentStageIndex = TRACKER_STAGES.findIndex(
    (stage) => stage.status === currentStatus,
  );

  return (
    <section
      data-testid="order-status-tracker"
      aria-label="Order Status Tracker"
      className={`ios-card p-6 space-y-6 ${className}`}
    >
      {/* Tracker Header & Connectivity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--separator)] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Live Order Status
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Current status:{" "}
            <span
              data-testid="current-status-label"
              className="font-semibold text-[var(--accent-solid)] capitalize"
            >
              {currentStatus}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isTerminal && (
            <>
              {isRealtimeConnected ? (
                <span
                  data-testid="realtime-status-connected"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-accent)] px-3 py-1 text-xs font-medium text-[var(--accent-solid)]"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-fill)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-fill)]" />
                  </span>
                  Live updates
                </span>
              ) : (
                <span
                  data-testid="realtime-status-disconnected"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--notice-border)] bg-[var(--notice-surface)] px-3 py-1 text-xs font-medium text-[var(--notice-text)]"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--notice-text)]" />
                  Offline (polling)
                </span>
              )}

              {/* Manual Refresh Button when Realtime is unavailable or on demand */}
              <button
                type="button"
                data-testid="manual-refresh-button"
                onClick={() => void refresh()}
                disabled={isRefreshing}
                aria-label="Refresh order status"
                className="button-secondary text-xs px-3 py-1 inline-flex items-center gap-1.5"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Exceptional State: Rejected Order (FR-049) */}
      {isRejected && (
        <div
          data-testid="rejected-order-banner"
          role="alert"
          className="rounded-[var(--shape-md)] border-l-4 border-l-[var(--danger)] bg-[var(--danger-soft)] p-5 text-[var(--text-strong)] space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full p-1 bg-[var(--danger)] text-white mt-0.5">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-[var(--danger)]">
                Order Rejected
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                The shop was unable to accept this order.
              </p>
            </div>
          </div>

          <div className="bg-[var(--surface-input)] rounded-[var(--shape-sm)] p-3 border border-[var(--border-soft)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Reason from the shop:
            </p>
            <p
              data-testid="rejection-reason"
              className="text-sm font-medium text-[var(--text-strong)] mt-1"
            >
              {activeOrder.rejectionReason?.trim() ||
                "Item temporarily out of stock or store at capacity."}
            </p>
          </div>

          <div
            data-testid="rejected-next-steps"
            className="text-xs text-[var(--text-muted)] space-y-1.5 pt-1"
          >
            <p className="font-semibold text-[var(--text-strong)] text-sm">
              What should you do next?
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You have not been charged for this order.</li>
              <li>
                You may choose an alternative item and place a new order on our
                menu.
              </li>
              <li>
                If you have questions or need assistance, visit the counter or
                contact Brew ni Cat staff.
              </li>
            </ul>
            <div className="pt-2">
              <Link
                href="/menu"
                className="button-primary text-xs inline-block"
              >
                Back to Menu
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Exceptional State: Cancelled Order */}
      {isCancelled && (
        <div
          data-testid="cancelled-order-banner"
          role="alert"
          className="rounded-[var(--shape-md)] border border-[var(--separator)] bg-[var(--fill-secondary)] p-5 text-[var(--text-strong)] space-y-3"
        >
          <h3 className="font-semibold text-lg text-[var(--text-strong)]">
            Order Cancelled
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            This order has been cancelled. If this was unexpected, please
            contact the shop counter.
          </p>
          <div>
            <Link
              href="/menu"
              className="button-secondary text-xs inline-block"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      )}

      {/* Normal Progression Pipeline (FR-046) */}
      {!isRejected && !isCancelled && (
        <div className="space-y-4">
          <ol
            aria-label="Order progress stages"
            className="grid grid-cols-1 sm:grid-cols-5 gap-3"
          >
            {TRACKER_STAGES.map((stage, idx) => {
              const isCompleted =
                currentStageIndex > -1 && idx < currentStageIndex;
              const isCurrent =
                currentStageIndex > -1 && idx === currentStageIndex;

              const stageEvent = historyMap.get(stage.status);

              return (
                <li
                  key={stage.status}
                  data-testid={`tracker-stage-${stage.status}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`relative flex sm:flex-col items-center sm:text-center gap-3 p-3 rounded-[var(--shape-md)] transition-colors ${
                    isCurrent
                      ? "bg-[var(--surface-accent)]/50 border border-[var(--accent-solid)]/30"
                      : isCompleted
                        ? "bg-[var(--fill-tertiary)]"
                        : "opacity-60"
                  }`}
                >
                  {/* Step Indicator Circle */}
                  <div
                    data-testid={`stage-icon-${stage.status}`}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isCompleted
                        ? "bg-[var(--accent-fill)] text-white"
                        : isCurrent
                          ? "border-2 border-[var(--accent-solid)] bg-[var(--surface-canvas)] text-[var(--accent-solid)] ring-4 ring-[var(--accent-soft)]"
                          : "border border-[var(--separator)] bg-[var(--fill-secondary)] text-[var(--text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1 sm:w-full min-w-0">
                    <p
                      className={`text-sm truncate ${
                        isCurrent
                          ? "font-bold text-[var(--accent-solid)]"
                          : isCompleted
                            ? "font-semibold text-[var(--text-strong)]"
                            : "font-normal text-[var(--text-muted)]"
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p className="text-[11px] text-[var(--text-subtle)] line-clamp-1 hidden sm:block">
                      {stage.description}
                    </p>
                    {stageEvent && (
                      <time
                        data-testid={`stage-time-${stage.status}`}
                        dateTime={stageEvent.changedAt}
                        className="text-[10px] text-[var(--text-muted)] block mt-0.5"
                      >
                        {formatEventTimestamp(stageEvent.changedAt)}
                      </time>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Status History Timeline (FR-046) */}
      <div className="border-t border-[var(--separator)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Status History
        </h3>
        <ul
          data-testid="status-history-list"
          className="space-y-2.5 text-xs divide-y divide-[var(--separator)]/50"
        >
          {activeOrder.statusHistory.map((historyItem, index) => (
            <li
              key={`${historyItem.status}-${index}`}
              data-testid={`history-item-${index}`}
              className="pt-2 first:pt-0 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    historyItem.status === "rejected"
                      ? "bg-[var(--danger)]"
                      : historyItem.status === "completed"
                        ? "bg-[var(--accent-fill)]"
                        : "bg-[var(--text-muted)]"
                  }`}
                />
                <span className="font-medium text-[var(--text-strong)]">
                  {formatStatusName(historyItem.status)}
                </span>
              </div>
              <time
                dateTime={historyItem.changedAt}
                className="text-[var(--text-muted)] tabular-nums"
              >
                {formatEventTimestamp(historyItem.changedAt)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
