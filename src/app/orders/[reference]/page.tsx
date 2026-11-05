"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { OrderStatusTracker } from "@/components/orders/order-status-tracker";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useShopFacts } from "@/context/shop-facts-context";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { formatPrice } from "@/lib/menu/format-price";
import {
  localityLine,
  streetLine,
  takeoutBoxText,
} from "@/lib/site-content/format";
import { fetchOrder } from "@/lib/orders/fetch-order";
import { readTrackingTokenFromHash } from "@/lib/orders/order-link";
import { reorderItems, type ReorderSummary } from "@/lib/orders/reorder";
import { isOrderReference, OrderView } from "@/lib/orders/types";

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; order: OrderView };

export default function OrderConfirmationPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addItem, openDrawer } = useCart();
  const { address, takeoutBoxPrice } = useShopFacts();
  const params = useParams();
  const referenceParam =
    typeof params.reference === "string" ? params.reference : "";
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderResult, setReorderResult] = useState<ReorderSummary | null>(
    null,
  );
  const [reorderError, setReorderError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!isOrderReference(referenceParam)) {
        setState({ status: "not-found" });
        return;
      }

      // Guest access requires tracking token from hash (FR-045)
      const token = readTrackingTokenFromHash(window.location.hash);
      if (!token) {
        // Authenticated customer access (FR-044)
        if (isAuthLoading) {
          return; // Wait for auth session restoration
        }
        if (!user) {
          setState({ status: "not-found" });
          return;
        }
      }

      setTrackingToken(token);

      try {
        const orderData = await fetchOrder(referenceParam, token);
        if (!orderData) {
          setState({ status: "not-found" });
          return;
        }

        setState({ status: "success", order: orderData });
      } catch {
        setState({
          status: "error",
          message: "Failed to load order confirmation. Please try again later.",
        });
      }
    }

    void loadOrder();
  }, [referenceParam, isAuthLoading, user]);

  const handleReorder = async () => {
    if (state.status !== "success" || !state.order.items.length) return;
    setIsReordering(true);
    setReorderResult(null);
    setReorderError(null);
    try {
      const catalog = await fetchPublicMenu();
      const result = reorderItems(state.order.items, catalog, addItem);
      setReorderResult(result);
      if (result.addedCount > 0) {
        openDrawer();
      }
    } catch {
      setReorderError("We couldn't load the menu. Try again.");
    } finally {
      setIsReordering(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-8 w-1/2 rounded-[var(--shape-sm)] bg-[var(--fill-secondary)]" />
          <div className="mx-auto h-4 w-3/4 rounded-[var(--shape-sm)] bg-[var(--fill-secondary)]" />
          <div className="ios-card mt-6 h-48" />
        </div>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Loading order details...
        </p>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="ios-card p-8">
          <h1 className="font-display text-2xl text-[var(--text-strong)]">
            Order Not Found
          </h1>
          <p className="mt-3 text-[var(--text-muted)] text-sm">
            We couldn’t find an order matching this reference or tracking link.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="ios-card p-8">
          <h1 className="font-display text-2xl text-[var(--danger)]">
            Something Went Wrong
          </h1>
          <p className="mt-3 text-[var(--text-muted)] text-sm">
            {state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="button-primary mt-6"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { order } = state;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 border-b border-[var(--separator)] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-[var(--text-strong)]">
              Order Placed
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-mono">
              Reference:{" "}
              <span className="text-[var(--accent-solid)] font-semibold">
                {order.reference}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[var(--notice-border)] bg-[var(--notice-surface)] px-4 py-1.5 text-sm font-semibold text-[var(--notice-text)] capitalize">
              {order.status}
            </span>
            <button
              type="button"
              onClick={handleReorder}
              disabled={isReordering}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--accent-solid)] bg-transparent px-4 text-sm font-semibold text-[var(--accent-solid)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50"
            >
              {isReordering ? "Reordering..." : "Reorder"}
            </button>
          </div>
        </div>
      </header>

      {reorderResult && (
        <div
          role="region"
          aria-label="Reorder notices"
          className="mb-6 space-y-3 rounded-[var(--shape-md)] border border-[var(--separator)] bg-[var(--surface-overlay)] p-4 shadow-sm"
        >
          {reorderResult.successMessage && (
            <div className="flex items-center justify-between gap-2 text-sm text-[var(--accent-solid)] font-medium">
              <span>{reorderResult.successMessage}</span>
              <button
                type="button"
                onClick={openDrawer}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
              >
                View Cart
              </button>
            </div>
          )}
          {reorderResult.unavailableItems.length > 0 && (
            <div className="rounded-[var(--shape-sm)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              <p className="font-semibold">Unavailable items:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {reorderResult.unavailableItems.map((notice, idx) => (
                  <li key={idx}>{notice.message}</li>
                ))}
              </ul>
            </div>
          )}
          {reorderResult.priceChangedItems.length > 0 && (
            <div className="rounded-[var(--shape-sm)] bg-[var(--notice-surface)] p-3 text-sm text-[var(--notice-text)] border border-[var(--notice-border)]">
              <p className="font-semibold">Price updates:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {reorderResult.priceChangedItems.map((notice, idx) => (
                  <li key={idx}>{notice.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {reorderError && (
        <div
          role="region"
          aria-label="Reorder notices"
          className="mb-6 rounded-[var(--shape-md)] border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
        >
          {reorderError}
        </div>
      )}

      <section className="space-y-6">
        {/* Live order status tracker (FR-044 to FR-049) */}
        <OrderStatusTracker
          order={order}
          trackingToken={trackingToken}
          onOrderUpdate={(updated) =>
            setState({ status: "success", order: updated })
          }
        />

        {/* Customer Details Card */}
        <div className="ios-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">
            Customer Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="ios-caption">Name</p>
              <p className="text-[var(--text-strong)] font-medium mt-0.5">
                {order.customerName}
              </p>
            </div>
            <div>
              <p className="ios-caption">Payment</p>
              <p className="text-[var(--text-strong)] font-medium mt-0.5">
                {order.paymentPreference}
              </p>
            </div>
            <div>
              <p className="ios-caption">Fulfillment</p>
              <p className="text-[var(--text-strong)] font-medium capitalize mt-0.5">
                {order.fulfillment}
              </p>
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 border-t border-[var(--separator)] pt-4">
              <p className="ios-caption">Notes</p>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Order Items Summary */}
        <div className="ios-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">
            Items Summary
          </h2>
          <ul className="divide-y divide-[var(--separator)]">
            {order.items.map((item, index) => (
              <li
                key={index}
                className="py-4 flex justify-between items-center text-sm"
              >
                <div>
                  <p className="font-semibold text-[var(--text-strong)] text-base">
                    {item.itemName}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    {item.variantName} {item.flavor ? `• ${item.flavor}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[var(--text-strong)] font-semibold text-base">
                    {formatPrice(item.lineTotal)}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    Qty: {item.quantity}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-center justify-between border-t border-[var(--separator)] pt-5 text-xl font-bold">
            <span className="text-base font-semibold text-[var(--text-strong)]">
              Subtotal
            </span>
            <span className="text-[var(--text-strong)] tabular-nums">
              {formatPrice(order.subtotal)}
            </span>
          </div>
        </div>

        {/* Next steps (FR-026), from the shop facts the checkout uses */}
        <div className="ios-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">
            Next Steps
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-muted)]">
            <li>Bookmark this page to check your order later.</li>
            <li>
              When your order is ready, pick it up at {siteConfig.shortName},{" "}
              {streetLine(address)}, {localityLine(address)}
              {address.landmark ? ` (${address.landmark})` : null}.
            </li>
            <li>
              Pay {formatPrice(order.subtotal)} via {order.paymentPreference} at
              the counter. The {takeoutBoxText(takeoutBoxPrice)} is not included
              in that amount.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
