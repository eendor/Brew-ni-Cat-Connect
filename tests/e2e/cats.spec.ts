import { expect, test } from "@playwright/test";

/**
 * Cat characters (FR-099). Update 2026-11-13 (ADR-032): the shop's own cats
 * walk in a parade across the top of the footer, single file like reindeer,
 * pulling a coffee-cup sleigh; the cursor is a cat paw. This checks where the
 * strip sits and the cursor; cats.three.spec.ts checks the 3D parade itself
 * (and refreshes the screenshots).
 */

for (const size of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
]) {
  test(`TC-P9-005 — the parade has its own strip at the top of the footer and covers nothing (${size.name})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const path of ["/", "/about", "/menu"]) {
      await page.goto(path);
      const strip = page.getByTestId("cat-parade");
      await expect(strip).toHaveAttribute("aria-hidden", "true");
      await expect(strip).toHaveCSS("pointer-events", "none");
      await expect(strip).toHaveCSS("position", "relative");
      // it is the footer's first child, above everything else in the footer
      const place = await strip.evaluate((node) => {
        const footer = node.closest("footer");
        const box = node.getBoundingClientRect();
        const below = [
          ...(footer?.querySelectorAll("a, p, h2, button, address") ?? []),
        ].map((n) => n.getBoundingClientRect().top);
        return {
          first: footer?.firstElementChild === node,
          bottom: box.bottom,
          below: Math.min(...below),
          inFooter: footer?.getBoundingClientRect().top ?? -1,
          top: box.top,
        };
      });
      expect(place.first, path).toBe(true);
      expect(place.bottom, path).toBeLessThanOrEqual(place.below);
      expect(place.top, path).toBeGreaterThanOrEqual(place.inFooter);
    }
  });
}

test("TC-P9-006 — the cursor is a cat paw, a pointing paw on links, and text fields keep the text cursor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contact");
  const cursor = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((n) => getComputedStyle(n).cursor);
  expect(await cursor("html")).toContain("/cursors/paw.svg");
  expect(await cursor("main p")).toContain("/cursors/paw.svg");
  expect(await cursor("header a")).toContain("/cursors/paw-pointer.svg");
  // a text field anywhere keeps the browser's text cursor
  await page.evaluate(() => {
    const field = document.createElement("input");
    field.id = "cursor-probe";
    document.querySelector("main")?.append(field);
  });
  expect(await cursor("#cursor-probe")).toBe("text");
  for (const file of ["/cursors/paw.svg", "/cursors/paw-pointer.svg"]) {
    const response = await page.request.get(file);
    expect(response.status(), file).toBe(200);
    expect(response.headers()["content-type"]).toContain("svg");
  }
});
