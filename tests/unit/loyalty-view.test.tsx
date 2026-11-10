import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RewardsView } from "@/components/loyalty/rewards-view";
import { useAuth } from "@/context/auth-context";
import {
  fetchLoyaltyBalance,
  fetchLoyaltyHistory,
  fetchLoyaltyRewards,
  fetchLoyaltySettings,
  redeemReward,
} from "@/lib/loyalty/loyalty-client";
import type {
  LoyaltyProgramSettings,
  LoyaltyTransaction,
  RewardItem,
} from "@/lib/loyalty/types";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/loyalty/loyalty-client", () => ({
  fetchLoyaltyBalance: vi.fn(),
  fetchLoyaltyHistory: vi.fn(),
  fetchLoyaltyRewards: vi.fn(),
  fetchLoyaltySettings: vi.fn(),
  redeemReward: vi.fn(),
}));

const mockSettings: LoyaltyProgramSettings = {
  currencyStep: 10,
  pointsPerStep: 1,
  weeklyLimit: 2,
};

const mockRewards: RewardItem[] = [
  {
    id: "reward-takoyaki-6",
    name: "Takoyaki (6 pcs)",
    description: "6 pieces of freshly cooked savory Takoyaki.",
    points: 50,
  },
  {
    id: "reward-iced-latte-16",
    name: "Iced Latte (16 oz)",
    description: "A refreshing 16 oz cup of iced espresso latte.",
    points: 80,
  },
  {
    id: "reward-brew-special-16",
    name: "Brew Special Coffee (16 oz)",
    description: "Our signature 16 oz house blend with caramel or vanilla.",
    points: 100,
  },
];

const mockHistory: LoyaltyTransaction[] = [
  {
    id: 1,
    customerId: "customer-123",
    points: 12,
    reason: "order-completed",
    orderId: "order-1",
    orderReference: "BNC-ABCDEF",
    note: null,
    createdAt: "2026-11-10T10:00:00Z",
  },
  {
    id: 2,
    customerId: "customer-123",
    points: -50,
    reason: "reward-redeemed",
    orderId: null,
    orderReference: null,
    note: "Redeemed: Takoyaki (6 pcs) (RWD-123456)",
    createdAt: "2026-11-09T14:30:00Z",
  },
];

describe("RewardsView component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "customer-123" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(fetchLoyaltyBalance).mockResolvedValue(60);
    vi.mocked(fetchLoyaltyHistory).mockResolvedValue(mockHistory);
    vi.mocked(fetchLoyaltyRewards).mockResolvedValue(mockRewards);
    vi.mocked(fetchLoyaltySettings).mockResolvedValue(mockSettings);
  });

  it("shows loading skeleton while fetching data", () => {
    vi.mocked(fetchLoyaltyBalance).mockReturnValue(new Promise(() => {}));
    render(<RewardsView />);
    expect(screen.getByTestId("loyalty-loading")).toBeInTheDocument();
  });

  it("displays current points balance and program rules in plain words", async () => {
    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getByTestId("loyalty-balance")).toHaveTextContent("60");
    });

    expect(
      screen.getByText("Earn 1 point for every ₱10 spent on completed orders."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Redeem up to 2 rewards per week."),
    ).toBeInTheDocument();
  });

  it("displays rewards with enough and not enough points indicators", async () => {
    // Balance is 60:
    // Takoyaki (50 pts) -> balance is enough
    // Iced Latte (80 pts) -> need 20 more pts
    // Brew Special (100 pts) -> need 40 more pts
    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getByText("Takoyaki (6 pcs)")).toBeInTheDocument();
    });

    expect(screen.getByText("Balance is enough")).toBeInTheDocument();
    expect(screen.getByText("Need 20 more pts")).toBeInTheDocument();
    expect(screen.getByText("Need 40 more pts")).toBeInTheDocument();

    const takoyakiCard = screen.getByTestId("reward-card-reward-takoyaki-6");
    const latteCard = screen.getByTestId("reward-card-reward-iced-latte-16");

    expect(
      takoyakiCard.querySelector("button[aria-label*='Takoyaki']"),
    ).toBeEnabled();
    expect(
      latteCard.querySelector("button[aria-label*='Iced Latte']"),
    ).toBeDisabled();
  });

  it("displays points history with formatted signs, plain reasons, and order references", async () => {
    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getByTestId("history-row-1")).toBeInTheDocument();
    });

    const row1 = screen.getByTestId("history-row-1");
    expect(row1).toHaveTextContent("Order completed");
    expect(row1).toHaveTextContent("BNC-ABCDEF");
    expect(row1).toHaveTextContent("+12 pts");

    const row2 = screen.getByTestId("history-row-2");
    expect(row2).toHaveTextContent("Redeemed: Takoyaki (6 pcs) (RWD-123456)");
    expect(row2).toHaveTextContent("−50 pts");
  });

  it("displays empty state when customer has no transactions", async () => {
    vi.mocked(fetchLoyaltyBalance).mockResolvedValue(0);
    vi.mocked(fetchLoyaltyHistory).mockResolvedValue([]);
    render(<RewardsView />);

    await waitFor(() => {
      expect(screen.getByText("No Points Yet")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "No points yet. You earn points when a pickup order is completed.",
      ),
    ).toBeInTheDocument();
  });

  it("displays error banner when loading fails", async () => {
    vi.mocked(fetchLoyaltyBalance).mockRejectedValue(
      new Error("Database connection error"),
    );
    render(<RewardsView />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Database connection error",
      );
    });
  });

  it("supports reward redemption confirmation and displays counter code upon success", async () => {
    const user = userEvent.setup();
    vi.mocked(redeemReward).mockResolvedValue({
      ok: true,
      code: "RWD-999888",
      rewardName: "Takoyaki (6 pcs)",
      pointsSpent: 50,
      newBalance: 10,
    });

    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getByText("Takoyaki (6 pcs)")).toBeInTheDocument();
    });

    const takoyakiCard = screen.getByTestId("reward-card-reward-takoyaki-6");
    const redeemBtn = takoyakiCard.querySelector(
      "button[aria-label*='Takoyaki']",
    );
    expect(redeemBtn).toBeInTheDocument();
    await user.click(redeemBtn!);

    // Confirmation dialog appears
    expect(screen.getByText("Confirm Redemption")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to redeem/i),
    ).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByRole("button", { name: "Confirm Redeem" });
    await user.click(confirmBtn);

    // Success code appears
    await waitFor(() => {
      expect(screen.getByText("Reward Redeemed!")).toBeInTheDocument();
    });
    expect(screen.getByText("RWD-999888")).toBeInTheDocument();
    expect(screen.getByText(/New balance:/i)).toBeInTheDocument();
  });
});
