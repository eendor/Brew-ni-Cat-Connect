import { expect, test, type Page } from "@playwright/test";

/**
 * Customer order history and reorder (FR-039, FR-041).
 *
 * The Supabase Auth and PostgREST endpoints are mocked in the browser, so no
 * live account or live order data is used. The `content-range` header is
 * returned the same way PostgREST does, which is what drives the page count.
 *
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-5/screenshots/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";

const EVIDENCE_DIR = "docs/evidence/phase-5/screenshots";

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

type HistoryRow = {
  id: string;
  reference: string;
  status: string;
  fulfillment: string;
  customer_name: string;
  payment_preference: string;
  notes: string;
  subtotal: number;
  item_count: number;
  rejection_reason: string | null;
  created_at: string;
  items: Array<{
    line_number: number;
    item_id: string;
    item_name: string;
    variant_id: string;
    variant_name: string;
    flavor: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
};

const completedOrder: HistoryRow = {
  id: "order-1",
  reference: "BNC-7K2Q9F",
  status: "completed",
  fulfillment: "pickup",
  customer_name: "Juan Dela Cruz",
  payment_preference: "Cash",
  notes: "Less sweet",
  subtotal: 400,
  item_count: 3,
  rejection_reason: null,
  created_at: "2026-11-01T10:00:00Z",
  items: [
    {
      line_number: 1,
      item_id: "brew-coffee",
      item_name: "Brew Special Coffee",
      variant_id: "large-16",
      variant_name: "16 oz",
      flavor: "Caramel",
      unit_price: 140,
      quantity: 2,
      line_total: 280,
    },
    {
      line_number: 2,
      item_id: "matcha-latte",
      item_name: "Matcha Latte",
      variant_id: "medium-12",
      variant_name: "12 oz",
      flavor: null,
      unit_price: 120,
      quantity: 1,
      line_total: 120,
    },
  ],
};

const pendingOrder: HistoryRow = {
  id: "order-2",
  reference: "BNC-9M8P2A",
  status: "pending",
  fulfillment: "pickup",
  customer_name: "Juan Dela Cruz",
  payment_preference: "GCash",
  notes: "",
  subtotal: 180,
  item_count: 1,
  rejection_reason: null,
  created_at: "2026-10-25T14:30:00Z",
  items: [
    {
      line_number: 1,
      item_id: "iced-latte",
      item_name: "Iced Latte",
      variant_id: "regular-16",
      variant_name: "16 oz",
      flavor: null,
      unit_price: 180,
      quantity: 1,
      line_total: 180,
    },
  ],
};

const menuItems = [
  {
    id: "brew-coffee",
    category_id: "drinks",
    name: "Brew Special Coffee",
    flavors: "Caramel|Vanilla",
    variants_json: [
      {
        id: "large-16",
        name: "16 oz",
        basePrice: 150,
        priceByFlavor: { Caramel: 150 },
      },
    ],
    is_available: true,
  },
  {
    id: "iced-latte",
    category_id: "drinks",
    name: "Iced Latte",
    flavors: "",
    variants_json: [{ id: "regular-16", name: "16 oz", basePrice: 180 }],
    is_available: true,
  },
];

const orderView = {
  reference: "BNC-7K2Q9F",
  status: "completed",
  fulfillment: "pickup",
  customerName: "Juan Dela Cruz",
  paymentPreference: "Cash",
  notes: "Less sweet",
  items: [
    {
      itemId: "brew-coffee",
      itemName: "Brew Special Coffee",
      variantId: "large-16",
      variantName: "16 oz",
      flavor: "Caramel",
      unitPrice: 140,
      quantity: 2,
      lineTotal: 280,
    },
  ],
  subtotal: 280,
  itemCount: 2,
  rejectionReason: null,
  createdAt: "2026-11-01T10:00:00Z",
  statusHistory: [
    { status: "pending", changedAt: "2026-11-01T10:00:00Z" },
    { status: "completed", changedAt: "2026-11-01T10:45:00Z" },
  ],
  realtimeTopic: "order:e2e-history-topic",
};

/**
 * Signs in without touching Supabase: the same session object the password
 * grant would store is written to localStorage before the first page load.
 * The key matches supabase-js: `sb-<first hostname label>-auth-token`.
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
    route.fulfill({ json: [{ id: "drinks", name: "Drinks" }] }),
  );
  await page.route("**/rest/v1/menu_add_ons*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: menuItems }),
  );
}

async function mockOrderHistory(
  page: Page,
  {
    rows,
    totalCount,
    range,
  }: { rows: HistoryRow[]; totalCount: number; range: string },
) {
  await page.route("**/rest/v1/online_orders*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": `${range}/${totalCount}`,
        "access-control-expose-headers": "Content-Range",
      },
      body: JSON.stringify(rows),
    });
  });
}

async function mockOrderView(page: Page) {
  await page.route("**/rest/v1/rpc/get_online_order*", (route) =>
    route.fulfill({ json: orderView }),
  );
}

async function capture(page: Page, filename: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${filename}`,
    fullPage: true,
  });
}

test.describe("Customer order history and reorder", () => {
  test("TC-P5-030 — lists the signed-in customer's orders and paginates them", async ({
    page,
  }) => {
    await mockOrderHistory(page, {
      rows: [completedOrder, pendingOrder],
      totalCount: 12,
      range: "0-1",
    });

    const historyRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/rest/v1/online_orders") &&
        request.method() === "GET",
    );

    await signIn(page);
    await page.goto("/account/orders");

    // The customer filter is sent to PostgREST, so a staff account can't see
    // every customer's orders through the history page (FR-039).
    const request = await historyRequest;
    const historyParams = new URL(request.url()).searchParams;
    expect(historyParams.get("customer_id")).toBe("eq.customer-123");
    expect(historyParams.get("offset")).toBe("0");
    expect(historyParams.get("limit")).toBe("10");

    await expect(
      page.getByRole("heading", { name: "Order History" }),
    ).toBeVisible();
    await expect(page.getByText("BNC-7K2Q9F")).toBeVisible();
    await expect(page.getByText("BNC-9M8P2A")).toBeVisible();
    await expect(page.getByText(/Showing page 1 of 2/i)).toBeVisible();
    await expect(page.getByText(/12 orders total/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();

    await capture(page, "order-history-list.png");

    // Page 2 is requested with the next range, and the content-range header
    // above is what told the page there were two pages.
    const secondPageRequest = page.waitForRequest((nextRequest) => {
      if (!nextRequest.url().includes("/rest/v1/online_orders")) return false;
      const params = new URL(nextRequest.url()).searchParams;
      return params.get("offset") === "10" && params.get("limit") === "10";
    });
    await page.getByRole("button", { name: "Page 2" }).click();
    await secondPageRequest;
    await expect(page.getByText(/Showing page 2 of 2/i)).toBeVisible();
  });

  test("TC-P5-031 — shows the empty state when the customer has no orders", async ({
    page,
  }) => {
    await mockOrderHistory(page, {
      rows: [],
      totalCount: 0,
      range: "*",
    });

    await signIn(page);
    await page.goto("/account/orders");

    await expect(
      page.getByRole("heading", { name: "No Orders Yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse Menu" }),
    ).toHaveAttribute("href", "/menu");

    await capture(page, "order-history-empty.png");
  });

  test("TC-P5-032 — reorder shows price updates and unavailable items", async ({
    page,
  }) => {
    await mockOrderHistory(page, {
      rows: [completedOrder],
      totalCount: 1,
      range: "0-0",
    });
    await mockMenu(page);

    await signIn(page);
    await page.goto("/account/orders");
    await expect(page.getByText("BNC-7K2Q9F")).toBeVisible();

    await page.getByRole("button", { name: "Reorder" }).click();

    const notices = page.getByRole("region", { name: "Reorder notices" });
    await expect(notices).toBeVisible();
    await expect(notices).toContainText("Added 2 items to your cart.");
    await expect(notices).toContainText("Price updates:");
    await expect(notices).toContainText(
      "Price for Brew Special Coffee (16 oz) has changed from ₱140 to ₱150.",
    );
    await expect(notices).toContainText("Unavailable items:");
    await expect(notices).toContainText(
      "Matcha Latte (12 oz) is no longer on the menu and could not be added.",
    );

    // Reorder opens the cart drawer; close it so the notices are the focus.
    const closeDrawer = page.getByRole("button", {
      name: "Close cart drawer",
    });
    await closeDrawer
      .waitFor({ state: "visible", timeout: 3_000 })
      .catch(() => {
        // The drawer is optional evidence, not part of this test.
      });
    if (await closeDrawer.isVisible()) {
      await closeDrawer.click();
      await expect(closeDrawer).toBeHidden();
    }

    await capture(page, "order-history-reorder-notices.png");
  });

  test("TC-P5-033 — the order page offers Reorder for the order's owner", async ({
    page,
  }) => {
    await mockOrderView(page);

    await signIn(page);
    await page.goto("/orders/BNC-7K2Q9F");

    await expect(
      page.getByRole("heading", { name: "Order Placed" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reorder" })).toBeVisible();
    await expect(page.getByText("BNC-7K2Q9F")).toBeVisible();

    await capture(page, "order-page-reorder-button.png");
  });
});
