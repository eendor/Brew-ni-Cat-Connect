import { readFileSync } from "node:fs";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PointsHistoryView } from "@/components/loyalty/points-history-view";
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
  currencyStep: 50,
  pointsPerStep: 1,
  weeklyLimit: 2,
};

const mockRewards: RewardItem[] = [
  {
    id: "reward-kiwi-soda",
    name: "Kiwi soda",
    description: "Refreshing kiwi soda.",
    points: 40,
  },
  {
    id: "reward-passion-fruit-soda",
    name: "Passion fruit soda",
    description: "Refreshing passion fruit soda.",
    points: 40,
  },
  {
    id: "reward-spanish-latte",
    name: "Spanish latte",
    description: "Rich espresso with sweetened milk.",
    points: 50,
  },
  {
    id: "reward-hazelnut-latte",
    name: "Hazelnut latte",
    description: "Espresso with hazelnut flavor and milk.",
    points: 50,
  },
  {
    id: "reward-takoyaki-veggie-4",
    name: "Takoyaki veggie (4 pcs)",
    description: "4 pieces of vegetable Takoyaki.",
    points: 60,
  },
  {
    id: "reward-takoyaki-cheese-4",
    name: "Takoyaki cheese (4 pcs)",
    description: "4 pieces of cheese-filled Takoyaki.",
    points: 70,
  },
  {
    id: "reward-takoyaki-squid-4",
    name: "Takoyaki squid (4 pcs)",
    description: "4 pieces of squid Takoyaki.",
    points: 80,
  },
  {
    id: "reward-takoyaki-shrimp-4",
    name: "Takoyaki shrimp (4 pcs)",
    description: "4 pieces of shrimp Takoyaki.",
    points: 90,
  },
  {
    id: "reward-buldak-carbonara",
    name: "Buldak carbonara",
    description: "Spicy Buldak carbonara noodles.",
    points: 100,
  },
  {
    id: "reward-classy-cat-combo",
    name: "Classy Cat combo",
    description: "Signature combo meal.",
    points: 120,
  },
  {
    id: "reward-nachos-fries-meat-veggies",
    name: "Nachos with fries, meat and veggies",
    description: "Loaded nachos and fries with meat and vegetables.",
    points: 150,
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
    note: "Redeemed: Spanish latte (RWD-123456)",
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
      screen.getByText("Earn 1 point for every ₱50 spent on completed orders."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Redeem up to 2 rewards per week."),
    ).toBeInTheDocument();
  });

  it("displays rewards with enough and not enough points indicators", async () => {
    // Balance is 60:
    // Spanish latte (50 pts) -> balance is enough
    // Takoyaki cheese (4 pcs) (70 pts) -> need 10 more pts
    // Buldak carbonara (100 pts) -> need 40 more pts
    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getAllByText("Spanish latte").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Balance is enough").length).toBeGreaterThan(0);
    expect(screen.getByText("Need 10 more pts")).toBeInTheDocument();
    expect(screen.getByText("Need 40 more pts")).toBeInTheDocument();

    const latteCard = screen.getByTestId("reward-card-reward-spanish-latte");
    const buldakCard = screen.getByTestId(
      "reward-card-reward-buldak-carbonara",
    );

    expect(
      latteCard.querySelector("button[aria-label*='Spanish latte']"),
    ).toBeEnabled();
    expect(
      buldakCard.querySelector("button[aria-label*='Buldak carbonara']"),
    ).toBeDisabled();
  });

  it("links to the points history page and does not list history rows (added 2026-11-13)", async () => {
    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getByTestId("loyalty-balance")).toHaveTextContent("60");
    });
    expect(
      screen.getByRole("link", { name: "See points history →" }),
    ).toHaveAttribute("href", "/account/rewards/history");
    expect(screen.queryByTestId("history-row-1")).not.toBeInTheDocument();
    expect(fetchLoyaltyHistory).not.toHaveBeenCalled();
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
      rewardName: "Spanish latte",
      pointsSpent: 50,
      newBalance: 10,
    });

    render(<RewardsView />);
    await waitFor(() => {
      expect(screen.getAllByText("Spanish latte").length).toBeGreaterThan(0);
    });

    const latteCard = screen.getByTestId("reward-card-reward-spanish-latte");
    const redeemBtn = latteCard.querySelector(
      "button[aria-label*='Spanish latte']",
    );
    expect(redeemBtn).toBeInTheDocument();
    await user.click(redeemBtn!);

    // Confirmation dialog appears
    expect(screen.getByText("Confirm Redemption")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to redeem/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Spanish latte").length).toBeGreaterThan(0);
    expect(screen.getByText("50 points")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Confirm Redeem" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText("Reward Redeemed!")).toBeInTheDocument();
    });

    expect(screen.getByText("RWD-999888")).toBeInTheDocument();
    expect(screen.getByText(/10 pts/i)).toBeInTheDocument(); // new balance

    const closeBtn = screen.getByRole("button", { name: "Done" });
    await user.click(closeBtn);

    expect(
      screen.queryByText("Redemption Successful!"),
    ).not.toBeInTheDocument();
  });
});

// Added 2026-11-13: the points history moved to /account/rewards/history.
describe("PointsHistoryView component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "customer-123" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(fetchLoyaltyBalance).mockResolvedValue(60);
    vi.mocked(fetchLoyaltyHistory).mockResolvedValue(mockHistory);
  });

  it("displays points history with formatted signs, plain reasons, and order references", async () => {
    render(<PointsHistoryView />);
    await waitFor(() => {
      expect(screen.getByTestId("history-row-1")).toBeInTheDocument();
    });

    const row1 = screen.getByTestId("history-row-1");
    expect(row1).toHaveTextContent("Order completed");
    expect(row1).toHaveTextContent("BNC-ABCDEF");
    expect(row1).toHaveTextContent("+12 pts");

    const row2 = screen.getByTestId("history-row-2");
    expect(row2).toHaveTextContent("Redeemed: Spanish latte (RWD-123456)");
    expect(row2).toHaveTextContent("−50 pts");
  });

  it("displays empty state when customer has no transactions", async () => {
    vi.mocked(fetchLoyaltyBalance).mockResolvedValue(0);
    vi.mocked(fetchLoyaltyHistory).mockResolvedValue([]);
    render(<PointsHistoryView />);

    await waitFor(() => {
      expect(screen.getByText("No Points Yet")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "No points yet. You earn points when an order is completed.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the balance and a link back to Rewards", async () => {
    render(<PointsHistoryView />);
    await waitFor(() => {
      expect(screen.getByTestId("history-balance")).toHaveTextContent(
        "60 points",
      );
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Points History" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← Back to Rewards" }),
    ).toHaveAttribute("href", "/account/rewards");
  });

  it("shows an error banner when loading fails", async () => {
    vi.mocked(fetchLoyaltyHistory).mockRejectedValue(new Error("Offline"));
    render(<PointsHistoryView />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Offline");
    });
  });
});

// Added 2026-11-11: the page once used four CSS variables that do not exist,
// which drew black borders and faded buttons.
describe("RewardsView styles", () => {
  it("TC-P5-210 — every CSS variable the rewards page uses exists in globals.css", () => {
    const view = [
      "src/components/loyalty/rewards-view.tsx",
      "src/components/loyalty/points-history-view.tsx",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const css = readFileSync("src/app/globals.css", "utf8");
    const used = [...new Set(view.match(/var\((--[a-z0-9-]+)\)/g) ?? [])].map(
      (v) => v.slice(4, -1),
    );
    expect(used.length).toBeGreaterThan(0);
    const missing = used.filter((name) => !css.includes(`${name}:`));
    expect(missing).toEqual([]);
  });
});
