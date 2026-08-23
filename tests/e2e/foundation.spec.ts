import { expect, test } from "@playwright/test";

test("TC-P1-005 — homepage loads with its heading and desktop navigation", async ({
  page,
}) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Brew ni Cat Connect" }),
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

test("TC-P1-006 — mobile navigation opens without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation" });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.click();

  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Menu" }),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("TC-P1-007 — placeholder routes preserve the application shell", async ({
  page,
}) => {
  for (const route of [
    { path: "/menu", heading: "Menu" },
    { path: "/about", heading: "About" },
    { path: "/gallery", heading: "Gallery" },
    { path: "/contact", heading: "Contact" },
  ]) {
    const response = await page.goto(route.path);

    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: /Brew ni Cat/ }),
    ).toBeVisible();
  }
});

test("TC-P1-008 — unknown routes show the not-found experience", async ({
  page,
}) => {
  const response = await page.goto("/phase-one-route-that-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("TC-P1-009 — shell has no horizontal overflow at representative widths", async ({
  page,
}) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions, `viewport width ${width}px`).toEqual({
      clientWidth: width,
      scrollWidth: width,
    });
  }
});
