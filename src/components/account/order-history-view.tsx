"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { formatPrice } from "@/lib/menu/format-price";
import {
  fetchCustomerOrders,
  type CustomerOrderHistoryEntry,
  type CustomerOrderHistoryPage,
  DEFAULT_PAGE_SIZE,
} from "@/lib/orders/order-history";
import { reorderItems, type ReorderSummary } from "@/lib/orders/reorder";

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case "completed":
    case "ready":
      return "bg-[var(--accent-soft)] text-[var(--accent-solid)] border-[var(--accent-solid)]";
    case "rejected":
    case "cancelled":
      return "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]";
    case "accepted":
    case "preparing":
      return "bg-[var(--notice-surface)] text-[var(--notice-text)] border-[var(--notice-border)]";
    case "pending":
    default:
      return "bg-[var(--fill-tertiary)] text-[var(--text-muted)] border-[var(--separator)]";
  }
}

type OrderHistoryViewProps = Readonly<{
  initialPage?: number;
}>;

export function OrderHistoryView({ initialPage = 1 }: OrderHistoryViewProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addItem, openDrawer } = useCart();

  const [page, setPage] = useState(initialPage);
  const [historyPage, setHistoryPage] =
    useState<CustomerOrderHistoryPage | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reorderingRef, setReorderingRef] = useState<string | null>(null);
  const [reorderResult, setReorderResult] = useState<ReorderSummary | null>(
    null,
  );

  const handleRetry = () => {
    setIsLoadingOrders(true);
    setError(null);
    fetchCustomerOrders({ page, pageSize: DEFAULT_PAGE_SIZE, userId: user?.id })
      .then(setHistoryPage)
      .catch(() =>
        setError("Unable to load order history. Please try again later."),
      )
      .finally(() => setIsLoadingOrders(false));
  };

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;

    fetchCustomerOrders({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      userId: user.id,
    })
      .then((data) => {
        if (!active) return;
        setHistoryPage(data);
        setIsLoadingOrders(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load order history. Please try again later.");
        setIsLoadingOrders(false);
      });

    return () => {
      active = false;
    };
  }, [user, isAuthLoading, page]);

  const handleReorder = async (order: CustomerOrderHistoryEntry) => {
    if (!order.items.length) return;
    setReorderingRef(order.reference);
    try {
      const catalog = await fetchPublicMenu();
      const result = reorderItems(order.items, catalog, addItem);
      setReorderResult(result);
      if (result.addedCount > 0) {
        openDrawer();
      }
    } catch {
      setError("Failed to fetch menu for reordering. Please try again.");
    } finally {
      setReorderingRef(null);
    }
  };

  if (isAuthLoading) {
    return (
      <Container className="py-12 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-64 rounded-[var(--shape-md)] bg-[var(--fill-secondary)]" />
          <div className="h-5 w-96 rounded-[var(--shape-sm)] bg-[var(--fill-secondary)]" />
          <div className="space-y-4 pt-4">
            <div className="h-44 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
            <div className="h-44 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
          </div>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-16 max-w-xl text-center">
        <div className="ios-card p-8 sm:p-10">
          <h1 className="font-display text-2xl text-[var(--text-strong)]">
            Sign In to View Orders
          </h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Please sign in to access your order history and easily reorder your
            favorites.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/account/sign-in?returnTo=/account/orders"
              className="button-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/menu"
              className="button-secondary inline-flex min-h-11 items-center justify-center rounded-full px-6 font-semibold border border-[var(--separator)]"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 md:py-12 max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-strong)] tracking-tight">
          Order History
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          View your past orders, track pickup status, or reorder your favorites
          with live menu pricing.
        </p>
      </header>

      {reorderResult && (
        <div
          role="region"
          aria-label="Reorder notices"
          className="mb-8 space-y-3 rounded-[var(--shape-md)] border border-[var(--separator)] bg-[var(--surface-overlay)] p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-strong)]">
              Reorder Update
            </h2>
            <button
              type="button"
              onClick={() => setReorderResult(null)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)]"
              aria-label="Dismiss reorder notices"
            >
              Dismiss
            </button>
          </div>

          {reorderResult.successMessage && (
            <div className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--accent-solid)]">
              <span>{reorderResult.successMessage}</span>
              <button
                type="button"
                onClick={openDrawer}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-85"
              >
                Open Cart
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

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)] flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="font-semibold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {isLoadingOrders ? (
        <div className="space-y-4">
          <div className="h-44 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)] animate-pulse" />
          <div className="h-44 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)] animate-pulse" />
        </div>
      ) : !historyPage || historyPage.orders.length === 0 ? (
        <div className="ios-card p-10 text-center">
          <h2 className="font-display text-xl text-[var(--text-strong)]">
            No Orders Yet
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            You haven’t placed any orders yet. Discover our drinks, snacks, and
            cat treats!
          </p>
          <div className="mt-6">
            <Link
              href="/menu"
              className="button-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 font-semibold"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {historyPage.orders.map((order) => {
              const isReorderingThis = reorderingRef === order.reference;

              return (
                <article
                  key={order.id}
                  className="ios-card p-6 flex flex-col gap-4 border border-[var(--separator)]"
                  aria-labelledby={`order-heading-${order.reference}`}
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--separator)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.reference}`}
                          className="font-mono text-base font-bold text-[var(--accent-solid)] hover:underline"
                          id={`order-heading-${order.reference}`}
                        >
                          {order.reference}
                        </Link>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusBadgeStyle(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <time
                        dateTime={order.createdAt}
                        className="text-xs text-[var(--text-muted)] block mt-0.5"
                      >
                        Placed on {formatDate(order.createdAt)}
                      </time>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--text-strong)]">
                        {formatPrice(order.subtotal)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </header>

                  <section className="text-sm">
                    <ul className="divide-y divide-[var(--separator)]">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="py-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-medium text-[var(--text-strong)]">
                              {item.quantity}x {item.itemName}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] ml-2">
                              ({item.variantName}
                              {item.flavor ? ` • ${item.flavor}` : ""})
                            </span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] font-mono">
                            {formatPrice(item.lineTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--separator)] pt-3">
                    <div className="text-xs text-[var(--text-muted)]">
                      Payment:{" "}
                      <span className="text-[var(--text-strong)] font-medium">
                        {order.paymentPreference}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${order.reference}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--separator)] px-4 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--glass-hover)] transition-colors"
                      >
                        View Order
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        disabled={isReorderingThis}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--accent-solid)] bg-transparent px-4 text-xs font-semibold text-[var(--accent-solid)] hover:bg-[var(--accent-soft)] transition-colors disabled:opacity-50"
                      >
                        {isReorderingThis ? "Reordering..." : "Reorder"}
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>

          {/* Pagination controls */}
          {historyPage.totalPages > 1 && (
            <nav
              aria-label="Order history pagination"
              className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--separator)] pt-6 text-sm"
            >
              <p className="text-xs text-[var(--text-muted)]">
                Showing page {historyPage.page} of {historyPage.totalPages} (
                {historyPage.totalCount} orders total)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage.page <= 1}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--separator)] px-3 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--glass-hover)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Previous page"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: historyPage.totalPages },
                    (_, i) => i + 1,
                  ).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        pageNum === historyPage.page
                          ? "bg-[var(--accent-fill)] text-white"
                          : "text-[var(--text-strong)] hover:bg-[var(--glass-hover)]"
                      }`}
                      aria-current={
                        pageNum === historyPage.page ? "page" : undefined
                      }
                      aria-label={`Page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(historyPage.totalPages, p + 1))
                  }
                  disabled={historyPage.page >= historyPage.totalPages}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--separator)] px-3 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--glass-hover)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
    </Container>
  );
}
