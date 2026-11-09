import { expect, test, type Page } from "@playwright/test";

/**
 * Privacy Policy page (FR-042, NFR-026).
 *
 * The page shows saved content only, so no live account or live data is used.
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-5/privacy-policy/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";

const EVIDENCE_DIR = "docs/evidence/phase-5/privacy-policy";

async function capture(page: Page, filename: string, fullPage = true) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: `${EVIDENCE_DIR}/${filename}`, fullPage });
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("TC-P5-094 — the footer opens the Privacy Policy, and the data deletion link lands on its section", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const footerLink = page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Privacy Policy" });
  await footerLink.click();
  await page.waitForURL("**/privacy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Privacy Policy/);
  await capture(page, "privacy-page-1440x900.png");

  // the URL given to Meta for data deletion instructions, opened fresh (a
  // hash change on the same page would not load it again)
  // the site scrolls smoothly; reduced motion makes the jump instant so the
  // check does not race the animation on slower machines
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("about:blank");
  const response = await page.goto("/privacy#delete-your-data");
  expect(response?.ok()).toBe(true);
  const heading = page.getByRole("heading", {
    level: 2,
    name: "How to delete your data",
  });
  await expect(heading).toBeInViewport();
  // the sticky header does not cover the heading
  const headerBottom = await page
    .getByRole("banner")
    .evaluate((header) => header.getBoundingClientRect().bottom);
  const headingTop = await heading.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(headingTop).toBeGreaterThanOrEqual(headerBottom);
});

test("TC-P5-095 — the Privacy Policy reads on a phone with no sideways scroll and full-size contact links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  const contact = page.locator("section#contact-us");
  for (const link of await contact.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await capture(page, "privacy-page-390x844.png");

  await page.goto("/privacy#delete-your-data");
  await expect(
    page.getByRole("heading", { level: 2, name: "How to delete your data" }),
  ).toBeInViewport();
  await capture(page, "delete-your-data-390x844.png", false);
});
