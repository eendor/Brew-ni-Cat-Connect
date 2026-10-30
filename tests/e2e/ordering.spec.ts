import { devices, expect, test, type Page } from "@playwright/test";

const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
  devices["Pixel 7"];

test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

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

  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: [takoyaki] }),
  );
}

test("TC-P3-060 — adds two Takoyaki and validates Rider Delivery checkout", async ({
  page,
}) => {
  await mockMenu(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Open navigation" }).click();

  const nav = page.getByRole("navigation", {
    name: "Mobile navigation",
  });

  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Menu", exact: true }).click();
  await page.waitForURL("**/menu");
  await expect(nav).toBeHidden();

  await page.getByRole("button", { name: "Order Takoyaki" }).click();

  const orderDialog = page.getByRole("dialog");
  await expect(orderDialog).toBeVisible();

  await orderDialog.getByRole("button", { name: "8 pcs" }).click();
  await orderDialog.getByRole("button", { name: "Cheese" }).click();
  await orderDialog.getByRole("button", { name: "Increase quantity" }).click();
  await orderDialog.getByRole("button", { name: "Add to Order" }).click();

  const cartDrawer = page.getByRole("dialog", { name: "Your Order" });
  await expect(cartDrawer).toBeVisible();
  await expect(
    cartDrawer.getByRole("list", { name: "Cart items list" }),
  ).toContainText("Takoyaki");
  await expect(cartDrawer.getByText("2 items")).toBeVisible();

  const takoyakiCard = page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: "Order Takoyaki" }) });

  await expect(takoyakiCard.getByText("2 in cart")).toBeVisible();
  await expect(
    takoyakiCard.getByRole("button", { name: "Order Takoyaki" }),
  ).not.toContainText("2 in cart");

  await cartDrawer.getByRole("link", { name: "Proceed to Checkout" }).click();
  await page.waitForURL("**/checkout");

  await page.getByRole("radio", { name: /Rider Delivery/i }).check();
  await page.getByLabel(/Full Name/).fill("E2E Test Customer");
  await page.getByLabel(/Contact Phone Number/).fill("09171234567");
  await page.getByRole("button", { name: "Continue to Order Review" }).click();

  await expect(
    page.getByText("Please enter the delivery address for your rider."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Order Summary for Your Rider",
      level: 1,
    }),
  ).toHaveCount(0);

  await page
    .getByLabel("Delivery Address")
    .fill("123 E2E Test Street, Kabacan");
  await page.getByRole("button", { name: "Continue to Order Review" }).click();

  await page.getByRole("button", { name: "Proceed to Send to Rider" }).click();

  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", {
      name: "Order Summary for Your Rider",
      level: 1,
    }),
  ).toBeVisible();

  const riderList = main.getByRole("list", {
    name: "Rider delivery services",
  });
  await expect(riderList.getByRole("link")).toHaveCount(3);
  await expect(
    riderList.getByRole("link", { name: /Papa's Delivery/ }),
  ).toBeVisible();
  await expect(
    riderList.getByRole("link", {
      name: /Momshie's Pamalengke and Delivery Kabacan/,
    }),
  ).toBeVisible();
  await expect(
    riderList.getByRole("link", { name: /M&S Delivery Express Kabacan/ }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Message on Facebook" }),
  ).toHaveCount(0);
});

test("TC-P4-123 — Place order sends the pickup order and opens its order page", async ({
  page,
}) => {
  test.skip(
    process.env.NEXT_PUBLIC_ONLINE_ORDERING !== "enabled",
    "needs a build with NEXT_PUBLIC_ONLINE_ORDERING=enabled",
  );
  await mockMenu(page);
  const sent: Array<Record<string, unknown>> = [];
  await page.route("**/api/orders", async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    sent.push(request);
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
  await expect(
    page.getByRole("button", { name: /Proceed to Send to Shop/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Place order" }).click();

  await page.waitForURL(/\/orders\/BNC-7K2Q9F#token=[A-Za-z0-9_-]{43}$/);
  expect(sent).toHaveLength(1);
  const [request] = sent;
  // what was picked, never a price to charge: the database prices it
  expect(request).toEqual({
    idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
    trackingToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    fulfillment: "pickup",
    customer: {
      name: "E2E Test Customer",
      phone: "09171234567",
      notes: "",
      paymentPreference: "Cash",
    },
    lines: [
      {
        itemId: "e2e-takoyaki",
        variantId: "e2e-8pc",
        flavor: "Cheese",
        quantity: 2,
      },
    ],
    expectedSubtotal: 220,
  });
  expect(new URL(page.url()).hash).toBe(`#token=${request?.trackingToken}`);
});

test("TC-P3-071 — edits an existing cart item on /cart page", async ({ page }) => {
  await mockMenu(page);
  await page.goto("/menu");

  await page.getByRole("button", { name: "Order Takoyaki" }).click();
  const orderDialog = page.getByRole("dialog");
  await orderDialog.getByRole("button", { name: "4 pcs" }).click();
  await orderDialog.getByRole("button", { name: "Octopus" }).click();
  await orderDialog.getByRole("button", { name: "Add to Order" }).click();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Shopping Cart" })).toBeVisible();

  await page.getByRole("button", { name: /Edit Takoyaki/i }).click();

  const editDialog = page.getByRole("dialog");
  await expect(editDialog).toBeVisible();
  await editDialog.getByRole("button", { name: "8 pcs" }).click();
  await editDialog.getByRole("button", { name: "Cheese" }).click();
  await editDialog.getByRole("button", { name: "Update item" }).click();

  await expect(page.getByText("8 pcs")).toBeVisible();
  await expect(page.getByText(/Flavor: Cheese/)).toBeVisible();
});
