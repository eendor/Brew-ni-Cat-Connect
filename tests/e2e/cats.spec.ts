import { expect, test, type Page } from "@playwright/test";

/**
 * Cat characters (FR-099). Set CAPTURE_EVIDENCE=1 to refresh the screenshots
 * in docs/evidence/phase-9/cat-characters/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/cat-characters";

/** Interactive or text elements whose box overlaps the cat strip. */
async function overlapsWithStrip(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const strip = document.querySelector('[data-testid="cat-strip"]');
    if (!strip) return ["no strip"];
    const s = strip.getBoundingClientRect();
    const hits: string[] = [];
    for (const el of document.querySelectorAll(
      "a, button, input, select, textarea, p, h1, h2, h3, li, label",
    )) {
      if (strip.contains(el)) continue;
      // skip hidden layers such as the page-transition curtain
      if (el.closest('[aria-hidden="true"]')) continue;
      if (
        !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      )
        continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const overlap =
        r.left < s.right &&
        r.right > s.left &&
        r.top < s.bottom &&
        r.bottom > s.top;
      if (overlap)
        hits.push(`${el.tagName} ${el.textContent?.trim().slice(0, 30)}`);
    }
    return hits;
  });
}

for (const size of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`TC-P9-005 — the cats walk in their own strip and cover nothing (${size.name})`, async ({
    page,
  }) => {
    // The chromium project turns reduced motion on; the cats walk only without it.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/about");
    const strip = page.getByTestId("cat-strip");
    await strip.scrollIntoViewIfNeeded();
    await expect(strip).toHaveCSS("pointer-events", "none");
    await expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(await overlapsWithStrip(page)).toEqual([]);

    // Update 2026-11-10: the pixel cats (CC0 "Pet Cats Pack") wander on
    // their own; within a few seconds at least one has moved or changed
    // what it is doing. Their frames are a CSS animation in real time.
    const count = size.name === "phone" ? 3 : 12;
    const cats = strip.locator(".pixel-cat:not([hidden])");
    await expect(cats).toHaveCount(count);
    const sheet = await page.request.get("/cats/cat-1/walk.png");
    expect(sheet.status()).toBe(200);
    const state = () =>
      cats.evaluateAll((nodes) =>
        nodes
          .map(
            (n) =>
              `${(n as HTMLElement).style.transform} ${(n as HTMLElement).dataset.action}`,
          )
          .join("|"),
      );
    const before = await state();
    await page.evaluate(() =>
      document
        .querySelector('[data-testid="cat-strip"]')
        ?.scrollIntoView({ block: "center" }),
    );
    await expect.poll(state, { timeout: 15_000 }).not.toBe(before);
    expect(await overlapsWithStrip(page)).toEqual([]);
    if (CAPTURE_EVIDENCE) {
      await page.waitForTimeout(4_000);
      const box = await strip.boundingBox();
      if (box) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/pixel-cats-${size.name}-${size.width}.png`,
          clip: {
            x: 0,
            y: box.y - 40,
            width: size.width,
            height: box.height + 200,
          },
        });
      }
    }
  });
}

// Update 2026-11-10: the six pixel cats replace the four drawn ones.
test("TC-P9-006 — with reduced motion the cats sit still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  const strip = page.getByTestId("cat-strip");
  await strip.scrollIntoViewIfNeeded();
  const cats = strip.locator(".pixel-cat:not([hidden])");
  await expect(cats).toHaveCount(12);
  const state = () =>
    cats.evaluateAll((nodes) =>
      nodes
        .map(
          (n) =>
            `${(n as HTMLElement).style.transform} ${(n as HTMLElement).dataset.action}`,
        )
        .join("|"),
    );
  const before = await state();
  expect(before).not.toMatch(/walk|run/);
  await page.waitForTimeout(3_000);
  expect(await state()).toBe(before);
  if (CAPTURE_EVIDENCE) {
    await page.locator("footer").screenshot({
      path: `${EVIDENCE_DIR}/pixel-cats-sitting-reduced-motion-1440.png`,
    });
  }
});
