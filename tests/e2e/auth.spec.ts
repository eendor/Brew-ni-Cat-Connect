import { expect, test } from "@playwright/test";

import { mockGoogleOAuth } from "./support/google-oauth";

test.describe("Customer Authentication E2E", () => {
  test("TC-P4-172 — signs in with mocked Google OAuth and signs out", async ({
    page,
  }) => {
    const mockUser = {
      id: "e2e-user-id",
      aud: "authenticated",
      role: "authenticated",
      email: "customer@example.com",
      email_confirmed_at: "2026-10-27T00:00:00Z",
      app_metadata: { provider: "google" },
      user_metadata: {},
      created_at: "2026-10-27T00:00:00Z",
      updated_at: "2026-10-27T00:00:00Z",
    };

    const mockSession = {
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "mock-refresh-token",
      user: mockUser,
    };

    await mockGoogleOAuth(page, mockSession, mockUser);

    await page.route("**/auth/v1/logout*", async (route) => {
      await route.fulfill({
        status: 204,
        body: "",
      });
    });

    // 1. Visit sign-in page directly
    await page.goto("/account/sign-in");
    await expect(
      page.getByRole("heading", { name: "Sign In", level: 1 }),
    ).toBeVisible();

    // 2. No email or password form: Google is the only way in (ADR-030)
    await expect(page.getByLabel(/password/i)).toHaveCount(0);

    // 3. Sign in with (mocked) Google; it returns through /account/callback
    await page.getByRole("button", { name: "Sign in with Google" }).click();
    await page.waitForURL("/");

    // 4. Header should now have Account menu instead of "Sign in"
    const accountButton = page.getByRole("button", { name: "Account menu" });
    await expect(accountButton).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^sign in$/i }),
    ).not.toBeVisible();

    // 5. Open account menu and sign out
    await accountButton.click();
    await expect(accountButton).toHaveAttribute("aria-expanded", "true");

    const signOutButton = page.getByRole("button", { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    // 6. Header should revert to displaying "Sign in"
    await expect(page.getByRole("link", { name: /^sign in$/i })).toBeVisible();
    await expect(accountButton).not.toBeVisible();
  });

  test("TC-P4-173 — captures screenshots of the Google sign-in screens", async ({
    page,
  }) => {
    test.skip(
      process.env.CAPTURE_EVIDENCE !== "1",
      "Skipped unless CAPTURE_EVIDENCE=1",
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/account/sign-in");
    await page.screenshot({
      path: "docs/evidence/phase-5/google-sign-in/sign-in-1440x900.png",
      fullPage: true,
    });

    await page.goto("/account/sign-up");
    await page.screenshot({
      path: "docs/evidence/phase-5/google-sign-in/sign-up-1440x900.png",
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account/sign-in");
    await page.screenshot({
      path: "docs/evidence/phase-5/google-sign-in/sign-in-390x844.png",
      fullPage: true,
    });

    await page.goto("/account/callback?error=access_denied");
    await page.screenshot({
      path: "docs/evidence/phase-5/google-sign-in/callback-cancelled-390x844.png",
      fullPage: true,
    });
  });

  test("TC-P5-225 — the retired password pages send visitors to Sign In", async ({
    page,
  }) => {
    for (const path of [
      "/account/forgot-password",
      "/account/reset-password",
    ]) {
      await page.goto(path);
      await page.waitForURL("**/account/sign-in");
      await expect(
        page.getByRole("button", { name: "Sign in with Google" }),
      ).toBeVisible();
    }
  });

  test("TC-P5-226 — a cancelled Google sign-in shows the message and a way back", async ({
    page,
  }) => {
    await page.goto("/account/callback?error=access_denied");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Google sign-in was cancelled." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to Sign In" }).click();
    await page.waitForURL("**/account/sign-in");
  });
});
