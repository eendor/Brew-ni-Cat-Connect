import { expect, test, type Page } from "@playwright/test";

/**
 * Customer loyalty points and rewards (FR-050 to FR-055).
 *
 * Supabase Auth, PostgREST, and RPC endpoints are mocked in the browser,
 * ensuring no live account or live database is contacted.
 *
 * Set CAPTURE_EVIDENCE=1 to capture screenshots into
 * docs/evidence/phase-5/loyalty/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-5/loyalty";

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

const mockSession = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "mock-refresh-token",
  user: mockUser,
};

const mockRewards = [
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
  {
    id: "reward-snack-combo",
    name: "Takoyaki & Latte Combo",
    description: "16 oz Iced Latte paired with 6 pcs Takoyaki.",
    points: 120,
  },
];

const mockSettings = {
  currencyStep: 10,
  pointsPerStep: 1,
  weeklyLimit: 2,
};

const mockTransactions = [
  {
    id: 1,
    customer_id: "customer-123",
    points: 25,
    reason: "order-completed",
    order_id: "order-1",
    note: null,
    created_at: "2026-11-10T08:30:00Z",
    online_orders: { reference: "BNC-ABCDEF" },
  },
  {
    id: 2,
    customer_id: "customer-123",
    points: 35,
    reason: "order-completed",
    order_id: "order-2",
    note: null,
    created_at: "2026-11-08T11:15:00Z",
    online_orders: { reference: "BNC-GHKLMN" },
  },
];

async function signIn(page: Page) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    { key: storageKey, session: mockSession },
  );
}

async function mockLoyaltyBackend(
  page: Page,
  transactions: unknown[] = mockTransactions,
) {
  // Mock loyalty_rewards RPC
  await page.route("**/rest/v1/rpc/loyalty_rewards*", (route) =>
    route.fulfill({ json: mockRewards }),
  );

  // Mock loyalty_settings RPC
  await page.route("**/rest/v1/rpc/loyalty_settings*", (route) =>
    route.fulfill({ json: mockSettings }),
  );

  // Mock loyalty_transactions table
  await page.route("**/rest/v1/loyalty_transactions*", (route) => {
    const url = new URL(route.request().url());
    const select = url.searchParams.get("select");

    // If query is for balance only (select=points)
    if (select === "points") {
      const pointsOnly = (transactions as { points: number }[]).map((t) => ({
        points: t.points,
      }));
      return route.fulfill({ json: pointsOnly });
    }

    return route.fulfill({ json: transactions });
  });

  // Mock redeem_reward RPC
  await page.route("**/rest/v1/rpc/redeem_reward*", (route) =>
    route.fulfill({
      json: {
        ok: true,
        code: "RWD-872619",
        rewardName: "Takoyaki (6 pcs)",
        pointsSpent: 50,
        newBalance: 10,
      },
    }),
  );
}

async function capture(page: Page, filename: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${filename}`,
    fullPage: true,
  });
}

test.describe("Customer loyalty and rewards", () => {
  test("TC-P5-125 — signed-in customer sees balance, program rules, rewards catalog, and history at 1440x900", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockLoyaltyBackend(page);
    await signIn(page);

    await page.goto("/account/rewards");

    // Check heading
    await expect(
      page.getByRole("heading", { level: 1, name: "Loyalty & Rewards" }),
    ).toBeVisible();

    // Check balance (25 + 35 = 60 points)
    await expect(page.getByTestId("loyalty-balance")).toHaveText("60");

    // Check plain-word program rules
    await expect(
      page.getByText("Earn 1 point for every ₱10 spent on completed orders."),
    ).toBeVisible();
    await expect(
      page.getByText("Redeem up to 2 rewards per week."),
    ).toBeVisible();

    // Check rewards catalog
    await expect(
      page.getByRole("heading", { level: 2, name: "Rewards Catalog" }),
    ).toBeVisible();
    await expect(page.getByText("Takoyaki (6 pcs)")).toBeVisible();
    await expect(page.getByText("Balance is enough")).toBeVisible();
    await expect(page.getByText("Need 20 more pts")).toBeVisible();

    // Check history rows
    await expect(
      page.getByRole("heading", { level: 2, name: "Points History" }),
    ).toBeVisible();
    await expect(page.getByText("BNC-ABCDEF")).toBeVisible();
    await expect(page.getByText("BNC-GHKLMN")).toBeVisible();

    await capture(page, "rewards-page-1440x900.png");
  });

  test("TC-P5-126 — mobile customer sees responsive layout at 390x844", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockLoyaltyBackend(page);
    await signIn(page);

    await page.goto("/account/rewards");

    await expect(
      page.getByRole("heading", { level: 1, name: "Loyalty & Rewards" }),
    ).toBeVisible();
    await expect(page.getByTestId("loyalty-balance")).toHaveText("60");
    await expect(page.getByText("Takoyaki (6 pcs)")).toBeVisible();

    await capture(page, "rewards-page-390x844.png");
  });

  test("TC-P5-127 — shows empty points history when customer has no transactions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockLoyaltyBackend(page, []);
    await signIn(page);

    await page.goto("/account/rewards");

    await expect(page.getByTestId("loyalty-balance")).toHaveText("0");
    await expect(
      page.getByRole("heading", { name: "No Points Yet" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "No points yet. You earn points when a pickup order is completed.",
      ),
    ).toBeVisible();

    await capture(page, "rewards-empty-1440x900.png");
  });
});
