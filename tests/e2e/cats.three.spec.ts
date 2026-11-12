import { expect, test, type Page } from "@playwright/test";

/**
 * The 3D cat parade itself (FR-099, ADR-032), with WebGL and motion on (the
 * chromium-3d project). Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-9/cat-characters/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/cat-characters";

async function toFooter(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const strip = page.getByTestId("cat-parade");
  await expect(strip).toHaveAttribute("data-ready", "true");
  return strip;
}

test("TC-P9-018 — the cats walk across the footer, pulling the sleigh, and leave the page alone", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/menu");
  const strip = await toFooter(page);
  await expect(strip).toHaveAttribute(
    "data-cats",
    "oreo latte luna kulas grey",
  );
  await expect(strip).toHaveAttribute("data-walking", "true", {
    timeout: 5_000,
  });
  await expect(strip).toBeVisible();
  // they walk: the strip changes from one moment to the next
  const first = await strip.screenshot();
  await page.waitForTimeout(700);
  const second = await strip.screenshot();
  expect(second.equals(first)).toBe(false);
  // a lap ends with the parade out of sight, then they come back the other way
  await expect(strip).toHaveAttribute("data-walking", "false", {
    timeout: 40_000,
  });
  expect((await page.request.get("/cats/kasper.webp")).status()).toBe(404);
  expect(errors).toEqual([]);
});

test("TC-P9-019 — with reduced motion the parade stands still in the middle", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  const strip = await toFooter(page);
  await page.waitForTimeout(1_500);
  await expect(strip).toHaveAttribute("data-walking", "false");
  const first = await strip.screenshot();
  await page.waitForTimeout(1_200);
  expect((await strip.screenshot()).equals(first)).toBe(true);
});

for (const size of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
]) {
  test(`TC-P9-020 — the cat parade on the ${size.name} screen`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/about");
    const strip = await toFooter(page);
    // wait for the stop in the middle, where the cats look out
    await expect(strip).toHaveAttribute("data-walking", "stopped", {
      timeout: 30_000,
    });
    await page.waitForTimeout(1_000);
    if (CAPTURE_EVIDENCE) {
      await strip.screenshot({
        path: `${EVIDENCE_DIR}/cat-parade-strip-${size.name}-${size.width}.png`,
      });
      await page.screenshot({
        path: `${EVIDENCE_DIR}/cat-parade-footer-${size.name}-${size.width}.png`,
      });
    }
  });
}
