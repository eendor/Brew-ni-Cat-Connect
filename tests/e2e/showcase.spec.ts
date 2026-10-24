import { expect, test } from "@playwright/test";

test("TC-P2-021 — homepage presents the official Brew ni Cat showcase", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Brew ni Cat Coffee Shop home" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Coffee, comfort, and a little cat energy.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse current menu" }),
  ).toHaveAttribute("href", "/menu");
  await expect(
    page.getByRole("link", { name: "Plan your visit" }),
  ).toHaveAttribute("href", "/contact");
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
  expect(count).toBeLessThanOrEqual(36);

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
  await expect(address).toContainText("Abellera St, Poblacion");
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
  await expect(main.getByText(/Closed every Saturday/i).first()).toBeVisible();
  // exact: each rider link is also named "… Facebook page"
  await expect(
    main.getByRole("link", { name: "Facebook page", exact: true }),
  ).toHaveAttribute("href", /facebook\.com/);
  await expect(main.getByRole("link", { name: "TikTok" })).toHaveAttribute(
    "href",
    /tiktok\.com/,
  );

  await expect(
    main.getByRole("heading", {
      name: "Let a local rider order it for you.",
    }),
  ).toBeVisible();
  await expect(
    main.getByText(
      /Delivery fee, timing and payment are agreed with your rider/,
    ),
  ).toBeVisible();

  const riders = main.getByRole("list", { name: "Rider delivery services" });
  for (const name of [
    "Papa's Delivery",
    "Momshie's Pamalengke and Delivery Kabacan",
    "M&S Delivery Express Kabacan",
  ]) {
    await expect(
      riders.getByRole("link", { name: `${name} Facebook page` }),
    ).toHaveAttribute("href", /^https:\/\/www\.facebook\.com\//);
  }

  // every rider logo loads (they are lazy, so bring each into view)
  const logos = riders.locator("img");
  await expect(logos).toHaveCount(3);
  for (const logo of await logos.all()) {
    await logo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        logo.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
});
