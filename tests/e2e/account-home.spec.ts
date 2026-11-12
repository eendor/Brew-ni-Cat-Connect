import { expect, test, type Page } from "@playwright/test";

/**
 * Account home and data requests (FR-042).
 *
 * Supabase Auth and PostgREST are mocked in the browser, so no live account,
 * no live order and no live data request is used. Every name, reference and
 * email here is mock data.
 *
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-5/account-home/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";

const EVIDENCE_DIR = "docs/evidence/phase-5/account-home";

const mockUser = {
  id: "customer-123",
  aud: "authenticated",
  role: "authenticated",
  email: "mock.customer@example.com",
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

const latestOrder = {
  id: "order-1",
  reference: "BNC-7K2Q9F",
  status: "completed",
  fulfillment: "pickup",
  customer_name: "MOCK DATA — FOR DEVELOPMENT ONLY",
  payment_preference: "Cash",
  notes: "",
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

type RequestRow = {
  id: string;
  kind: "correction" | "deletion";
  message: string;
  status: "open" | "in-progress" | "resolved" | "declined";
  created_at: string;
};

const earlierRequest: RequestRow = {
  id: "request-1",
  kind: "correction",
  message: "MOCK DATA — FOR DEVELOPMENT ONLY: please fix my phone number.",
  status: "in-progress",
  created_at: "2026-11-10T08:00:00Z",
};

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

async function mockLatestOrder(page: Page, rows: unknown[]) {
  await page.route("**/rest/v1/online_orders*", async (route) => {
    const empty = rows.length === 0;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": empty ? "*/0" : `0-${rows.length - 1}/${rows.length}`,
        "access-control-expose-headers": "Content-Range",
      },
      body: JSON.stringify(rows),
    });
  });
}

type RequestCall = {
  method: string;
  body: unknown;
};

async function mockDataRequests(
  page: Page,
  initial: RequestRow[] = [],
): Promise<{ calls: RequestCall[]; setFailNextPost: (fail: boolean) => void }> {
  const rows = [...initial];
  const calls: RequestCall[] = [];
  let failNextPost = false;

  await page.route("**/rest/v1/data_requests*", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "OPTIONS") return route.fallback();

    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ method, body });

    if (method === "GET") {
      return route.fulfill({ json: rows });
    }

    if (method === "POST") {
      if (failNextPost) {
        failNextPost = false;
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Mock database is unavailable." }),
        });
      }

      const inserted = body as { kind: RequestRow["kind"]; message: string };
      rows.unshift({
        id: `request-${rows.length + 1}`,
        kind: inserted.kind,
        message: inserted.message,
        status: "open",
        created_at: "2026-11-12T09:00:00Z",
      });
      return route.fulfill({ status: 201, body: "" });
    }

    return route.fallback();
  });

  return {
    calls,
    setFailNextPost: (fail: boolean) => {
      failNextPost = fail;
    },
  };
}

async function capture(page: Page, filename: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${filename}`,
    fullPage: true,
  });
}

async function expectNoSidewaysScroll(page: Page) {
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > window.innerWidth + 1 ||
      document.body.scrollWidth > window.innerWidth + 1,
  );
  expect(overflows).toBe(false);
}

test.describe("Account home", () => {
  test("TC-P5-148 — the account home links every page and shows the latest order at 1440x900", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockLatestOrder(page, [latestOrder]);
    await signIn(page);

    const latestOrderRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/rest/v1/online_orders") &&
        request.method() === "GET",
    );

    await page.goto("/account");

    const request = await latestOrderRequest;
    const params = new URL(request.url()).searchParams;
    expect(params.get("customer_id")).toBe("eq.customer-123");
    expect(params.get("limit")).toBe("1");
    expect(params.get("offset")).toBe("0");

    await expect(
      page.getByRole("heading", { level: 1, name: "My Account" }),
    ).toBeVisible();
    for (const [name, href] of [
      ["Orders", "/account/orders"],
      ["Favorites", "/account/favorites"],
      ["Rewards", "/account/rewards"],
      ["Profile", "/account/profile"],
      ["Data requests", "/account/data-request"],
    ] as const) {
      await expect(
        page.getByRole("link", { name: new RegExp(`^${name}`) }),
      ).toHaveAttribute("href", href);
    }

    await expect(page.getByText("BNC-7K2Q9F")).toBeVisible();
    await expect(page.getByText("completed", { exact: true })).toBeVisible();
    await expect(page.getByText(/Placed on/)).toBeVisible();
    await expect(page.getByText(/₱400/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "BNC-7K2Q9F" }),
    ).toHaveAttribute("href", "/orders/BNC-7K2Q9F");

    await capture(page, "account-home-1440x900.png");
  });

  test("TC-P5-149 — a customer with no orders sees the empty state at 390x844", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockLatestOrder(page, []);
    await signIn(page);

    await page.goto("/account");

    await expect(page.getByText("No orders yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse Menu" }),
    ).toHaveAttribute("href", "/menu");
    await expectNoSidewaysScroll(page);

    await capture(page, "account-home-390x844.png");
  });
});

test.describe("Data requests", () => {
  test("TC-P5-150 — sends a request, sees what happens next and the earlier list", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { calls } = await mockDataRequests(page, [earlierRequest]);
    await signIn(page);

    await page.goto("/account/data-request");

    await expect(
      page.getByRole("heading", { level: 1, name: "Data Requests" }),
    ).toBeVisible();
    await expect(page.getByText("Correction request")).toBeVisible();
    await expect(page.getByText("In progress")).toBeVisible();
    await expect(page.getByText(/Nov 10, 2026/)).toBeVisible();

    await capture(page, "data-request-1440x900.png");

    await page.getByRole("radio", { name: /Correction/ }).check();
    await page
      .getByRole("textbox", { name: "Your message" })
      .fill(
        "MOCK DATA — FOR DEVELOPMENT ONLY: please correct my saved phone number.",
      );
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByRole("status")).toContainText(
      /Your request has been sent/,
    );
    await expect(page.getByRole("status")).toContainText(
      /The shop will review it and contact you/,
    );
    await expect(page.getByText("Open", { exact: true })).toBeVisible();

    const posts = calls.filter((call) => call.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toEqual({
      kind: "correction",
      message:
        "MOCK DATA — FOR DEVELOPMENT ONLY: please correct my saved phone number.",
    });

    await capture(page, "data-request-success-1440x900.png");
  });

  test("TC-P5-152 — a failed send keeps the typed request and Try again resends it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const mock = await mockDataRequests(page);
    mock.setFailNextPost(true);
    await signIn(page);

    await page.goto("/account/data-request");

    await page.getByRole("radio", { name: /Deletion/ }).check();
    const message = page.getByRole("textbox", { name: "Your message" });
    await message.fill(
      "MOCK DATA — FOR DEVELOPMENT ONLY: please delete my profile data.",
    );
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByRole("alert")).toContainText(
      /We couldn't send your request/,
    );
    await expect(message).toHaveValue(
      "MOCK DATA — FOR DEVELOPMENT ONLY: please delete my profile data.",
    );

    await capture(page, "data-request-error-1440x900.png");

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("status")).toContainText(
      /Your request has been sent/,
    );

    const posts = mock.calls.filter((call) => call.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[1]?.body).toEqual({
      kind: "deletion",
      message:
        "MOCK DATA — FOR DEVELOPMENT ONLY: please delete my profile data.",
    });
  });

  test("TC-P5-151 — required errors and the request flow fit a 390x844 phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockDataRequests(page);
    await signIn(page);

    await page.goto("/account/data-request");

    await page.getByRole("button", { name: "Send request" }).click();
    await expect(
      page.getByText("Choose Correction or Deletion."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Please write what you would like us to correct or delete.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Your message" }),
    ).toHaveAttribute("aria-invalid", "true");

    await capture(page, "data-request-validation-390x844.png");

    await page.getByRole("radio", { name: /Deletion/ }).check();
    await page
      .getByRole("textbox", { name: "Your message" })
      .fill(
        "MOCK DATA — FOR DEVELOPMENT ONLY: please delete the phone number on my profile.",
      );
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByRole("status")).toContainText(
      /Your request has been sent/,
    );
    await expectNoSidewaysScroll(page);

    await capture(page, "data-request-390x844.png");
  });
});
