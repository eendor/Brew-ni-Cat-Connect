"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import {
  formatLoyaltyDate,
  formatPointsDelta,
  formatReason,
} from "@/lib/loyalty/format";
import {
  fetchLoyaltyBalance,
  fetchLoyaltyHistory,
} from "@/lib/loyalty/loyalty-client";
import type { LoyaltyTransaction } from "@/lib/loyalty/types";

/** The customer's points history, on its own page at /account/rewards/history. */
export function PointsHistoryView() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;

  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<readonly LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !userId) return;
    let active = true;

    Promise.all([
      fetchLoyaltyBalance({ userId }),
      fetchLoyaltyHistory({ userId }),
    ])
      .then(([userBalance, userHistory]) => {
        if (!active) return;
        setBalance(userBalance);
        setHistory(userHistory);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your points history. Please try again later.",
        );
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, isAuthLoading]);

  return (
    <Container className="py-8 md:py-12 max-w-4xl">
      <header className="mb-8">
        <Link
          href="/account/rewards"
          className="text-sm font-medium text-[var(--accent-solid)] hover:underline"
        >
          ← Back to Rewards
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-[var(--text-strong)] tracking-tight">
          Points History
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Every point you earned or spent, newest first.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div
          data-testid="loyalty-loading"
          className="space-y-4 animate-pulse"
          aria-busy="true"
        >
          <div className="h-16 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
          <div className="h-64 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
        </div>
      ) : error ? null : (
        <div className="space-y-6">
          <p className="text-sm text-[var(--text-muted)]">
            Current balance:{" "}
            <strong
              data-testid="history-balance"
              className="text-[var(--text-strong)]"
            >
              {balance} points
            </strong>
          </p>

          {history.length === 0 ? (
            <div className="ios-card p-8 text-center md:p-10">
              <h2 className="font-display text-lg font-semibold text-[var(--text-strong)]">
                No Points Yet
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)] max-w-md mx-auto">
                No points yet. You earn points when an order is completed.
              </p>
              <div className="mt-6">
                <Link href="/menu" className="button-primary">
                  View Menu
                </Link>
              </div>
            </div>
          ) : (
            <ul className="ios-card divide-y divide-[var(--separator)] overflow-hidden">
              {history.map((tx) => {
                const isPositive = tx.points > 0;
                return (
                  <li
                    key={tx.id}
                    data-testid={`history-row-${tx.id}`}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-strong)]">
                          {formatReason(tx.reason, tx.note)}
                        </span>
                        {tx.orderReference ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--fill-secondary)] font-mono text-[var(--text-muted)]">
                            {tx.orderReference}
                          </span>
                        ) : null}
                      </div>
                      {tx.note ? (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {tx.note}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatLoyaltyDate(tx.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold ${
                        isPositive
                          ? "text-[var(--accent-solid)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {formatPointsDelta(tx.points)} pts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Container>
  );
}
