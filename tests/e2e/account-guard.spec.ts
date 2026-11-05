import { expect, test } from "@playwright/test";

test.describe("Account Page Guard E2E (FR-036)", () => {
  const mockUser = {
    id: "e2e-user-guard",
    aud: "authenticated",
    role: "authenticated",
    email: "guard-test@example.com",
    email_confirmed_at: "2026-11-05T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  };

  const mockSession = {
    access_token: "mock-access-token-guard",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token-guard",
    user: mockUser,
  };

  test("TC-P4-271 — redirects signed-out visitor from /account/profile to sign in, then redirects back upon sign in", async ({
    page,
  }) => {
    // Intercept Supabase Auth endpoints for successful login
    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
      });
    });

    await page.route("**/auth/v1/user*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      });
    });

    await page.route("**/rest/v1/customer_profiles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_id: "e2e-user-guard",
          full_name: "Juan Dela Cruz",
          phone: "+639123456789",
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        }),
      });
    });

    // 1. Visit /account/profile directly as an unauthenticated visitor
    await page.goto("/account/profile");

    // 2. Guard should redirect to sign-in with returnTo parameter
    await page.waitForURL("**/account/sign-in?returnTo=%2Faccount%2Fprofile");
    await expect(
      page.getByRole("heading", { name: "Sign In", level: 1 }),
    ).toBeVisible();

    // 3. Complete sign in
    await page.getByLabel(/email address/i).fill("guard-test@example.com");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // 4. Should redirect back to /account/profile
    await page.waitForURL("**/account/profile");
    await expect(
      page.getByRole("heading", { name: "Profile", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toHaveValue(
      "guard-test@example.com",
    );
  });

  test("TC-P4-272 — captures screenshots of customer profile screen", async ({
    page,
  }) => {
    test.skip(
      process.env.CAPTURE_EVIDENCE !== "1",
      "Skipped unless CAPTURE_EVIDENCE=1",
    );

    await page.route("**/auth/v1/user*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      });
    });

    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
      });
    });

    await page.route("**/rest/v1/customer_profiles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_id: "e2e-user-guard",
          full_name: "Juan Dela Cruz",
          phone: "+639123456789",
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        }),
      });
    });

    // Populate session in localStorage so user loads as signed in
    await page.addInitScript((session) => {
      window.localStorage.setItem(
        "sb-example-auth-token",
        JSON.stringify(session),
      );
    }, mockSession);

    await page.goto("/account/profile");
    await expect(
      page.getByRole("heading", { name: "Profile", level: 1 }),
    ).toBeVisible();
    await page.screenshot({
      path: "docs/evidence/phase-4/screenshots/profile.png",
      fullPage: true,
      mask: [page.getByRole("region", { name: "Find us" })],
    });
  });

  test("TC-P4-273 — captures screenshots of checkout with prefilled customer details", async ({
    page,
  }) => {
    test.skip(
      process.env.CAPTURE_EVIDENCE !== "1",
      "Skipped unless CAPTURE_EVIDENCE=1",
    );

    await page.route("**/auth/v1/user*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      });
    });

    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
      });
    });

    await page.route("**/rest/v1/customer_profiles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_id: "e2e-user-guard",
          full_name: "Juan Dela Cruz",
          phone: "+639123456789",
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        }),
      });
    });

    // Populate session & cart in localStorage
    await page.addInitScript(
      ({ session, cart }) => {
        window.localStorage.setItem(
          "sb-example-auth-token",
          JSON.stringify(session),
        );
        window.localStorage.setItem(
          "brew_ni_cat_cart_v1",
          JSON.stringify(cart),
        );
      },
      {
        session: mockSession,
        cart: {
          lines: [
            {
              key: "iced-spanish-latte::regular-16::",
              itemId: "iced-spanish-latte",
              itemName: "Iced Spanish Latte",
              variantId: "regular-16",
              variantName: "16 oz",
              flavor: null,
              unitPrice: 110,
              quantity: 1,
              lineTotal: 110,
            },
          ],
          fulfillment: "pickup",
        },
      },
    );

    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { name: "Checkout", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toHaveValue("Juan Dela Cruz");
    await expect(page.getByLabel(/phone number/i)).toHaveValue("+639123456789");

    await page.screenshot({
      path: "docs/evidence/phase-4/screenshots/checkout-prefill.png",
      fullPage: true,
      mask: [page.getByRole("region", { name: "Find us" })],
    });
  });
});
