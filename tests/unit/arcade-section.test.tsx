import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArcadeSection } from "@/components/games/arcade-section";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.useRealTimers());

describe("Arcade section (FR-123)", () => {
  it("TC-P9-101 — lists the five games with Play or the saved best", () => {
    window.localStorage.setItem("bnc-arcade-best-memory", "14");
    render(<ArcadeSection />);
    expect(
      screen.getByText("Free play, no coins. Beat your own best!"),
    ).toBeInTheDocument();
    for (const name of [
      "Treat Catcher",
      "Whack-a-Mouse",
      "Cup Stack",
      "Paw Says",
      "Cat Match",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByTestId("arcade-memory")).toHaveTextContent("Best 14");
    expect(screen.getByTestId("arcade-stack")).toHaveTextContent("Play");
  });

  it("TC-P9-101 — Cat Match played to the end saves a new best, and a worse game doesn't", async () => {
    const user = userEvent.setup();
    // rnd 0.999 leaves the deck unshuffled: cards 2i and 2i+1 match
    render(<ArcadeSection rnd={() => 0.999} />);
    await user.click(screen.getByTestId("arcade-memory"));
    await user.click(screen.getByRole("button", { name: "Start" }));
    for (let i = 0; i < 16; i++) {
      await user.click(
        screen.getByRole("button", { name: new RegExp(`^Card ${i + 1}\\b`) }),
      );
    }
    expect(screen.getByTestId("arcade-result")).toHaveTextContent("New best!");
    expect(screen.getByText("You got 8 moves.")).toBeInTheDocument();
    expect(window.localStorage.getItem("bnc-arcade-best-memory")).toBe("8");

    window.localStorage.setItem("bnc-arcade-best-memory", "8");
    await user.click(screen.getByRole("button", { name: "Play again" }));
    // One mismatch first, then the pairs: 9 moves
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await user.click(screen.getByRole("button", { name: /^Card 1\b/ }));
    await user.click(screen.getByRole("button", { name: /^Card 3\b/ }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    for (let i = 0; i < 16; i++) {
      await user.click(
        screen.getByRole("button", { name: new RegExp(`^Card ${i + 1}\\b`) }),
      );
    }
    expect(screen.getByTestId("arcade-result")).toHaveTextContent("Nice try!");
    expect(window.localStorage.getItem("bnc-arcade-best-memory")).toBe("8");

    await user.click(screen.getByRole("button", { name: "← All games" }));
    expect(screen.getByTestId("arcade-memory")).toHaveTextContent("Best 8");
  }, 20_000);
});
