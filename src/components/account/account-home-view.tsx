"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import { formatPrice } from "@/lib/menu/format-price";
import {
  fetchCustomerOrders,
  type CustomerOrderHistoryEntry,
} from "@/lib/orders/order-history";

const ACCOUNT_TILES = [
  {
    href: "/account/orders",
    title: "Orders",
    description: "See your past orders and track pickup status.",
  },
  {
    href: "/account/favorites",
    title: "Favorites",
    description: "The menu items you saved, with their current prices.",
  },
  {
    href: "/account/rewards",
    title: "Rewards",
    description: "Your loyalty points, points history and rewards.",
  },
  {
    href: "/account/profile",
    title: "Profile",
    description: "Keep your name and phone number up to date.",
  },
  {
    href: "/account/data-request",
    title: "Data requests",
    description: "Ask the shop to correct or delete your data.",
  },
] as const;

/** Kept in the same words and format as the order history page. */
function formatOrderDate(isoString: string): string {
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

/** Kept in the same style as the order history page. */
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

/**
 * The account home (FR-042): one place that links the account pages and shows
 * the newest order. The page sits under the account layout, so AccountGuard
 * has already sent signed-out visitors to sign in.
 */
export function AccountHomeView() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [latestOrder, setLatestOrder] =
    useState<CustomerOrderHistoryEntry | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;

    // One order is all the account home needs; the newest comes first.
    fetchCustomerOrders({ page: 1, pageSize: 1, userId: user.id })
      .then((history) => {
        if (!active) return;
        setLatestOrder(history.orders[0] ?? null);
        setIsLoadingOrder(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load your latest order. Please try again.");
        setIsLoadingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [user, isAuthLoading, reloadKey]);

  return (
    <Container className="py-8 md:py-12 max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-strong)] tracking-tight">
          My Account
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Your orders, favorites, rewards, profile and data requests in one
          place.
        </p>
      </header>

      <nav aria-label="Account pages">
        <ul className="grid gap-4 sm:grid-cols-2">
          {ACCOUNT_TILES.map((tile) => (
            <li key={tile.href} className="min-w-0">
              <Link
                href={tile.href}
                className="ios-card flex h-full flex-col border border-[var(--separator)] p-5 transition-colors hover:bg-[var(--glass-hover)]"
              >
                <span className="font-display text-lg font-semibold text-[var(--text-strong)]">
                  {tile.title}
                </span>
                <span className="mt-1 text-sm text-[var(--text-muted)]">
                  {tile.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-10" aria-labelledby="latest-order-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="latest-order-heading"
            className="font-display text-xl font-semibold text-[var(--text-strong)]"
          >
            Latest order
          </h2>
          <Link
            href="/account/orders"
            className="text-sm font-semibold text-[var(--accent-solid)] underline-offset-2 hover:underline"
          >
            View all orders
          </Link>
        </div>

        {isLoadingOrder ? (
          <div
            role="status"
            aria-label="Loading your latest order"
            data-testid="account-home-loading"
            className="h-36 animate-pulse rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]"
          />
        ) : error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoadingOrder(true);
                setError(null);
                setReloadKey((key) => key + 1);
              }}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : latestOrder ? (
          <article
            className="ios-card flex flex-wrap items-center justify-between gap-4 border border-[var(--separator)] p-5"
            aria-labelledby="latest-order-reference"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  id="latest-order-reference"
                  href={`/orders/${latestOrder.reference}`}
                  className="break-all font-mono text-base font-bold text-[var(--accent-solid)] hover:underline"
                >
                  {latestOrder.reference}
                </Link>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusBadgeStyle(
                    latestOrder.status,
                  )}`}
                >
                  {latestOrder.status}
                </span>
              </div>
              <time
                dateTime={latestOrder.createdAt}
                className="mt-0.5 block text-xs text-[var(--text-muted)]"
              >
                Placed on {formatOrderDate(latestOrder.createdAt)}
              </time>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                {formatPrice(latestOrder.subtotal)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {latestOrder.itemCount} item
                {latestOrder.itemCount === 1 ? "" : "s"}
              </p>
            </div>
          </article>
        ) : (
          <div className="ios-card p-8 text-center">
            <h3 className="font-display text-lg text-[var(--text-strong)]">
              No orders yet
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Discover our drinks and snacks, then place your first pickup
              order.
            </p>
            <div className="mt-5">
              <Link
                href="/menu"
                className="button-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 font-semibold"
              >
                Browse Menu
              </Link>
            </div>
          </div>
        )}
      </section>
    </Container>
  );
}
