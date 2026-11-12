import type { Page } from "@playwright/test";

/**
 * Stands in for Google during browser tests (ADR-030). Supabase's authorize
 * address sends the browser straight back to the callback with a one-time
 * code, and the code exchange returns `session`.
 */
export async function mockGoogleOAuth(
  page: Page,
  session: Record<string, unknown>,
  user: Record<string, unknown>,
) {
  await page.route("**/auth/v1/authorize*", async (route) => {
    const redirectTo = new URL(route.request().url()).searchParams.get(
      "redirect_to",
    );
    const back = new URL(redirectTo ?? "/account/callback", "http://127.0.0.1");
    back.searchParams.set("code", "mock-oauth-code");
    await route.fulfill({
      status: 302,
      headers: { location: back.toString() },
    });
  });

  await page.route("**/auth/v1/token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });

  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
}
