import { expect, test, type Page } from "@playwright/test";

/**
 * Installable web app and offline page (FR-068).
 *
 * The manifest and service worker run against the production build. Supabase
 * is mocked in the checkout safety case, so no live account or live data is
 * used. Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-8/installable-web-app/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";

const EVIDENCE_DIR = "docs/evidence/phase-8/installable-web-app";

// The rest of the suite blocks service workers so they cannot bypass the
// page.route Supabase mocks; this file needs one to test it.
test.use({ serviceWorkers: "allow" });

const noodles = { id: "e2e-noodles", name: "Buldak & Sedaap" };
const snacks = { id: "e2e-snacks", name: "Takoyaki" };

const takoyaki = {
  id: "e2e-takoyaki",
  category_id: snacks.id,
  name: "Takoyaki",
  flavors: "Octopus|Cheese",
  variants_json: [
    { id: "e2e-4pc", name: "4 pcs", basePrice: 60 },
    { id: "e2e-8pc", name: "8 pcs", basePrice: 110 },
  ],
  is_available: true,
};

async function mockMenu(page: Page) {
  await page.route("**/rest/v1/categories*", (route) =>
    route.fulfill({ json: [noodles, snacks] }),
  );
  await page.route("**/rest/v1/menu_add_ons*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: [takoyaki] }),
  );
}

async function mockOrderLookup(page: Page) {
  await page.route("**/rest/v1/rpc/get_online_order*", (route) =>
    route.fulfill({
      json: {
        reference: "BNC-7K2Q9F",
        createdAt: "2026-10-24T08:00:00.000Z",
        status: "pending",
        customerName: "E2E Test Customer",
        paymentPreference: "Cash",
        fulfillment: "pickup",
        notes: "",
        itemCount: 2,
        rejectionReason: null,
        realtimeTopic: "order:BNC-7K2Q9F",
        statusHistory: [
          { status: "pending", changedAt: "2026-10-24T08:00:00.000Z" },
        ],
        items: [
          {
            itemId: "e2e-takoyaki",
            variantId: "e2e-8pc",
            itemName: "Takoyaki",
            variantName: "8 pcs",
            flavor: "Cheese",
            quantity: 2,
            unitPrice: 110,
            lineTotal: 220,
          },
        ],
        subtotal: 220,
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

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test("TC-P8-014 — the page links the web app manifest", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
});

test("TC-P8-015 — the manifest returns the installable app values", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("manifest");
  expect(await response.json()).toEqual({
    name: "Brew ni Cat Coffee Shop",
    short_name: "Brew ni Cat",
    description:
      "Browse the menu, order ahead, and follow your Brew ni Cat order from your phone.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6eee1",
    theme_color: "#f6eee1",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  });
});

test("TC-P8-016 — the service worker registers and becomes ready", async ({
  page,
}) => {
  await page.goto("/");

  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return {
      scope: ready.scope,
      active: Boolean(ready.active),
    };
  });

  expect(registration.scope).toBe("http://127.0.0.1:3000/");
  expect(registration.active).toBe(true);
});

test("TC-P8-017 — an offline navigation shows the offline page", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForServiceWorkerControl(page);

  await context.setOffline(true);
  await page.goto("/menu");

  await expect(
    page.getByRole("heading", { level: 1, name: "You're offline" }),
  ).toBeVisible();
  await expect(
    page.getByText("Check your internet connection, then try again."),
  ).toBeVisible();

  await capture(page, "offline-fallback-390x844.png");

  await context.setOffline(false);
});

test("TC-P8-018 — the cache never holds API responses or page HTML", async ({
  page,
}) => {
  await page.goto("/");
  await waitForServiceWorkerControl(page);
  await page.goto("/menu");

  const cached = await page.evaluate(async () => {
    const entries: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const url = new URL(request.url);
        entries.push(`${url.pathname}${url.search}`);
      }
    }
    return entries;
  });

  expect(cached.length).toBeGreaterThan(0);
  for (const entry of cached) {
    const path = entry.split("?")[0] ?? "";
    expect(path.startsWith("/api/")).toBe(false);
    expect(entry).not.toContain("_rsc");
    const isAsset =
      path.startsWith("/_next/static/") || path.startsWith("/icons/");
    if (!isAsset) expect(path).toBe("/offline");
  }
});

test("TC-P8-019 — a failed Place order never shows as placed, and the retry reuses its idempotency key", async ({
  page,
}) => {
  // Checkout follows the opening hours (FR-112): pin the browser clock to an open hour.
  await page.clock.setFixedTime(new Date(Date.UTC(2026, 10, 9, 6)));
  test.skip(
    process.env.NEXT_PUBLIC_ONLINE_ORDERING !== "enabled",
    "needs a build with NEXT_PUBLIC_ONLINE_ORDERING=enabled",
  );

  // the checkout follows the opening hours: pin the clock to 2 PM in Manila
  await page.clock.setFixedTime(new Date("2026-11-10T06:00:00Z"));
  await mockMenu(page);
  await mockOrderLookup(page);
  const sent: Array<Record<string, unknown>> = [];
  await page.route("**/api/orders", async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    sent.push(request);
    if (sent.length === 1) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fulfill({
      status: 201,
      json: {
        ok: true,
        reference: "BNC-7K2Q9F",
        trackingToken: request.trackingToken,
        status: "pending",
        createdAt: "2026-10-24T08:00:00.000Z",
      },
    });
  });

  await page.goto("/menu");
  await page.getByRole("button", { name: "Order Takoyaki" }).click();
  const orderDialog = page.getByRole("dialog");
  await orderDialog.getByRole("button", { name: "8 pcs" }).click();
  await orderDialog.getByRole("button", { name: "Cheese" }).click();
  await orderDialog.getByRole("button", { name: "Increase quantity" }).click();
  await orderDialog.getByRole("button", { name: "Add to Order" }).click();
  await page
    .getByRole("dialog", { name: "Your Order" })
    .getByRole("link", { name: "Proceed to Checkout" })
    .click();
  await page.waitForURL("**/checkout");

  await page.getByLabel(/Full Name/).fill("E2E Test Customer");
  await page.getByLabel(/Contact Phone Number/).fill("09171234567");
  await page.getByRole("button", { name: "Continue to Order Review" }).click();

  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByRole("region", { name: "Checkout flow" }).getByRole("alert"),
  ).toContainText("We couldn't place your order. Please try again.");
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Order Placed" })).toHaveCount(
    0,
  );
  expect(sent).toHaveLength(1);

  await page.getByRole("button", { name: "Place order" }).click();

  await page.waitForURL(/\/orders\/BNC-7K2Q9F#token=[A-Za-z0-9_-]{43}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Order Placed" }),
  ).toBeVisible();

  expect(sent).toHaveLength(2);
  expect(sent[0]?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent[1]?.idempotencyKey).toBe(sent[0]?.idempotencyKey);
  expect(sent[1]?.trackingToken).toBe(sent[0]?.trackingToken);
});

test("TC-P8-020 — captures the offline page at phone and desktop sizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/offline");
  await expect(
    page.getByRole("heading", { level: 1, name: "You're offline" }),
  ).toBeVisible();
  await capture(page, "offline-page-390x844.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/offline");
  await expect(
    page.getByRole("heading", { level: 1, name: "You're offline" }),
  ).toBeVisible();
  await capture(page, "offline-page-1440x900.png");
});

test("TC-P8-021 — captures the footer with the Install app button", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(
    0,
  );

  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", {
      value: async () => undefined,
    });
    Object.defineProperty(event, "userChoice", {
      value: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });
    window.dispatchEvent(event);
  });

  const button = page.getByRole("button", { name: "Install app" });
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();

  if (CAPTURE_EVIDENCE) {
    await page
      .locator("footer")
      .screenshot({ path: `${EVIDENCE_DIR}/footer-install-button.png` });
  }
});

test("TC-P8-026 — the site serves assetlinks.json so the Android app opens full screen", async ({
  request,
}) => {
  const response = await request.get("/.well-known/assetlinks.json");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const body = (await response.json()) as Array<{
    target: { package_name: string };
  }>;
  expect(body[0]?.target.package_name).toBe("com.brewnicat.connect");
});
