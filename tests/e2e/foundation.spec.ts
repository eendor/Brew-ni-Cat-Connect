import { expect, test } from "@playwright/test";

test("TC-P1-005 — homepage loads with its real heading and desktop navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Coffee, comfort, and a little cat energy.",
    }),
  ).toBeVisible();

  const navigation = page.getByRole("navigation", {
    name: "Desktop navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Menu" })).toHaveAttribute(
    "href",
    "/menu",
  );
});

test("TC-P1-006 — mobile navigation opens, closes, and handles Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const openButton = page.getByRole("button", { name: "Open navigation" });
  await expect(openButton).toBeVisible();
  await expect(openButton).toHaveAttribute("aria-expanded", "false");

  await openButton.click();

  const closeButton = page.getByRole("button", { name: "Close navigation" });
  await expect(closeButton).toHaveAttribute("aria-expanded", "true");

  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Menu" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(mobileNavigation).toBeHidden();
  await expect(openButton).toBeFocused();
  await expect(openButton).toHaveAttribute("aria-expanded", "false");

  await openButton.click();
  await mobileNavigation.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(mobileNavigation).toBeHidden();
});

test("TC-P1-007 — public routes preserve the shared application shell", async ({
  page,
}) => {
  const routes = [
    { path: "/menu", heading: "Menu" },
    { path: "/about", heading: "About Brew ni Cat" },
    { path: "/gallery", heading: "Gallery" },
    { path: "/contact", heading: "Contact & location" },
  ];

  for (const route of routes) {
    const response = await page.goto(route.path);

    expect(response?.ok(), route.path).toBe(true);
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", {
        name: "Brew ni Cat Coffee Shop home",
      }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  }
});

test("TC-P1-008 — unknown routes show the not-found experience", async ({
  page,
}) => {
  const response = await page.goto("/phase-two-route-that-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByRole("link", { name: "Browse menu" })).toHaveAttribute(
    "href",
    "/menu",
  );
});

test("TC-P1-009 — key public pages avoid horizontal viewport overflow", async ({
  page,
}) => {
  await page.route("**/rest/v1/categories*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
  await page.route("**/rest/v1/items*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });

    for (const path of ["/", "/menu", "/gallery", "/contact"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(
        dimensions.scrollWidth,
        `${path} at viewport width ${width}px`,
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  }
});
