import { expect, test } from "@playwright/test";

test("TC-P2-021 — homepage presents the official Brew ni Cat showcase", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("img", { name: "Brew ni Cat Coffee Shop logo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse current menu" }),
  ).toHaveAttribute("href", "/menu");
  await expect(
    page.getByRole("link", { name: "Plan your visit" }),
  ).toHaveAttribute("href", "/contact");
  await expect(
    page.getByRole("heading", {
      name: "Familiar favorites worth a closer look.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Matcha", { exact: true })).toBeVisible();
  await expect(page.getByText("Takoyaki", { exact: true })).toBeVisible();
  await expect(page.getByText("Fries", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Beside Pulido Eatery", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Cash and GCash", { exact: true })).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("next milestone");
  expect(bodyText).not.toContain("future customer experience");
  expect(bodyText).not.toContain("ordering not yet active");
  expect(bodyText).not.toContain("Phase 1");
});

test("TC-P2-022 — desktop header resolves the duplicate Menu action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const desktopNavigation = page.getByRole("navigation", {
    name: "Desktop navigation",
  });
  await expect(
    desktopNavigation.getByRole("link", { name: "Menu" }),
  ).toHaveCount(1);
  await expect(
    desktopNavigation.getByRole("link", { name: "View Menu" }),
  ).toHaveCount(0);

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Visit us" })).toHaveAttribute(
    "href",
    "/contact",
  );
});

test("TC-P2-023 — About page uses confirmed factual business content", async ({
  page,
}) => {
  await page.goto("/about");

  await expect(
    page.getByText("June 12, 2026", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Kabacan, Cotabato", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Drinks, snacks, noodles, and combos", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/owner biography/i)).toHaveCount(0);
});

test("TC-P2-024 — Gallery renders a curated, accessible photo selection", async ({
  page,
}) => {
  await page.goto("/gallery");

  const gallery = page.getByRole("region", {
    name: "Brew ni Cat photo gallery",
  });
  const images = gallery.locator("img");
  await expect(gallery).toBeVisible();
  await expect(images.first()).toBeAttached();
  const count = await images.count();

  expect(count).toBeGreaterThanOrEqual(12);
  expect(count).toBeLessThanOrEqual(24);

  const altTexts = await images.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("alt")?.trim() ?? ""),
  );
  expect(altTexts.every(Boolean)).toBe(true);
  expect(new Set(altTexts).size).toBe(altTexts.length);
});

test("TC-P2-025 — Contact page publishes confirmed visit and rider information", async ({
  page,
}) => {
  await page.goto("/contact");

  const main = page.getByRole("main");
  const address = main.locator("address");
  await expect(address).toContainText("Segundo St, Poblacion");
  await expect(address).toContainText("Kabacan, Cotabato 9407");
  await expect(address).toContainText("Philippines");
  await expect(address).toContainText("Beside Pulido Eatery");
  await expect(
    main.getByRole("link", { name: "0976 630 4785" }),
  ).toHaveAttribute("href", "tel:+639766304785");
  await expect(
    main.getByRole("link", { name: "popotpulido06@gmail.com" }),
  ).toHaveAttribute("href", "mailto:popotpulido06@gmail.com");
  await expect(main.getByText(/Cash.*GCash/)).toBeVisible();
  await expect(
    main.getByText("₱10 takeout box", { exact: true }),
  ).toBeVisible();
  await expect(main.getByText(/Operating hours may vary/i)).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Facebook page" }),
  ).toHaveAttribute("href", /facebook\.com/);
  await expect(main.getByRole("link", { name: "TikTok" })).toHaveAttribute(
    "href",
    /tiktok\.com/,
  );

  await expect(
    main.getByRole("heading", {
      name: "Arrange your preferred rider separately.",
    }),
  ).toBeVisible();
  await expect(
    main.getByText(/rider availability, delivery fees, arrival time/i),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "External rider page 1" }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "External rider page 2" }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "External rider page 3" }),
  ).toBeVisible();
});
