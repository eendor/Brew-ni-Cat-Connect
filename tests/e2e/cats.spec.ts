import { expect, test, type Page } from "@playwright/test";

/**
 * Cat characters (FR-099). Update 2026-11-13 (ADR-032): the shop's own cats
 * perch on the edges of the screen instead of walking in a footer strip.
 * Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-9/cat-characters/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/cat-characters";

/** Page content (text, controls, pictures, cards) under any shown cat. */
async function catsOverContent(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const content =
      "a, button, input, select, textarea, label, p, h1, h2, h3, h4, h5, h6, li, img, picture, video, figure, svg, article, [role=dialog]";
    const cats = [
      ...document.querySelectorAll<HTMLElement>('.shop-cat[data-shown="true"]'),
    ];
    const hits: string[] = [];
    for (const cat of cats) {
      const c = cat.getBoundingClientRect();
      const box = {
        left: Math.max(0, c.left),
        right: Math.min(window.innerWidth, c.right),
        top: Math.max(0, c.top),
        bottom: Math.min(window.innerHeight, c.bottom),
      };
      for (const el of document.querySelectorAll(content)) {
        if (el.closest('[aria-hidden="true"]')) continue;
        if (
          !el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          })
        )
          continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // a few pixels of slack for the sway
        if (
          r.left < box.right - 6 &&
          r.right > box.left + 6 &&
          r.top < box.bottom - 6 &&
          r.bottom > box.top + 6
        )
          hits.push(
            `${cat.dataset.cat} over ${el.tagName} ${el.textContent?.trim().slice(0, 30)}`,
          );
      }
    }
    return hits;
  });
}

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
    const picture = await page.request.get("/cats/kasper.webp");
    expect(picture.status()).toBe(200);
    if (CAPTURE_EVIDENCE) {
      await page.goto("/");
      await page.waitForTimeout(2_500);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/shop-cats-home-${size.name}-${size.width}.png`,
      });
      await page.goto("/about");
      await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2));
      await page.waitForTimeout(2_500);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/shop-cats-about-${size.name}-${size.width}.png`,
      });
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
