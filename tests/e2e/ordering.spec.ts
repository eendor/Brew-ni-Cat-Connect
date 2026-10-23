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
