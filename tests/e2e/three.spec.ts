import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The WebGL layer (src/components/three). Runs in the "chromium-3d"
 * project: motion allowed, software GL. Functional journeys elsewhere use
 * the reduced-motion render, which is covered at the end of this file too.
 */

const category = { id: "e2e-noodles", name: "Buldak & Sedaap" };
const item = {
  id: "e2e-buldak",
  category_id: category.id,
  name: "Buldak Carbo",
  flavors: "",
  variants_json: [
    { id: "e2e-plain", name: "Plain Carbo Samyang", basePrice: 119 },
  ],
  is_available: true,
};

async function mockMenu(page: Page) {
  await page.route("**/rest/v1/categories*", (route) =>
    route.fulfill({ json: [category] }),
  );
  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: [item] }),
  );
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || /hydrat/i.test(text)) errors.push(text);
  });
  return errors;
}

/** Colour spread of what is actually on screen over a canvas. */
async function pixelSpread(page: Page, target: Locator) {
  const png = (await target.screenshot()).toString("base64");
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) return 0;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    let squares = 0;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      const value =
        ((pixels[i] ?? 0) + (pixels[i + 1] ?? 0) + (pixels[i + 2] ?? 0)) / 3;
      sum += value;
      squares += value * value;
      count += 1;
    }
    const mean = sum / count;
    return Math.sqrt(Math.max(0, squares / count - mean * mean));
  }, png);
}

test("TC-P4-001 — home renders the 3D showcase, not a blank canvas", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator(".showcase--ready")).toBeVisible({
    timeout: 45_000,
  });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Coffee, comfort, and a little cat energy.",
    }),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  expect(
    await pixelSpread(page, page.locator(".showcase__stage canvas")),
  ).toBeGreaterThan(12);

  const ticks = page.getByRole("list", { name: "Jump to a featured item" });
  await expect(ticks.getByRole("button")).toHaveCount(5);
  await ticks.getByRole("button", { name: "Takoyaki" }).click();
  await expect(ticks.getByRole("button", { name: "Takoyaki" })).toHaveAttribute(
    "aria-current",
    "true",
    { timeout: 15_000 },
  );
  expect(errors).toEqual([]);
});

test("TC-P4-002 — every page mounts its 3D layer without console or hydration errors", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await mockMenu(page);
  for (const path of [
    "/menu",
    "/about",
    "/gallery",
    "/contact",
    "/cart",
    "/checkout",
  ]) {
    await page.goto(path);
    // the menu opens on its own 3D hero instead of an ambient backdrop
    const layer =
      path === "/menu" ? ".menu-hero--ready" : ".ambient-backdrop--ready";
    await expect(page.locator(layer).first()).toBeAttached({
      timeout: 45_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("TC-P4-003 — menu photo tiles go 3D and Add to Order tosses into the real cart", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await mockMenu(page);
  await page.goto("/menu");
  await expect(page.locator("[data-three-tile][data-three-ready]")).toHaveCount(
    1,
    { timeout: 45_000 },
  );
  await expect(page.getByText("Ready to enjoy?")).toHaveCount(0);
  // the DOM photo keeps its alt text for screen readers
  await expect(
    page.getByRole("img", {
      name: "Buldak Carbo spicy noodles with a fried egg",
    }),
  ).toBeAttached();

  await page.getByRole("button", { name: "Order Buldak Carbo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to Order" })
    .click();
  const drawer = page.locator('[aria-labelledby="cart-drawer-title"]');
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  await expect(drawer).toContainText("Buldak Carbo");
  await expect(
    page.getByRole("button", { name: "Open cart (1 item)" }).first(),
  ).toBeAttached();
  expect(errors).toEqual([]);
});

test("TC-P4-004 — gallery ring and visit sign stay keyboard operable", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/gallery");
  const ring = page.getByRole("region", { name: "3D photo ring" });
  await expect(ring.locator(".gallery-ring__stage.is-ready")).toBeAttached({
    timeout: 45_000,
  });
  await expect(ring.locator(".gallery-ring__count")).toHaveText(/^1 \/ \d+$/);
  await ring.scrollIntoViewIfNeeded();
  await ring.getByRole("button", { name: "Next photo" }).focus();
  await page.keyboard.press("Enter");
  await expect(ring.locator(".gallery-ring__count")).toHaveText(/^2 \/ \d+$/, {
    timeout: 15_000,
  });
  // the full photo grid with alt text is still there
  expect(
    await page
      .getByRole("region", { name: "Brew ni Cat photo gallery" })
      .getByRole("img")
      .count(),
  ).toBeGreaterThanOrEqual(12);

  await page.goto("/contact");
  const flip = page.getByRole("button", { name: "Flip the sign" });
  await expect(flip).toBeVisible({ timeout: 45_000 });
  await flip.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Show the open side" }),
  ).toHaveAttribute("aria-pressed", "true");
  // the real hours text never depends on the 3D sign
  await expect(
    page.getByRole("heading", { level: 2, name: "Closed every Sunday." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("TC-P4-005 — reduced motion gets the static showcase and no WebGL", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".showcase__static-grid li")).toHaveCount(5);
    await page.goto("/contact");
    await expect(page.locator(".visit-stage__fallback")).toBeVisible();
    await page.goto("/gallery");
    await expect(
      page.getByRole("region", { name: "3D photo ring" }),
    ).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
