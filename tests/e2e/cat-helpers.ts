import type { Page } from "@playwright/test";

/** Page content (text, controls, pictures, cards) under any shown cat. */
export async function catsOverContent(page: Page): Promise<string[]> {
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
