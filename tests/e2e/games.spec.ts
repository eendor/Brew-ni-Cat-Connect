import { expect, test, type Page } from "@playwright/test";

/**
 * Loyalty mini-games (FR-089). Supabase Auth and the game RPCs are mocked
 * in the browser, so no live account or database is touched. The mock
 * plays the server's part: it decides each result and counts the plays.
 *
 * Set CAPTURE_EVIDENCE=1 to save screenshots to docs/evidence/phase-9/games/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/games";

const mockUser = {
  id: "customer-123",
  aud: "authenticated",
  role: "authenticated",
  email: "customer@example.com",
  email_confirmed_at: "2026-11-01T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const GAMES = [
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
];

async function signIn(page: Page) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const session = {
    access_token: "mock-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token",
    user: mockUser,
  };
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: session },
  );
}

async function mockGames(page: Page) {
  const played: { choice: number | null; game: string }[] = [];
  let balance = 12;
  await page.route("**/rest/v1/loyalty_transactions*", (route) =>
    route.fulfill({ json: [{ points: balance }] }),
  );
  await page.route("**/rest/v1/rpc/mini_game_status*", (route) =>
    route.fulfill({
      json: {
        dailyPlays: 3,
        playsToday: played.length,
        playsLeft: 3 - played.length,
        games: GAMES,
      },
    }),
  );
  await page.route("**/rest/v1/rpc/play_mini_game*", (route) => {
    const body = route.request().postDataJSON() as {
      p_game: string;
      p_choice: number | null;
    };
    if (played.length >= 3) {
      return route.fulfill({
        json: { ok: false, error: "daily_limit_reached", playsLeft: 0 },
      });
    }
    played.push({ game: body.p_game, choice: body.p_choice });
    const cups = body.p_game === "cat-cups";
    // the "server" hides Oreo under the middle cup
    const won = cups && body.p_choice === 1;
    const points = cups ? (won ? 3 : 1) : 2;
    balance += points;
    return route.fulfill({
      json: {
        ok: true,
        playId: played.length,
        game: body.p_game,
        outcome: cups ? { hiddenUnder: 1, won } : { treat: points },
        points,
        playsLeft: 3 - played.length,
        balance,
      },
    });
  });
  return played;
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${name}.png`,
    fullPage: true,
  });
}

test.describe("Cat games", () => {
  test("TC-P9-040 — a signed-in customer plays three times at 1440 wide, then the games close for the day", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    const played = await mockGames(page);

    await page.goto("/games");
    await expect(
      page.getByRole("heading", { level: 1, name: "Cat games" }),
    ).toBeVisible();
    const summary = page.getByTestId("games-summary");
    await expect(summary).toContainText("3 plays left today");
    await expect(summary).toContainText("12 pts");
    await expect(page.getByTestId("cat-sprite-latte")).toBeVisible();
    await capture(page, "games-desktop");

    await page.getByRole("button", { name: "Cup 2" }).click();
    await expect(page.getByText("You found Oreo! +3 points")).toBeVisible();
    await expect(page.getByTestId("oreo-found")).toBeVisible();
    await expect(summary).toContainText("2 plays left today");
    await expect(summary).toContainText("15 pts");
    await capture(page, "games-cat-cups-won");

    await page.getByRole("button", { name: "Hide him again" }).click();
    await page.getByRole("button", { name: "Cup 3" }).click();
    await expect(
      page.getByText("Oreo was under cup 2. +1 point for playing"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Shake the jar" }).click();
    await expect(page.getByText("Latte pawed out 2 points!")).toBeVisible();
    await expect(summary).toContainText("No plays left today");
    await expect(summary).toContainText("18 pts");
    await expect(page.getByTestId("games-done")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Shake the jar" }),
    ).toBeDisabled();
    await capture(page, "games-done");

    expect(played).toEqual([
      { game: "cat-cups", choice: 1 },
      { game: "cat-cups", choice: 2 },
      { game: "lucky-paw", choice: null },
    ]);
    expect(errors).toEqual([]);
  });

  test("TC-P9-041 — at 390 wide, guests get a sign-in link, and before the migration the page says the games open soon", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockGames(page);
    await page.goto("/games");
    await expect(page.getByTestId("games-sign-in")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cup 1" })).toBeDisabled();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, "games-phone-guest");

    await page.unroute("**/rest/v1/rpc/mini_game_status*");
    await page.route("**/rest/v1/rpc/mini_game_status*", (route) =>
      route.fulfill({
        status: 404,
        json: {
          code: "PGRST202",
          message:
            "Could not find the function public.mini_game_status without parameters in the schema cache",
        },
      }),
    );
    await page.reload();
    await expect(page.getByTestId("games-coming-soon")).toContainText(
      "The cats are still setting up",
    );
    await capture(page, "games-coming-soon");
  });

  test("TC-P9-102 — at 390 wide, a guest plays the free arcade games and a best score is kept", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockGames(page);
    await page.goto("/games");
    const arcade = page.getByTestId("arcade");
    await arcade.scrollIntoViewIfNeeded();
    for (const name of [
      "Treat Catcher",
      "Whack-a-Mouse",
      "Cup Stack",
      "Paw Says",
      "Cat Match",
    ]) {
      await expect(arcade.getByText(name, { exact: true })).toBeVisible();
    }
    await capture(page, "arcade-list-phone");

    await page.getByTestId("arcade-whack").click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(
      page.getByRole("button", { name: /^(Hole|Mouse|Golden)/ }),
    ).toHaveCount(9);
    await expect(
      page.getByRole("button", { name: /Mouse in hole/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "← All games" }).click();

    await page.getByTestId("arcade-catch").click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByTestId("catch-board").focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(1500);
    await capture(page, "arcade-catch-phone");
    await page.getByRole("button", { name: "← All games" }).click();

    // A real Cup Stack round: drop cups until one misses
    await page.getByTestId("arcade-stack").click();
    await page.getByRole("button", { name: "Start" }).click();
    const board = page.getByTestId("stack-board");
    await board.focus();
    const result = page.getByTestId("arcade-result");
    for (let i = 0; i < 60 && !(await result.isVisible()); i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(170);
    }
    await expect(result).toBeVisible();
    await capture(page, "arcade-stack-over-phone");
    const best = await page.evaluate(() =>
      window.localStorage.getItem("bnc-arcade-best-stack"),
    );
    await page.getByRole("button", { name: "← All games" }).click();
    await expect(page.getByTestId("arcade-stack")).toHaveText(
      best ? new RegExp(`Best ${best}`) : /Play/,
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
