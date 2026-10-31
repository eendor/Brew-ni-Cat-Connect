import { expect, test } from "@playwright/test";

const DAY = {
  theme: "day",
  scheme: "light",
  background: "rgb(246, 238, 225)",
  text: "rgb(29, 42, 33)",
  themeColor: "#f6eee1",
};

const NIGHT = {
  theme: "night",
  scheme: "dark",
  background: "rgb(20, 18, 15)",
  text: "rgb(246, 238, 225)",
  themeColor: "#14120f",
};

test.describe("Day and night themes", () => {
  test.use({ colorScheme: "dark" });

  test("TC-P4-238 — a dark-mode device opens the night theme, and the header button switches to day and remembers it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const look = () =>
      page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        scheme: getComputedStyle(document.documentElement).colorScheme,
        background: getComputedStyle(document.body).backgroundColor,
        text: getComputedStyle(document.body).color,
        themeColor: document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      }));

    await expect.poll(look).toEqual(NIGHT);

    await page.getByRole("button", { name: "Switch to day theme" }).click();
    await expect.poll(look).toEqual(DAY);

    // the choice beats the device's dark mode on the next visit
    await page.reload();
    await expect.poll(look).toEqual(DAY);
    await expect(
      page.getByRole("button", { name: "Switch to night theme" }),
    ).toBeVisible();
  });
});
