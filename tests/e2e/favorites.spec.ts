import { expect, test, type Page } from "@playwright/test";

/**
 * Customer favorites (FR-040).
 *
 * Supabase Auth and PostgREST are mocked in the browser, so no live account
 * or live data is used. The favorites mock keeps the saved items in memory and
 * answers GET, POST and DELETE the way PostgREST does.
 *
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-5/favorites/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";

const EVIDENCE_DIR = "docs/evidence/phase-5/favorites";

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

const categories = [
  { id: "drinks", name: "Drinks" },
  { id: "snacks", name: "Snacks" },
];

const menuItems = [
  {
    id: "brew-coffee",
    category_id: "drinks",
    name: "Brew Special Coffee",
    flavors: "Caramel|Vanilla",
    variants_json: [
      { id: "brew-12", name: "12 oz", basePrice: 120 },
      { id: "brew-16", name: "16 oz", basePrice: 150 },
    ],
    is_available: true,
  },
  {
    id: "iced-latte",
    category_id: "drinks",
    name: "Iced Latte",
    flavors: "",
    variants_json: [{ id: "latte-16", name: "16 oz", basePrice: 180 }],
    is_available: true,
  },
  {
    id: "takoyaki",
    category_id: "snacks",
    name: "Takoyaki",
    flavors: "",
    variants_json: [{ id: "takoyaki-6", name: "6 pcs", basePrice: 99 }],
    is_available: false,
  },
  {
    // Sold only at the shop, so the website menu leaves it out.
    id: "take-out-box",
    category_id: "snacks",
    name: "Take-out Box",
    flavors: "",
    variants_json: [{ id: "box", name: "Box", basePrice: 10 }],
    is_available: true,
  },
];

/**
 * Signs in without touching Supabase: the same session object the password
 * grant would store is written to localStorage before the first page load.
 */
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

async function mockMenu(page: Page) {
  await page.route("**/rest/v1/categories*", (route) =>
    route.fulfill({ json: categories }),
  );
  await page.route("**/rest/v1/menu_add_ons*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: menuItems }),
  );
}

type FavoritesCall = { method: string; params: URLSearchParams; body: unknown };

async function mockFavorites(page: Page, initial: readonly string[]) {
  const saved = initial.map((itemId, index) => ({
    item_id: itemId,
    created_at: `2026-11-0${7 - index}T08:00:00Z`,
  }));
  const calls: FavoritesCall[] = [];

  await page.route("**/rest/v1/favorites*", async (route) => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    const method = request.method();
    if (method === "OPTIONS") return route.fallback();
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ method, params, body });

    if (method === "GET") {
      return route.fulfill({ json: saved });
    }
    if (method === "POST") {
      saved.unshift({
        item_id: (body as { item_id: string }).item_id,
        created_at: "2026-11-07T09:00:00Z",
      });
      return route.fulfill({ status: 201, body: "" });
    }
    if (method === "DELETE") {
      const itemId = params.get("item_id")?.replace(/^eq\./, "");
      const index = saved.findIndex((row) => row.item_id === itemId);
      if (index >= 0) saved.splice(index, 1);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fallback();
  });

  return calls;
}

async function capture(page: Page, filename: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${filename}`,
    fullPage: true,
  });
}

test.describe("Customer favorites", () => {
  test("TC-P5-086 — a signed-in customer saves and removes a favorite from the menu", async ({
    page,
  }) => {
    await mockMenu(page);
    const calls = await mockFavorites(page, []);
    await signIn(page);
    await page.goto("/menu");

    const card = page.locator("article", { hasText: "Iced Latte" });
    const heart = card.getByRole("button", {
      name: "Save Iced Latte to favorites",
    });
    await expect(heart).toBeEnabled();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(
      card.getByRole("button", { name: "Order Iced Latte" }),
    ).toBeVisible();

    // The menu loads the favorites once for every heart on the page.
    expect(calls.filter((call) => call.method === "GET")).toHaveLength(1);
    expect(calls[0]?.params.get("customer_id")).toBe("eq.customer-123");

    const saving = page.waitForRequest(
      (request) =>
        request.url().includes("/rest/v1/favorites") &&
        request.method() === "POST",
    );
    await heart.click();
    await saving;
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    expect(calls.at(-1)?.body).toEqual({
      customer_id: "customer-123",
      item_id: "iced-latte",
    });

    if (CAPTURE_EVIDENCE) {
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: `${EVIDENCE_DIR}/menu-card-heart.png` });
    }

    const removing = page.waitForRequest(
      (request) =>
        request.url().includes("/rest/v1/favorites") &&
        request.method() === "DELETE",
    );
    await heart.click();
    await removing;
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    const removed = calls.at(-1)?.params;
    expect(removed?.get("customer_id")).toBe("eq.customer-123");
    expect(removed?.get("item_id")).toBe("eq.iced-latte");
  });

  test("TC-P5-086 — signed-out visitors see no hearts", async ({ page }) => {
    await mockMenu(page);
    await page.goto("/menu");

    const card = page.locator("article", { hasText: "Iced Latte" });
    await expect(
      card.getByRole("button", { name: "Order Iced Latte" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /to favorites$/ }),
    ).toHaveCount(0);
  });

  test("TC-P5-087 — the favorites page lists saved items with current prices", async ({
    page,
  }) => {
    await mockMenu(page);
    await mockFavorites(page, [
      "brew-coffee",
      "take-out-box",
      "takoyaki",
      "iced-latte",
    ]);
    await signIn(page);
    await page.goto("/account/favorites");

    await expect(
      page.getByRole("heading", { level: 1, name: "Favorites" }),
    ).toBeVisible();
    const rows = page.getByRole("listitem").filter({
      has: page.getByRole("button", { name: /to favorites$/ }),
    });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Brew Special Coffee");
    await expect(rows.nth(0)).toContainText("From ₱120");
    await expect(rows.nth(1)).toContainText("Takoyaki");
    await expect(rows.nth(1)).toContainText("Not available to order right now");
    await expect(
      rows.nth(1).getByRole("button", { name: "Order Takoyaki" }),
    ).toHaveCount(0);
    await expect(rows.nth(2)).toContainText("Iced Latte");
    await expect(rows.nth(2)).toContainText("₱180");
    await expect(page.getByText("Take-out Box")).toHaveCount(0);
    await expect(
      rows.nth(2).getByRole("button", { name: "Save Iced Latte to favorites" }),
    ).toHaveAttribute("aria-pressed", "true");

    await capture(page, "favorites-list.png");

    await page.getByRole("button", { name: "Order Iced Latte" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("TC-P5-087 — the favorites page shows the empty state", async ({
    page,
  }) => {
    await mockMenu(page);
    await mockFavorites(page, []);
    await signIn(page);
    await page.goto("/account/favorites");

    await expect(
      page.getByRole("heading", { name: "No Favorites Yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse Menu" }),
    ).toHaveAttribute("href", "/menu");

    await capture(page, "favorites-empty.png");
  });
});
