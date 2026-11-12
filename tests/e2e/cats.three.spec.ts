import { expect, test, type Page } from "@playwright/test";

import { catsOverContent } from "./cat-helpers";

/**
 * The 3D cats themselves (FR-099, ADR-032), with WebGL and motion on (the
 * chromium-3d project). Set CAPTURE_EVIDENCE=1 to refresh the screenshots in
 * docs/evidence/phase-9/cat-characters/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/cat-characters";

/** One screenshot per shown cat's box, keyed by cat. */
async function catShots(page: Page) {
  const boxes = await page
    .locator('.shop-cat[data-shown="true"]')
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return {
          cat: (n as HTMLElement).dataset.cat ?? "",
          x: Math.max(0, r.left),
          y: Math.max(0, r.top),
          width: Math.min(r.right, innerWidth) - Math.max(0, r.left),
          height: Math.min(r.bottom, innerHeight) - Math.max(0, r.top),
        };
      }),
    );
  const shots: { cat: string; png: Buffer }[] = [];
  for (const { cat, ...clip } of boxes)
    shots.push({ cat, png: await page.screenshot({ clip }) });
  return shots;
}

test("TC-P9-018 — the 3D cats are drawn in their spots, move, and leave the page alone", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/menu");
  await page.waitForTimeout(6_000);
  const canvas = page.locator(".cat-canvas");
  await expect(canvas).toBeVisible();
  // the canvas has pixels where cats sit (no picture files any more)
  const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
    const gl = c.getContext("webgl2");
    return Boolean(gl);
  });
  expect(painted).toBe(true);
  const first = await catShots(page);
  expect(first.length).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  const second = await catShots(page);
  // they breathe, blink and swish their tails
  const moved = first.filter(
    (shot, i) => second[i] && !shot.png.equals(second[i]!.png),
  );
  expect(moved.length).toBeGreaterThan(0);
  expect(await catsOverContent(page)).toEqual([]);
  expect((await page.request.get("/cats/kasper.webp")).status()).toBe(404);
  expect(errors).toEqual([]);
});

for (const size of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
]) {
  test(`TC-P9-019 — 3D cats on the ${size.name} screen`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const path of ["/", "/about", "/menu"]) {
      await page.goto(path);
      if (path === "/about")
        await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2));
      await page.waitForTimeout(5_000);
      expect(await catsOverContent(page), path).toEqual([]);
      if (CAPTURE_EVIDENCE)
        await page.screenshot({
          path: `${EVIDENCE_DIR}/shop-cats-${path === "/" ? "home" : path.slice(1)}-${size.name}-${size.width}.png`,
        });
    }
  });
}
