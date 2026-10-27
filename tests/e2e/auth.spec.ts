import { expect, test } from "@playwright/test";

test.describe("Customer Authentication E2E", () => {
  test("TC-P4-172 — signs in with mocked Supabase Auth and signs out", async ({
    page,
  }) => {
    const mockUser = {
      id: "e2e-user-id",
      aud: "authenticated",
      role: "authenticated",
      email: "customer@example.com",
      email_confirmed_at: "2026-10-27T00:00:00Z",
      app_metadata: { provider: "email" },
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

    // Intercept Supabase Auth endpoints
    await page.route("**/auth/v1/token*", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.password === "wrongpassword") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            code: "invalid_credentials",
            error_code: "invalid_credentials",
            error: "invalid_grant",
            error_description: "Invalid login credentials",
            message: "Invalid login credentials",
          }),
        });
        return;
      }

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

    // 2. Test wrong password error
    await page.getByLabel(/email address/i).fill("customer@example.com");
    await page.getByLabel(/^password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(
      page.getByText(
        /incorrect email or password\. please check your credentials and try again\./i,
      ),
    ).toBeVisible();

    // 3. Test successful sign in
    await page.getByLabel(/^password/i).fill("correctpassword123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // Should redirect to home page
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

  test("TC-P4-173 — captures screenshots of new customer auth screens", async ({
    page,
  }) => {
    test.skip(
      process.env.CAPTURE_EVIDENCE !== "1",
      "Skipped unless CAPTURE_EVIDENCE=1",
    );

    await page.goto("/account/sign-in");
    await page.screenshot({
      path: "docs/evidence/phase-4/screenshots/sign-in.png",
      fullPage: true,
    });

    await page.goto("/account/sign-up");
    await page.screenshot({
      path: "docs/evidence/phase-4/screenshots/sign-up.png",
      fullPage: true,
    });

    await page.goto("/account/forgot-password");
    await page.screenshot({
      path: "docs/evidence/phase-4/screenshots/forgot-password.png",
      fullPage: true,
    });

    await page.goto("/account/reset-password");
    await page.screenshot({
      path: "docs/evidence/phase-4/screenshots/reset-password.png",
      fullPage: true,
    });
  });
});
