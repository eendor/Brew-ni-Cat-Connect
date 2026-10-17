import { expect, test, type Page } from "@playwright/test";

const fixtureCategory = {
  id: "e2e-category",
  name: "E2E Catalog Category",
};

const fixtureItem = {
  id: "e2e-item",
  category_id: fixtureCategory.id,
  name: "E2E Catalog Item",
  flavors: "Classic|Seasonal",
  variants_json: [
    {
      id: "e2e-variant",
      name: "Regular",
      basePrice: 75,
      priceByFlavor: { Classic: 75, Seasonal: 85 },
      description: "Automated browser-test fixture",
    },
  ],
  is_available: false,
};

async function mockMenuResponses(
  page: Page,
  categoriesBody: unknown,
  itemsBody: unknown,
) {
  await page.route("**/rest/v1/categories*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(categoriesBody),
    });
  });
  await page.route("**/rest/v1/items*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(itemsBody),
    });
  });
}

test("TC-P2-026 — Menu renders mapped categories, options, prices, and availability", async ({
  page,
}) => {
  await mockMenuResponses(page, [fixtureCategory], [fixtureItem]);
  await page.goto("/menu");

  await expect(
    page.getByRole("navigation", { name: "Menu categories" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: fixtureCategory.name }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: fixtureItem.name }),
  ).toBeVisible();
  await expect(page.getByText("Temporarily unavailable")).toBeVisible();
  await expect(page.getByText("Regular", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Classic", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Seasonal", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("₱75", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("₱85", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /add to cart/i })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /checkout/i })).toHaveCount(0);
});

test("TC-P2-027 — Menu exposes truthful loading and empty states", async ({
  page,
}) => {
  await page.route("**/rest/v1/categories*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
  await page.route("**/rest/v1/items*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  await page.goto("/menu");

  await expect(page.locator("main").getByRole("status")).toContainText(
    "Brewing up the latest choices",
  );
  await expect(page.locator("main").getByRole("status")).toContainText(
    "The public menu is not available right now.",
  );
  await expect(
    page.getByRole("link", { name: "Contact the shop" }),
  ).toHaveAttribute("href", "/contact");
});

test("TC-P2-028 — Menu handles retrieval failure without fabricated fallback data", async ({
  page,
}) => {
  const postgrestError = JSON.stringify({
    code: "PGRST100",
    message: "E2E simulated query error",
    details: null,
    hint: null,
  });

  for (const resource of ["categories", "items"]) {
    await page.route(`**/rest/v1/${resource}*`, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: postgrestError,
      });
    });
  }

  await page.goto("/menu");

  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("We couldn’t retrieve the current menu.");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(
    alert.getByRole("link", { name: "Contact the shop" }),
  ).toHaveAttribute("href", "/contact");
  await expect(
    page.getByRole("navigation", { name: "Menu categories" }),
  ).toHaveCount(0);
});

const spyCategories = [
  "Alpha Drinks",
  "Bravo Bites",
  "Charlie Noodles",
  "Delta Combos",
].map((name, index) => ({ id: `spy-category-${index + 1}`, name }));

const spyItems = spyCategories.flatMap((category, c) =>
  [1, 2, 3, 4, 5].map((n) => ({
    id: `spy-item-${c + 1}-${n}`,
    category_id: category.id,
    name: `${category.name} ${n}`,
    flavors: "",
    variants_json: [
      { id: `spy-variant-${c + 1}-${n}`, name: "Regular", basePrice: 70 + n },
    ],
    is_available: true,
  })),
);

test("TC-P4-019 — the active category tab follows the page and a clicked tab is current at once", async ({
  page,
}) => {
  await mockMenuResponses(page, spyCategories, spyItems);
  await page.goto("/menu");
  const nav = page.getByRole("navigation", { name: "Menu categories" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  const tab = (name: string) => nav.getByRole("link", { name });
  const current = nav.locator('[aria-current="true"]');

  // bringing a category up under the tab bar makes its tab current
  await page
    .locator("#menu-category-3")
    .evaluate((section) => section.scrollIntoView());
  await expect(tab("Charlie Noodles")).toHaveAttribute("aria-current", "true", {
    timeout: 1000,
  });
  await expect(current).toHaveCount(1);

  // and scrolling back up hands it back
  await page
    .locator("#menu-category-2")
    .evaluate((section) => section.scrollIntoView());
  await expect(tab("Bravo Bites")).toHaveAttribute("aria-current", "true", {
    timeout: 1000,
  });

  // a clicked tab is current straight away and its section is on screen
  await tab("Delta Combos").click();
  await expect(tab("Delta Combos")).toHaveAttribute("aria-current", "true", {
    timeout: 300,
  });
  await expect(
    page.getByRole("heading", { level: 2, name: "Delta Combos" }),
  ).toBeInViewport();
  await tab("Alpha Drinks").click();
  await expect(tab("Alpha Drinks")).toHaveAttribute("aria-current", "true", {
    timeout: 300,
  });
  await expect(current).toHaveCount(1);

  // scrolling by hand right after a click takes over again; at the bottom
  // of the page the last category is current
  await page.mouse.move(200, 600);
  await page.mouse.wheel(0, 40_000);
  await expect(tab("Delta Combos")).toHaveAttribute("aria-current", "true", {
    timeout: 2000,
  });
});
