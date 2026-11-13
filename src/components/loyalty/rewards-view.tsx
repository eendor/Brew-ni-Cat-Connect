"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import { formatEarningRule, formatWeeklyLimit } from "@/lib/loyalty/format";
import {
  fetchLoyaltyBalance,
  fetchLoyaltyRewards,
  fetchLoyaltySettings,
  redeemReward,
} from "@/lib/loyalty/loyalty-client";
import type {
  LoyaltyProgramSettings,
  RedeemResult,
  RewardItem,
} from "@/lib/loyalty/types";

export function RewardsView() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;

  const [balance, setBalance] = useState<number>(0);
  const [rewards, setRewards] = useState<readonly RewardItem[]>([]);
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Redemption state
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !userId) return;
    let active = true;

    Promise.all([
      fetchLoyaltyBalance({ userId }),
      fetchLoyaltyRewards(),
      fetchLoyaltySettings(),
    ])
      .then(([userBalance, activeRewards, programSettings]) => {
        if (!active) return;
        setBalance(userBalance);
        setRewards(activeRewards);
        setSettings(programSettings);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load rewards and points. Please try again later.",
        );
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, isAuthLoading, refreshIndex]);

  const handleStartRedeem = (reward: RewardItem) => {
    setSelectedReward(reward);
    setRedeemError(null);
    setRedeemResult(null);
  };

  const handleCloseModal = () => {
    setSelectedReward(null);
    setRedeemResult(null);
    setRedeemError(null);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !userId) return;

    setIsRedeeming(true);
    setRedeemError(null);

    try {
      const result = await redeemReward(selectedReward.id);
      if (result.ok) {
        setRedeemResult(result);
        // Refresh the balance after successful redemption
        setRefreshIndex((prev) => prev + 1);
      } else {
        if (result.error === "weekly_limit_reached") {
          setRedeemError(
            `You have reached your weekly redemption limit (${result.weeklyLimit ?? 2} per week). Please try again next week.`,
          );
        } else if (result.error === "insufficient_points") {
          setRedeemError(
            `Insufficient points. You need ${result.required ?? selectedReward.points} points for this reward.`,
          );
        } else {
          setRedeemError(
            result.error ||
              "Redemption could not be processed. Please try again.",
          );
        }
      }
    } catch {
      setRedeemError("Failed to process reward redemption. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <Container className="py-8 md:py-12 max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-strong)] tracking-tight">
          Loyalty & Rewards
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Earn points on completed orders and redeem them for delicious treats.
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
          className="space-y-6 animate-pulse"
          aria-busy="true"
        >
          <div className="h-36 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
          <div className="h-64 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
          <div className="h-48 rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Balance and Program Rules Card */}
          <section
            aria-labelledby="balance-heading"
            className="ios-card p-6 md:p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
              <div>
                <span
                  id="balance-heading"
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  Current Balance
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    data-testid="loyalty-balance"
                    className="font-display text-4xl md:text-5xl font-extrabold text-[var(--text-strong)]"
                  >
                    {balance}
                  </span>
                  <span className="text-lg font-medium text-[var(--text-muted)]">
                    points
                  </span>
                </div>
                <Link
                  href="/account/rewards/history"
                  className="mt-2 inline-block text-sm font-medium text-[var(--accent-solid)] hover:underline"
                >
                  See points history →
                </Link>
              </div>

              {settings ? (
                <div className="space-y-1.5 border-t border-[var(--separator)] pt-4 text-sm text-[var(--text-muted)] md:border-t-0 md:border-l md:pt-0 md:pl-10">
                  <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-fill)]" />
                    <span>
                      {formatEarningRule(
                        settings.currencyStep,
                        settings.pointsPerStep,
                      )}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-fill)]" />
                    <span>{formatWeeklyLimit(settings.weeklyLimit)}</span>
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Active Rewards Catalog */}
          <section aria-labelledby="rewards-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="rewards-heading"
                className="font-display text-2xl font-bold text-[var(--text-strong)] tracking-tight"
              >
                Rewards Catalog
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                {rewards.length} {rewards.length === 1 ? "reward" : "rewards"}{" "}
                available
              </span>
            </div>

            {rewards.length === 0 ? (
              <div className="ios-card p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  No rewards are currently available. Please check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => {
                  const hasEnough = balance >= reward.points;
                  const neededPoints = reward.points - balance;

                  return (
                    <div
                      key={reward.id}
                      data-testid={`reward-card-${reward.id}`}
                      className="ios-card flex flex-col justify-between p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-lg font-semibold text-[var(--text-strong)]">
                            {reward.name}
                          </h3>
                          <span className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-full bg-[var(--fill-secondary)] text-[var(--text-strong)]">
                            {reward.points} pts
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
                          {reward.description}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--separator)] pt-4">
                        <span
                          className={`text-sm font-medium ${
                            hasEnough
                              ? "text-[var(--accent-solid)]"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {hasEnough
                            ? "Balance is enough"
                            : `Need ${neededPoints} more pts`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleStartRedeem(reward)}
                          disabled={!hasEnough}
                          aria-label={`Redeem ${reward.name} for ${reward.points} points`}
                          className={
                            hasEnough
                              ? "button-primary"
                              : "button-secondary cursor-not-allowed opacity-50"
                          }
                        >
                          Redeem
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Redemption Dialog / Modal */}
      {selectedReward ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="redeem-dialog-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--ink-scrim)] p-4 backdrop-blur-xs"
        >
          <div className="ios-sheet w-full max-w-md p-6">
            {!redeemResult || !redeemResult.ok ? (
              <div>
                <h3
                  id="redeem-dialog-title"
                  className="font-display text-xl font-bold text-[var(--text-strong)]"
                >
                  Confirm Redemption
                </h3>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Are you sure you want to redeem{" "}
                  <strong className="text-[var(--text-strong)]">
                    {selectedReward.name}
                  </strong>{" "}
                  for{" "}
                  <strong className="text-[var(--text-strong)]">
                    {selectedReward.points} points
                  </strong>
                  ?
                </p>

                {redeemError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)]"
                  >
                    {redeemError}
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isRedeeming}
                    className="button-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRedeem}
                    disabled={isRedeeming}
                    className="button-primary disabled:opacity-50"
                  >
                    {isRedeeming ? "Processing..." : "Confirm Redeem"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl font-bold text-[var(--accent-solid)]">
                  ✓
                </div>
                <h3
                  id="redeem-dialog-title"
                  className="font-display text-xl font-bold text-[var(--text-strong)]"
                >
                  Reward Redeemed!
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Show this code to shop staff at the counter to claim your
                  reward:
                </p>

                <div className="ios-well my-5 p-4">
                  <span className="font-mono text-2xl font-black tracking-widest text-[var(--accent-solid)]">
                    {redeemResult.code}
                  </span>
                </div>

                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <p>
                    Reward: <strong>{redeemResult.rewardName}</strong>
                  </p>
                  <p>
                    Points spent:{" "}
                    <strong>{redeemResult.pointsSpent} pts</strong>
                  </p>
                  <p>
                    New balance: <strong>{redeemResult.newBalance} pts</strong>
                  </p>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="button-primary w-full"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Container>
  );
}
