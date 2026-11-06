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
  await page.route("**/rest/v1/menu_add_ons*", (route) =>
    route.fulfill({ json: [] }),
  );
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
  await page.route("**/rest/v1/menu_add_ons*", (route) =>
    route.fulfill({ json: [] }),
  );
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

  for (const resource of ["categories", "items", "menu_add_ons"]) {
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

test("TC-P6-216 — a short menu card is as tall as its content, and the take-out box and cat treats are not listed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const row = (
    id: string,
    categoryId: string,
    name: string,
    options: ReadonlyArray<readonly [string, number]>,
  ) => ({
    id,
    category_id: categoryId,
    name,
    flavors: null,
    variants_json: options.map(([option, price], index) => ({
      id: `${id}-${index}`,
      name: option,
      basePrice: price,
    })),
    is_available: true,
  });
  await mockMenuResponses(
    page,
    [
      { id: "bites", name: "Cat-Tastic Bites" },
      { id: "box", name: "Take-out Box" },
      { id: "treats", name: "Cat Treats" },
    ],
    [
      // a long card and a short one share a row, like Takoyaki and Nachos
      row(
        "long",
        "bites",
        "Long Bite",
        Array.from({ length: 16 }, (_, i) => [`Long option ${i + 1}`, 40 + i]),
      ),
      row("short", "bites", "Short Bite", [["Nachos + Veggies + Meat", 99]]),
      row("box", "box", "Take-out Box", [["Regular", 10]]),
      row("treats", "treats", "Cat Treats", [["Regular", 5]]),
    ],
  );
  await page.goto("/menu");

  // both are sold only at the shop
  const nav = page.getByRole("navigation", { name: "Menu categories" });
  await expect(nav.getByRole("link")).toHaveCount(1);
  await expect(
    nav.getByRole("link", { name: "Cat-Tastic Bites" }),
  ).toBeVisible();
  for (const name of ["Take-out Box", "Cat Treats"]) {
    await expect(page.getByRole("heading", { name })).toHaveCount(0);
  }

  const card = (name: string) =>
    page
      .locator("article.menu-card")
      .filter({ has: page.getByRole("heading", { level: 3, name }) });
  await expect(card("Short Bite")).toBeVisible();
  const long = await card("Long Bite").boundingBox();
  const short = await card("Short Bite").boundingBox();
  expect(long && short).toBeTruthy();
  expect(short!.height).toBeLessThan(long!.height / 2);
  // the Add to order button sits right under the options, with no stretched gap
  const gap = await card("Short Bite").evaluate((article) => {
    const footer = article.querySelector(".menu-card__footer");
    const options = footer?.previousElementSibling;
    return footer && options
      ? footer.getBoundingClientRect().top -
          options.getBoundingClientRect().bottom
      : Number.NaN;
  });
  expect(gap).toBeLessThan(2);
});

test("TC-P6-222 — fries mix up to 3 flavors in the order dialog, at the size price", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockMenuResponses(
    page,
    [{ id: "bites", name: "Cat-Tastic Bites" }],
    [
      {
        id: "bite_fries",
        category_id: "bites",
        name: "Fries (Cat Claws)",
        flavors: "BBQ Scratch|Cheesy Purr|Sour Cream|Spicy Claw",
        variants_json: [
          { id: "fries-small", name: "Small", basePrice: 30 },
          { id: "fries-medium", name: "Medium", basePrice: 50 },
        ],
        is_available: true,
      },
    ],
  );
  await page.goto("/menu");
  await page.getByRole("button", { name: "Order Fries (Cat Claws)" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Medium" }).click();
  await dialog.getByRole("button", { name: "Mix up to 3 flavors" }).click();
  const three = ["BBQ Scratch", "Cheesy Purr", "Sour Cream"];
  for (const flavor of three) {
    await dialog.getByRole("button", { name: flavor, exact: true }).click();
  }
  await expect(
    dialog.getByText("3/3 picked, same price as the size"),
  ).toBeVisible();
  for (const flavor of three) {
    await expect(
      dialog.getByRole("button", { name: flavor, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  if (process.env.CAPTURE_EVIDENCE === "1") {
    await page.screenshot({
      path: "docs/evidence/phase-4/three-flavor-mixes/fries-mix-dialog.png",
    });
  }

  await dialog.getByRole("button", { name: "Add to Order" }).click();
  const cart = page.getByRole("dialog", { name: "Your Order" });
  await expect(cart).toBeVisible();
  await expect(
    cart.getByText("Flavor: BBQ Scratch / Cheesy Purr / Sour Cream"),
  ).toBeVisible();
  await expect(cart.getByText("₱50").first()).toBeVisible();
});
