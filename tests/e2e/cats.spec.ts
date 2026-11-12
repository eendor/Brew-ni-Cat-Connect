import { expect, test } from "@playwright/test";

import { catsOverContent } from "./cat-helpers";

/**
 * Cat characters (FR-099). Update 2026-11-13 (ADR-032): the shop's own cats
 * perch on the edges of the screen instead of walking in a footer strip.
 * This checks where they sit; cats.three.spec.ts checks the 3D cats drawn
 * there (and refreshes the screenshots).
 */

for (const size of [
  { name: "phone", width: 390, height: 844, paths: ["/", "/menu", "/contact"] },
  {
    name: "desktop",
    width: 1440,
    height: 900,
    paths: ["/", "/about", "/gallery"],
  },
  { name: "wide", width: 1920, height: 1080, paths: ["/about", "/menu"] },
]) {
  test(`TC-P9-005 — the shop's cats perch around the page and cover nothing (${size.name})`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    // The chromium project turns reduced motion on; the cats move only without it.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const path of size.paths) {
      await page.goto(path);
      const layer = page.getByTestId("cat-layer");
      await expect(layer).toHaveAttribute("aria-hidden", "true");
      await expect(layer).toHaveCSS("pointer-events", "none");
      // let the cats settle after their entrance
      await page.waitForTimeout(1_800);
      expect(await catsOverContent(page), path).toEqual([]);
      for (const y of [0.5, 1]) {
        await page.evaluate(
          (f) =>
            window.scrollTo(0, f * (document.body.scrollHeight - innerHeight)),
          y,
        );
        await page.waitForTimeout(1_200);
        expect(await catsOverContent(page), `${path} at ${y}`).toEqual([]);
      }
    }
  });
}

test("TC-P9-006 — with reduced motion the cats sit still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/about");
  await page.waitForTimeout(1_000);
  const cats = page.locator('.shop-cat[data-shown="true"]');
  const state = () =>
    cats.evaluateAll((nodes) =>
      nodes
        .map(
          (n) =>
            `${(n as HTMLElement).dataset.cat} ${(n as HTMLElement).style.transform} ${(n as HTMLElement).style.left} ${(n as HTMLElement).style.top}`,
        )
        .join("|"),
    );
  const before = await state();
  await page.waitForTimeout(3_000);
  expect(await state()).toBe(before);
  expect(await catsOverContent(page)).toEqual([]);
});
