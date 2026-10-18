import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

/**
 * The WebGL layer (src/components/three). Runs in the "chromium-3d"
 * project: motion allowed, software GL. Functional journeys elsewhere use
 * the reduced-motion render, which is covered at the end of this file too.
 *
 * Software GL renders these scenes at a frame or two per second, and two of
 * them side by side starve each other, so this file runs its tests one
 * after another in a single worker and allows slow scroll-driven steps.
 */
test.describe.configure({ mode: "default" });

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
  // the jump is a smooth scroll the scene follows frame by frame
  await expect(ticks.getByRole("button", { name: "Takoyaki" })).toHaveAttribute(
    "aria-current",
    "true",
    { timeout: 60_000 },
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

test("TC-P4-003 — menu cards show plain photos and Add to Order tosses into the real cart", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await mockMenu(page);
  await page.goto("/menu");
  await expect(
    page.getByRole("button", { name: "Order Buldak Carbo" }),
  ).toBeVisible({ timeout: 45_000 });
  // menu photos are plain images, not 3D tiles
  await expect(page.locator("[data-three-tile]")).toHaveCount(0);
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
    page.getByRole("main").getByText(/Closed every Sunday\./),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("TC-P4-021 — the empty cart and the missing page show their 3D state scenes", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
  await expect(page.locator(".state-scene.is-ready canvas")).toBeAttached({
    timeout: 60_000,
  });

  const response = await page.goto("/a-page-that-wandered-off");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.locator(".not-found__stage.is-ready canvas")).toBeAttached({
    timeout: 60_000,
  });
  // the way home is in the first screen, under the scene
  const home = page.getByRole("link", { name: "Return home" });
  await expect(home).toBeInViewport();
  await expect(home).toBeVisible({ timeout: 10_000 });
  // the 404 response itself is expected; nothing else may log an error
  expect(errors.filter((error) => !error.includes("404"))).toEqual([]);
});

test("TC-P4-022 — page transitions open on the new page and leave no content hidden", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "About Brew ni Cat" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Desktop navigation" })
    .getByRole("link", { name: "Gallery" })
    .click();
  // the title card covers the change of page...
  await expect(page.locator(".route-curtain")).toBeVisible();
  await expect(page.locator(".route-curtain__title")).toHaveText("Gallery");
  await page.waitForURL("**/gallery");
  // ...and lifts once the new page is in
  await expect(page.locator(".route-curtain")).toBeHidden({ timeout: 15_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Gallery" }),
  ).toBeVisible();

  // scroll through: every heading, block and photo has made its entrance
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await expect(async () => {
    const hidden = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            "[data-split], [data-rise], [data-rise-group] > *, [data-unveil]",
          ),
        ].filter((element) => {
          const style = getComputedStyle(element);
          return (
            style.visibility === "hidden" ||
            Number(style.opacity) < 0.98 ||
            style.clipPath.includes("100%")
          );
        }).length,
    );
    expect(hidden).toBe(0);
  }).toPass({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("TC-P4-026 — the checkout heading follows each step after its split entrance", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await mockMenu(page);
  await page.goto("/menu");
  await page.getByRole("button", { name: "Order Buldak Carbo" }).click({
    timeout: 45_000,
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to Order" })
    .click();
  await page
    .locator('[aria-labelledby="cart-drawer-title"]')
    .getByRole("link", { name: "Proceed to Checkout" })
    .click();
  await page.waitForURL("**/checkout");
  await expect(page.locator(".route-curtain")).toBeHidden({ timeout: 15_000 });
  const heading = page.locator("#page-heading");
  // the title made its line-by-line entrance, so later steps start from it
  await expect(heading.locator(".split-line")).not.toHaveCount(0);
  await expect(heading).toHaveAccessibleName("Checkout");

  await page.getByLabel(/Full Name/).fill("Maria Santos");
  await page.getByLabel(/Contact Phone Number/).fill("0918 123 4567");
  await page.getByRole("button", { name: /Continue to Order Review/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Review Order" }),
  ).toBeVisible();
  // a resize (or a phone turning) must not bring the first title back
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(1000);
  await expect(heading).toHaveText("Review Order");
  await expect(heading).toHaveAccessibleName("Review Order");

  await page.getByRole("button", { name: /Proceed to Send to Shop/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Order Summary for Shop" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("phone", () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("TC-P4-025 — a phone gets the 3D layer at phone quality and can tap through it", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await mockMenu(page);
    await page.goto("/");
    await expect(page.locator(".showcase--ready")).toBeVisible({
      timeout: 45_000,
    });
    await page.waitForTimeout(1500);
    const stage = page.locator(".showcase__stage canvas");
    expect(await pixelSpread(page, stage)).toBeGreaterThan(12);
    // phones draw at a capped pixel ratio, not the screen's 2.6×
    const ratio = await stage.evaluate(
      (canvas: HTMLCanvasElement) => canvas.width / canvas.clientWidth,
    );
    expect(ratio).toBeLessThanOrEqual(1.26);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);

    // mobile navigation → the title card → the 3D menu hero
    await page.getByRole("button", { name: "Open navigation" }).tap();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Menu", exact: true })
      .tap();
    await expect(page.locator(".route-curtain__title")).toHaveText("The Menu");
    await page.waitForURL("**/menu");
    await expect(page.locator(".route-curtain")).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.locator(".menu-hero--ready")).toBeAttached({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: "Order Buldak Carbo" }).tap();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add to Order" })
      .tap();
    const drawer = page.locator('[aria-labelledby="cart-drawer-title"]');
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    await expect(drawer).toContainText("Buldak Carbo");
    await expect(
      page.getByRole("button", { name: "Open cart (1 item)" }).first(),
    ).toBeAttached();
    expect(errors).toEqual([]);
  });
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
    // state scenes fall back to their static icon
    await page.goto("/cart");
    await expect(page.locator(".state-scene svg")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
