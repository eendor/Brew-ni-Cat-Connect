import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GamesView } from "@/components/games/games-view";
import { RewardsView } from "@/components/loyalty/rewards-view";
import { useAuth } from "@/context/auth-context";
import {
  fetchGameStatus,
  type GameStatus,
  playMiniGame,
  prizeChanceLabel,
} from "@/lib/games/games";
import {
  formatRedeemError,
  formatRewardAvailability,
  rewardCodeStatus,
} from "@/lib/loyalty/format";
import {
  fetchLoyaltyBalance,
  fetchLoyaltyRewards,
  fetchLoyaltySettings,
  fetchRewardCodes,
  redeemReward,
} from "@/lib/loyalty/loyalty-client";

vi.mock("next/navigation", () => ({ usePathname: () => "/games" }));
vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/loyalty/loyalty-client", () => ({
  fetchLoyaltyBalance: vi.fn(),
  fetchLoyaltyRewards: vi.fn(),
  fetchLoyaltySettings: vi.fn(),
  fetchRewardCodes: vi.fn(),
  redeemReward: vi.fn(),
}));
vi.mock("@/lib/games/games", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/games/games")>();
  return { ...actual, fetchGameStatus: vi.fn(), playMiniGame: vi.fn() };
});

const FUTURE = "2099-01-31T00:00:00Z";
const PAST = "2020-01-31T00:00:00Z";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "customer-1" },
    isLoading: false,
  } as unknown as ReturnType<typeof useAuth>);
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  vi.mocked(fetchLoyaltyBalance).mockResolvedValue(100);
  vi.mocked(fetchLoyaltySettings).mockResolvedValue({
    currencyStep: 50,
    pointsPerStep: 1,
    weeklyLimit: 2,
  });
});

describe("rewards the owner manages (FR-088)", () => {
  it("TC-P9-061 — sold-out and claimed-today rewards can't be redeemed; low stock shows; codes list their state", async () => {
    vi.mocked(fetchLoyaltyRewards).mockResolvedValue([
      {
        id: "a",
        name: "Kiwi soda",
        description: "",
        points: 40,
        stockLeft: 0,
        unavailable: "out_of_stock",
      },
      {
        id: "b",
        name: "Spanish latte",
        description: "",
        points: 50,
        dailyLimit: 3,
        unavailable: "daily_limit_reached",
      },
      {
        id: "c",
        name: "Cat sticker",
        description: "",
        points: 15,
        stockLeft: 3,
        unavailable: null,
      },
    ]);
    vi.mocked(fetchRewardCodes).mockResolvedValue([
      {
        code: "PRZ-ABCDEFGH",
        rewardName: "Free cookie",
        source: "mini-game",
        createdAt: PAST,
        expiresAt: FUTURE,
        redeemedAt: null,
      },
      {
        code: "RWD-JKMNPQRS",
        rewardName: "Kiwi soda",
        source: "points",
        createdAt: PAST,
        expiresAt: FUTURE,
        redeemedAt: PAST,
      },
      {
        code: "RWD-TUVWXYZ2",
        rewardName: "Spanish latte",
        source: "points",
        createdAt: PAST,
        expiresAt: PAST,
        redeemedAt: null,
      },
    ]);
    render(<RewardsView />);

    expect(
      await screen.findByTestId("reward-availability-a"),
    ).toHaveTextContent("Sold out");
    expect(screen.getByTestId("reward-availability-b")).toHaveTextContent(
      "All claimed today",
    );
    expect(screen.getByTestId("reward-availability-c")).toHaveTextContent(
      "Only 3 left",
    );
    expect(
      screen.getByRole("button", { name: /Redeem Kiwi soda/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Redeem Spanish latte/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Redeem Cat sticker/ }),
    ).toBeEnabled();

    expect(screen.getByTestId("reward-code-PRZ-ABCDEFGH")).toHaveTextContent(
      "Won in a game",
    );
    expect(screen.getByTestId("reward-code-PRZ-ABCDEFGH")).toHaveTextContent(
      "Ready to use",
    );
    expect(screen.getByTestId("reward-code-RWD-JKMNPQRS")).toHaveTextContent(
      "Used",
    );
    expect(screen.getByTestId("reward-code-RWD-TUVWXYZ2")).toHaveTextContent(
      "Expired",
    );
  });

  it("TC-P9-062 — a redeemed code shows its use-by date; a reward that sells out meanwhile says no points were used", async () => {
    vi.mocked(fetchLoyaltyRewards).mockResolvedValue([
      {
        id: "c",
        name: "Cat sticker",
        description: "",
        points: 15,
        stockLeft: 3,
        unavailable: null,
      },
    ]);
    vi.mocked(fetchRewardCodes).mockResolvedValue([]);
    vi.mocked(redeemReward).mockResolvedValueOnce({
      ok: false,
      error: "out_of_stock",
    });
    render(<RewardsView />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Redeem Cat sticker/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm Redeem" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "just sold out. Your points weren't used.",
    );

    vi.mocked(redeemReward).mockResolvedValueOnce({
      ok: true,
      code: "RWD-ABCDEFGH",
      expiresAt: "2099-01-31T00:00:00Z",
      rewardName: "Cat sticker",
      pointsSpent: 15,
      newBalance: 85,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm Redeem" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("RWD-ABCDEFGH")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Use by: Jan 31, 2099 · works once");
  });

  it("TC-P9-063 — the games list the owner's prizes and show a won prize's code", async () => {
    const status: GameStatus = {
      dailyPlays: 3,
      playsToday: 0,
      playsLeft: 3,
      games: [
        {
          id: "lucky-paw",
          name: "Lucky paw",
          description: "Shake.",
          choices: 0,
          winPoints: null,
          tryPoints: null,
          maxPoints: 5,
        },
      ],
      prizes: [
        {
          id: "prize-cookie",
          name: "Free cookie",
          description: "One cat cookie.",
          winChance: 20,
          available: true,
        },
        {
          id: "prize-mug",
          name: "Cat mug",
          description: "",
          winChance: 5,
          available: false,
        },
      ],
    };
    vi.mocked(fetchGameStatus).mockResolvedValue(status);
    vi.mocked(playMiniGame).mockResolvedValue({
      ok: true,
      playId: 9,
      game: "lucky-paw",
      outcome: { treat: 2 },
      points: 2,
      playsLeft: 2,
      balance: 102,
      prize: {
        id: "prize-cookie",
        name: "Free cookie",
        code: "PRZ-ABCDEFGH",
        expiresAt: FUTURE,
      },
    });
    render(<GamesView />);

    expect(
      await screen.findByTestId("game-prize-prize-cookie"),
    ).toHaveTextContent("About 1 in 50 plays");
    expect(screen.getByTestId("game-prize-prize-mug")).toHaveTextContent(
      "All won for now",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Shake the jar" }),
    );
    const won = await screen.findByTestId("games-prize");
    expect(won).toHaveTextContent("Free cookie");
    expect(won).toHaveTextContent("PRZ-ABCDEFGH");
    expect(won).toHaveTextContent("It works once");
  });

  it("TC-P9-064 — code states, availability and refusal wording", () => {
    const now = new Date("2026-11-17T00:00:00Z");
    expect(
      rewardCodeStatus(
        { expiresAt: "2026-11-18T00:00:00Z", redeemedAt: null },
        now,
      ),
    ).toBe("ready");
    expect(
      rewardCodeStatus(
        { expiresAt: "2026-11-16T00:00:00Z", redeemedAt: null },
        now,
      ),
    ).toBe("expired");
    expect(
      rewardCodeStatus(
        {
          expiresAt: "2026-11-18T00:00:00Z",
          redeemedAt: "2026-11-16T00:00:00Z",
        },
        now,
      ),
    ).toBe("used");
    expect(
      formatRewardAvailability({ stockLeft: null, unavailable: null }),
    ).toBeNull();
    expect(
      formatRewardAvailability({ stockLeft: 50, unavailable: null }),
    ).toBeNull();
    expect(formatRewardAvailability({ stockLeft: 1, unavailable: null })).toBe(
      "Only 1 left",
    );
    expect(formatRedeemError("daily_limit_reached")).toMatch(
      /Try again tomorrow/,
    );
    expect(
      formatRedeemError("weekly_limit_reached", { weeklyLimit: 2 }),
    ).toMatch(/2 per week/);
    expect(prizeChanceLabel(1000)).toBe("Every play");
    expect(prizeChanceLabel(100)).toBe("About 1 in 10 plays");
  });
});
