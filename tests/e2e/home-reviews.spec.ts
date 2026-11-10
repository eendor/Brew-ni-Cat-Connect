import { expect, test, type Page } from "@playwright/test";

/**
 * Reviews on the home page and the Reviews link in the navigation (FR-098).
 *
 * MOCK DATA — FOR DEVELOPMENT ONLY
 * PostgREST is mocked in the browser, so no live database or personal
 * details are used.
 *
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in docs/evidence/phase-5/reviews-home/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-5/reviews-home";

const RATINGS = [5, 5, 4, 5, 4, 5, 4];
const BODIES = [
  "Mock review: the caramel latte was smooth and the shop cats were friendly.",
  "Mock review: the takoyaki came out hot and the staff were welcoming.",
  "Mock review: a quiet place to study, and the matcha latte was good.",
  "Mock review: the iced mocha was just sweet enough.",
  "Mock review: we waited a little at lunch, but the food was worth it.",
  "Mock review: the cats napped by the window the whole afternoon.",
  "Mock review: good coffee and fair prices near the campus.",
];
const mockReviews = RATINGS.map((rating, index) => {
  const created = new Date(Date.UTC(2026, 10, 9 - index, 8, 30)).toISOString();
  return {
    id: `rev-home-${index + 1}`,
    display_name: `Test Customer ${String.fromCharCode(65 + index)}`,
    rating,
    body: BODIES[index],
    hidden: false,
    created_at: created,
    updated_at: created,
  };
});

async function mockReviewsRest(page: Page) {
  await page.route("**/rest/v1/reviews*", async (route) => {
    const request = route.request();
    const cors = { "access-control-allow-origin": "*" };
    if (request.method() === "OPTIONS") {
      return route.fulfill({
        status: 200,
        headers: {
          ...cors,
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "*",
        },
      });
    }
    const url = new URL(request.url());
    if (url.searchParams.get("select") === "rating") {
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
        json: mockReviews.map(({ rating }) => ({ rating })),
      });
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? mockReviews.length);
    const rows = mockReviews.slice(offset, offset + limit);
    const total = mockReviews.length;
    return route.fulfill({
      status: 200,
      headers: {
        ...cors,
        "content-type": "application/json",
        "access-control-expose-headers": "content-range",
        "content-range": rows.length
          ? `${offset}-${offset + rows.length - 1}/${total}`
          : `*/${total}`,
      },
      json: rows,
    });
  });
}

async function captureEvidence(page: Page, filename: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: `${EVIDENCE_DIR}/${filename}` });
}

async function expectReviewsSectionInView(page: Page) {
  await expect(page).toHaveURL(/\/about#reviews$/);
  await expect(page.locator("#reviews")).toBeInViewport();
}

test.describe("Reviews on the home page (FR-098)", () => {
  test("TC-P5-208 — the home page shows the average rating, the newest three reviews and a link to all reviews", async ({
    page,
  }) => {
    await mockReviewsRest(page);
    for (const [width, height, name] of [
      [390, 844, "home-reviews-phone-390.png"],
      [1440, 900, "home-reviews-desktop-1440.png"],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const block = page.getByTestId("home-reviews");
      await block.scrollIntoViewIfNeeded();
      await expect(
        block.getByRole("heading", { name: "What customers say" }),
      ).toBeVisible();
      await expect(block.getByText("4.6", { exact: true })).toBeVisible();
      await expect(block.getByText("7 reviews")).toBeVisible();
      await expect(block.getByRole("article")).toHaveCount(3);
      await expect(block.getByText(BODIES[0]!)).toBeVisible();
      await expect(block.getByText(BODIES[3]!)).toHaveCount(0);
      const width_ = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(width_).toBeLessThanOrEqual(0);
      await captureEvidence(page, name);
    }

    await page
      .getByTestId("home-reviews")
      .getByRole("link", { name: "Read all reviews" })
      .click();
    await expectReviewsSectionInView(page);
  });

  test("TC-P5-209 — the Reviews link in the desktop and phone navigation opens the reviews on the About page", async ({
    page,
  }) => {
    await mockReviewsRest(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const desktop = page.getByRole("navigation", {
      name: "Desktop navigation",
    });
    const link = desktop.getByRole("link", { name: "Reviews" });
    await expect(link).toHaveAttribute("href", "/about#reviews");
    await expect(link).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    await link.click();
    await expectReviewsSectionInView(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
    const mobileLink = mobile.getByRole("link", { name: "Reviews" });
    await expect(mobileLink).toBeVisible();
    await captureEvidence(page, "nav-reviews-phone-390.png");
    await mobileLink.click();
    await expectReviewsSectionInView(page);
  });
});
