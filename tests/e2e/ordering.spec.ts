import { expect, test, type Page } from "@playwright/test";

const fixtureCategory = {
  id: "ordering-e2e-category",
  name: "Ordering E2E Category",
};

const fixtureItem = {
  id: "ordering-e2e-item",
  category_id: fixtureCategory.id,
  name: "Ordering E2E Item",
  flavors: "Classic|Seasonal",
  variants_json: [
    {
      id: "ordering-e2e-variant",
      name: "Regular",
      basePrice: 75,
      priceByFlavor: {
        Classic: 75,
        Seasonal: 85,
      },
      description: "Automated ordering-test fixture",
    },
  ],
  is_available: true,
};

async function mockMenuResponses(page: Page) {
  await page.route("**/rest/v1/categories*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([fixtureCategory]),
    });
  });

  await page.route("**/rest/v1/items*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([fixtureItem]),
    });
  });
}

test("TC-P3-060 adds a menu item with the selected quantity", async ({
  page,
}) => {
  await mockMenuResponses(page);
  await page.goto("/menu");

  await page.getByRole("button", { name: "Order Ordering E2E Item" }).click();

  const orderDialog = page.getByRole("dialog");
  await expect(orderDialog).toBeVisible();

  await orderDialog.getByRole("button", { name: "Regular" }).click();
  await orderDialog.getByRole("button", { name: "Increase quantity" }).click();

  await orderDialog.getByRole("button", { name: "Add to Order" }).click();

  const cartDrawer = page.getByRole("dialog", { name: "Your Order" });
  await expect(cartDrawer).toBeVisible();
  await expect(
    cartDrawer.getByRole("list", { name: "Cart items list" }),
  ).toContainText("Ordering E2E Item");
  await expect(cartDrawer.getByText("2 items")).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Order Ordering E2E Item",
    }),
  ).toContainText("Add to order (2 in cart)");
});
