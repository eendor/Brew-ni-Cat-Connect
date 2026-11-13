import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GamesView } from "@/components/games/games-view";
import { useAuth } from "@/context/auth-context";
import {
  fetchGameStatus,
  GamesUnavailableError,
  type GameStatus,
  isMissingFunction,
  playErrorMessage,
  playMiniGame,
  playsLeftLabel,
  pointsLabel,
} from "@/lib/games/games";
import { fetchLoyaltyBalance } from "@/lib/loyalty/loyalty-client";
import { formatReason } from "@/lib/loyalty/format";

vi.mock("next/navigation", () => ({ usePathname: () => "/games" }));
vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/loyalty/loyalty-client", () => ({
  fetchLoyaltyBalance: vi.fn(),
}));
vi.mock("@/lib/games/games", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/games/games")>();
  return { ...actual, fetchGameStatus: vi.fn(), playMiniGame: vi.fn() };
});

const STATUS: GameStatus = {
  dailyPlays: 3,
  playsToday: 0,
  playsLeft: 3,
  games: [
    {
      id: "cat-cups",
      name: "Cat cups",
      description: "Oreo hides under one of three cups. Find him!",
      choices: 3,
      winPoints: 3,
      tryPoints: 1,
      maxPoints: 3,
    },
    {
      id: "lucky-paw",
      name: "Lucky paw",
      description: "Shake the treat jar and see what Latte paws out.",
      choices: 0,
      winPoints: null,
      tryPoints: null,
      maxPoints: 5,
    },
  ],
};

function signIn(id: string | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: id ? { id } : null,
    isLoading: false,
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // reduced motion, so the cups move without animation frames
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  vi.mocked(fetchGameStatus).mockResolvedValue(STATUS);
  vi.mocked(fetchLoyaltyBalance).mockResolvedValue(12);
});

describe("Cat games page (FR-089)", () => {
  it("TC-P9-034 — Cat cups shows where the server hid Oreo and the points paid", async () => {
    signIn("customer-1");
    vi.mocked(playMiniGame).mockResolvedValue({
      ok: true,
      playId: 1,
      game: "cat-cups",
      outcome: { hiddenUnder: 2, won: false },
      points: 1,
      playsLeft: 2,
      balance: 13,
    });
    render(<GamesView />);
    const summary = await screen.findByTestId("games-summary");
    expect(summary).toHaveTextContent("3 plays left today");
    expect(summary).toHaveTextContent("12 pts");

    await userEvent.click(screen.getByRole("button", { name: "Cup 1" }));
    expect(playMiniGame).toHaveBeenCalledWith("cat-cups", 0);
    expect(
      await screen.findByText("Oreo was under cup 3. +1 point for playing"),
    ).toBeInTheDocument();
    expect(summary).toHaveTextContent("2 plays left today");
    expect(summary).toHaveTextContent("13 pts");
    expect(screen.getByTestId("oreo-found")).toBeInTheDocument();
    // no second play from the same round
    expect(screen.getByRole("button", { name: "Cup 2" })).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: "Hide him again" }),
    );
    expect(screen.queryByTestId("oreo-found")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cup 2" })).toBeEnabled();
  });

  it("TC-P9-035 — Lucky paw shows the treat; the last play turns every game off", async () => {
    signIn("customer-1");
    vi.mocked(fetchGameStatus).mockResolvedValue({
      ...STATUS,
      playsToday: 2,
      playsLeft: 1,
    });
    vi.mocked(playMiniGame).mockResolvedValue({
      ok: true,
      playId: 2,
      game: "lucky-paw",
      outcome: { treat: 5 },
      points: 5,
      playsLeft: 0,
      balance: 17,
    });
    render(<GamesView />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Shake the jar" }),
    );
    expect(playMiniGame).toHaveBeenCalledWith("lucky-paw", null);
    expect(
      await screen.findByText("Latte pawed out 5 points!"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("games-done")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Shake the jar" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cup 1" })).toBeDisabled();
  });

  it("TC-P9-036 — a refused play says why and leaves the cups to pick again", async () => {
    signIn("customer-1");
    vi.mocked(playMiniGame).mockResolvedValue({ ok: false, error: "failed" });
    render(<GamesView />);
    await userEvent.click(await screen.findByRole("button", { name: "Cup 2" }));
    expect(
      await screen.findByText(
        "Something went wrong. Your play wasn't used. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cup 2" })).toBeEnabled();
  });

  it("TC-P9-037 — guests see the games with a sign-in link and can't play", async () => {
    signIn(null);
    render(<GamesView />);
    const prompt = await screen.findByTestId("games-sign-in");
    expect(prompt.querySelector("a")).toHaveAttribute(
      "href",
      "/account/sign-in?returnTo=/games",
    );
    expect(screen.getByRole("button", { name: "Cup 1" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Shake the jar" }),
    ).toBeDisabled();
    expect(fetchLoyaltyBalance).not.toHaveBeenCalled();
    expect(screen.queryByTestId("games-summary")).not.toBeInTheDocument();
  });

  it("TC-P9-038 — before the games are on the database, the page says they open soon", async () => {
    signIn("customer-1");
    vi.mocked(fetchGameStatus).mockRejectedValue(new GamesUnavailableError());
    render(<GamesView />);
    expect(await screen.findByTestId("games-coming-soon")).toHaveTextContent(
      "The cats are still setting up",
    );
    expect(
      screen.queryByRole("button", { name: "Cup 1" }),
    ).not.toBeInTheDocument();
  });

  it("TC-P9-039 — wording and missing-function detection", () => {
    expect(pointsLabel(1)).toBe("1 point");
    expect(pointsLabel(3)).toBe("3 points");
    expect(playsLeftLabel(1)).toBe("1 play left today");
    expect(playsLeftLabel(0)).toBe("No plays left today");
    expect(playErrorMessage("daily_limit_reached")).toMatch(/tomorrow/);
    expect(isMissingFunction({ code: "PGRST202" })).toBe(true);
    expect(
      isMissingFunction({ message: "Could not find the function public.x" }),
    ).toBe(true);
    expect(isMissingFunction({ code: "42501" })).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
    expect(formatReason("mini-game", "Mini-game: Cat cups")).toBe(
      "Mini-game: Cat cups",
    );
    expect(formatReason("mini-game")).toBe("Mini-game");
  });

  it("TC-P9-049 — links back to the order the customer left, and shows no link otherwise", async () => {
    signIn("customer-1");
    window.sessionStorage.clear();
    const { unmount } = render(<GamesView />);
    await screen.findByTestId("games-summary");
    expect(screen.queryByTestId("back-to-order")).toBeNull();
    unmount();

    window.sessionStorage.setItem(
      "bnc-waiting-order",
      "/orders/BNC-7K2Q9F#token=abc",
    );
    render(<GamesView />);
    expect(
      await screen.findByRole("link", { name: "← Back to your order" }),
    ).toHaveAttribute("href", "/orders/BNC-7K2Q9F#token=abc");
    window.sessionStorage.clear();
  });
});
