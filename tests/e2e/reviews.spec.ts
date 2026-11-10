import { expect, test, type Page } from "@playwright/test";

/**
 * Customer ratings and reviews (FR-098).
 *
 * MOCK DATA — FOR DEVELOPMENT ONLY
 * PostgREST and the review API are mocked in the browser, so no live
 * database or personal details are used.
 *
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in docs/evidence/phase-5/reviews/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-5/reviews";

type MockReview = {
  id: string;
  display_name: string;
  rating: number;
  body: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};

const initialMockReviews: MockReview[] = [
  {
    id: "rev-mock-1",
    display_name: "Maria",
    rating: 5,
    body: "The caramel latte is rich and smooth, and the shop cats make it the coziest café in Kabacan.",
    hidden: false,
    created_at: "2026-11-09T08:30:00Z",
    updated_at: "2026-11-09T08:30:00Z",
  },
  {
    id: "rev-mock-2",
    display_name: "Carlos",
    rating: 5,
    body: "Fresh and piping hot Takoyaki every time! Staff is super welcoming.",
    hidden: false,
    created_at: "2026-11-08T15:20:00Z",
    updated_at: "2026-11-08T15:20:00Z",
  },
  {
    id: "rev-mock-3",
    display_name: "Guest",
    rating: 4,
    body: "Great atmosphere to study and relax. Love the Matcha latte.",
    hidden: false,
    created_at: "2026-11-07T11:15:00Z",
    updated_at: "2026-11-07T11:15:00Z",
  },
];

async function mockReviewsRest(page: Page, reviews: MockReview[]) {
  await page.route("**/rest/v1/reviews*", async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "OPTIONS") {
      return route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "*",
        },
      });
    }

    if (method === "GET") {
      const url = new URL(request.url());
      const selectParam = url.searchParams.get("select") ?? "";

      // If fetching only rating for summary calculation
      if (selectParam === "rating") {
        return route.fulfill({
          status: 200,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
          json: reviews.map((r) => ({ rating: r.rating })),
        });
      }

      const total = reviews.length;
      return route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "content-range": total > 0 ? `0-${total - 1}/${total}` : "*/0",
        },
        json: reviews,
      });
    }
    return route.fulfill({ status: 200 });
  });
}

async function captureEvidence(page: Page, filename: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${filename}`,
    fullPage: false,
  });
}

test.describe("Ratings and reviews (FR-098)", () => {
  test("TC-P5-201 — customers can read reviews with average rating and star counts on the About page", async ({
    page,
  }) => {
    const reviews = [...initialMockReviews];
    await mockReviewsRest(page, reviews);

    // Desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/about");

    const reviewsSection = page.locator("#reviews");
    await expect(reviewsSection).toBeVisible();
    await reviewsSection.scrollIntoViewIfNeeded();

    await expect(
      reviewsSection.getByRole("heading", {
        name: "Customer ratings and reviews",
      }),
    ).toBeVisible();
    await expect(reviewsSection.getByText("4.7")).toBeVisible();
    await expect(reviewsSection.getByText(/based on 3 reviews/i)).toBeVisible();

    await expect(
      reviewsSection.locator("article").filter({ hasText: "Maria" }),
    ).toBeVisible();
    await expect(
      reviewsSection.locator("article").filter({ hasText: "Carlos" }),
    ).toBeVisible();
    await expect(
      reviewsSection.locator("article").filter({ hasText: "Guest" }),
    ).toBeVisible();

    await captureEvidence(page, "reviews-list-desktop-1440.png");

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const mobileSection = page.locator("#reviews");
    await mobileSection.scrollIntoViewIfNeeded();
    await expect(
      mobileSection.getByRole("heading", {
        name: "Customer ratings and reviews",
      }),
    ).toBeVisible();

    await captureEvidence(page, "reviews-list-mobile-390.png");
  });

  test("TC-P5-202 — a guest customer can post a star rating and short review", async ({
    page,
  }) => {
    const reviews = [...initialMockReviews];
    await mockReviewsRest(page, reviews);

    // Mock POST /api/reviews
    await page.route("**/api/reviews", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        const newReview: MockReview = {
          id: "rev-new-guest",
          display_name: "Guest",
          rating: body.rating,
          body: body.body,
          hidden: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        reviews.unshift(newReview);
        return route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          json: { ok: true, review: newReview },
        });
      }
      return route.fallback();
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/about");

    const reviewsSection = page.locator("#reviews");
    await reviewsSection.scrollIntoViewIfNeeded();

    // Select 5 stars
    const star5 = reviewsSection.getByRole("radio", { name: "5 stars" });
    await star5.check({ force: true });

    // Type review body
    const bodyInput = reviewsSection.getByLabel(/your review/i);
    await bodyInput.fill("The iced caramel latte was smooth and delicious.");

    // Submit review
    const submitBtn = reviewsSection.getByRole("button", {
      name: "Post review",
    });
    await submitBtn.click();

    // Expect success message
    await expect(
      reviewsSection.getByText(/thank you! your review has been posted/i),
    ).toBeVisible();

    // Expect newly posted review in the list
    await expect(
      reviewsSection.getByText(
        "The iced caramel latte was smooth and delicious.",
      ),
    ).toBeVisible();

    await captureEvidence(page, "review-posted-desktop-1440.png");

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await captureEvidence(page, "review-posted-mobile-390.png");
  });

  test("TC-P5-203 — shows friendly error message when rate limited", async ({
    page,
  }) => {
    await mockReviewsRest(page, initialMockReviews);

    // Mock POST /api/reviews returning 429
    await page.route("**/api/reviews", async (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": "600",
          },
          json: {
            ok: false,
            error: "rate-limited",
            message:
              "Too many reviews from this device. Please wait a few minutes and try again.",
          },
        });
      }
      return route.fallback();
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/about");

    const reviewsSection = page.locator("#reviews");
    await reviewsSection.scrollIntoViewIfNeeded();

    const star4 = reviewsSection.getByRole("radio", { name: "4 stars" });
    await star4.check({ force: true });

    const bodyInput = reviewsSection.getByLabel(/your review/i);
    await bodyInput.fill("Trying to submit too many reviews in a short time.");

    const submitBtn = reviewsSection.getByRole("button", {
      name: "Post review",
    });
    await submitBtn.click();

    const alert = reviewsSection.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Too many reviews from this device");

    await captureEvidence(page, "reviews-rate-limit-desktop-1440.png");

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await captureEvidence(page, "reviews-rate-limit-mobile-390.png");
  });
});
