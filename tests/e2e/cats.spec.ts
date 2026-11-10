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
    await page.clock.install();
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/about");
    const strip = page.getByTestId("cat-strip");
    await strip.scrollIntoViewIfNeeded();
    await expect(strip).toHaveCSS("pointer-events", "none");
    await expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(await overlapsWithStrip(page)).toEqual([]);

    // After the longest wait one cat is on its way across.
    await page.clock.runFor(19_000);
    const walker = page.locator(".cat-strip__walker [data-cat]");
    await expect(walker).toHaveCount(1);
    if (CAPTURE_EVIDENCE) {
      // The walk itself is a CSS animation, which runs in real time.
      await page.evaluate(() =>
        document
          .querySelector('[data-testid="cat-strip"]')
          ?.scrollIntoView({ block: "center" }),
      );
      await page.waitForTimeout(size.name === "phone" ? 3_000 : 6_000);
      const box = await strip.boundingBox();
      if (box) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/cat-walking-${size.name}-${size.width}.png`,
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

test("TC-P9-006 — with reduced motion the four cats sit still", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/about");
  const strip = page.getByTestId("cat-strip");
  await strip.scrollIntoViewIfNeeded();
  await expect(strip.locator(".cat-strip__sitting [data-cat]")).toHaveCount(4);
  await expect(strip.locator(".cat-strip__sitting")).toBeVisible();
  await page.clock.runFor(40_000);
  await expect(strip.locator(".cat-strip__walker")).toHaveCount(0);
  if (CAPTURE_EVIDENCE) {
    await page.locator("footer").screenshot({
      path: `${EVIDENCE_DIR}/cats-sitting-reduced-motion-1440.png`,
    });
  }
});
