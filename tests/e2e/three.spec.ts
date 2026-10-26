import { inflateSync } from "node:zlib";

import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

import { menuModelSpec } from "@/components/three/menu-models";
import { mapMenuCatalog } from "@/lib/menu/map-menu-catalog";
import type { MenuItem } from "@/types/menu";

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

/**
 * Decodes a screenshot (an 8-bit RGB or RGBA PNG) here in Node. Decoding it
 * in the page would queue behind the software GL frames on its main thread.
 */
function readPng(png: Buffer) {
  let width = 0;
  let height = 0;
  let channels = 0;
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.toString("ascii", at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, color, , , interlace] = body.subarray(8, 13);
      if (depth !== 8 || (color !== 2 && color !== 6) || interlace !== 0) {
        throw new Error("screenshot is not an 8-bit RGB(A) PNG");
      }
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      chunks.push(body);
    } else if (type === "IEND") {
      break;
    }
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)];
    const from = row * (stride + 1) + 1;
    const to = row * stride;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? (pixels[to + i - channels] ?? 0) : 0;
      const up = row > 0 ? (pixels[to - stride + i] ?? 0) : 0;
      const corner =
        row > 0 && i >= channels
          ? (pixels[to - stride + i - channels] ?? 0)
          : 0;
      let guess = 0;
      if (filter === 1) guess = left;
      else if (filter === 2) guess = up;
      else if (filter === 3) guess = (left + up) >> 1;
      else if (filter === 4) {
        // Paeth: whichever neighbour is closest to left + up - corner
        const p = left + up - corner;
        const toLeft = Math.abs(p - left);
        const toUp = Math.abs(p - up);
        const toCorner = Math.abs(p - corner);
        guess =
          toLeft <= toUp && toLeft <= toCorner
            ? left
            : toUp <= toCorner
              ? up
              : corner;
      }
      pixels[to + i] = ((raw[from + i] ?? 0) + guess) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

/** Color spread of what is actually on screen over a canvas. */
async function pixelSpread(target: Locator, style?: string) {
  const { channels, pixels } = readPng(await target.screenshot({ style }));
  let sum = 0;
  let squares = 0;
  let count = 0;
  // every fourth pixel is plenty
  for (let i = 0; i < pixels.length; i += channels * 4) {
    const value =
      ((pixels[i] ?? 0) + (pixels[i + 1] ?? 0) + (pixels[i + 2] ?? 0)) / 3;
    sum += value;
    squares += value * value;
    count += 1;
  }
  const mean = sum / count;
  return Math.sqrt(Math.max(0, squares / count - mean * mean));
}

/**
 * Share of pixels that differ clearly between two same-size screenshots,
 * over the whole image and over a strip `edge` pixels wide down each side.
 */
function changedShare(first: Buffer, second: Buffer, edge = 8) {
  const x = readPng(first);
  const y = readPng(second);
  if (x.width !== y.width || x.height !== y.height) {
    throw new Error("screenshots differ in size");
  }
  const { width, height } = x;
  const counts = { whole: 0, left: 0, right: 0 };
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const i = (row * width + column) * x.channels;
      const j = (row * width + column) * y.channels;
      const delta = Math.max(
        Math.abs((x.pixels[i] ?? 0) - (y.pixels[j] ?? 0)),
        Math.abs((x.pixels[i + 1] ?? 0) - (y.pixels[j + 1] ?? 0)),
        Math.abs((x.pixels[i + 2] ?? 0) - (y.pixels[j + 2] ?? 0)),
      );
      if (delta <= 24) continue;
      counts.whole += 1;
      if (column < edge) counts.left += 1;
      if (column >= width - edge) counts.right += 1;
    }
  }
  return {
    whole: counts.whole / Math.max(1, width * height),
    left: counts.left / Math.max(1, edge * height),
    right: counts.right / Math.max(1, edge * height),
  };
}

/** Errors, plus the warnings a 3D scene logs when it gives up. */
function collectProblems(page: Page) {
  const problems = collectErrors(page);
  page.on("console", (message) => {
    if (message.type() === "warning" && /^3D /.test(message.text())) {
      problems.push(message.text());
    }
  });
  return problems;
}

/** The live menu, as the database rows the Menu page reads. */
const liveCategories = [
  { id: "live-noodles", name: "Buldak & Sedaap" },
  { id: "live-bites", name: "Cat-Tastic Bites" },
  { id: "live-drinks", name: "Cat-Tastic Drinks" },
  { id: "live-combos", name: "Combos & Packages" },
  { id: "live-box", name: "Take-out Box" },
  { id: "live-treats", name: "Cat Treats" },
];

type VariantRow = Readonly<{
  id: string;
  name: string;
  basePrice: number;
  priceByFlavor?: Readonly<Record<string, number>>;
  description?: string;
}>;

const option = (
  id: string,
  name: string,
  basePrice: number,
  description?: string,
): VariantRow => ({ id, name, basePrice, description });

const cups = (id: string, prices: readonly [number, number, number]) =>
  (["12oz", "16oz", "22oz"] as const).map((name, index) =>
    option(`${id}-${name}`, name, prices[index] ?? 0),
  );

const takoyakiFlavors = [
  "Veggie Whiskers",
  "Cheesy Calico",
  "Squid Treats",
  "Shrimp Whisker",
];
const takoyakiSize = (pieces: number, prices: readonly number[]) => ({
  id: `takoyaki-${pieces}`,
  name: `${pieces}pcs`,
  basePrice: 0,
  priceByFlavor: Object.fromEntries(
    takoyakiFlavors.map((flavor, index) => [flavor, prices[index] ?? 0]),
  ),
});

const row = (
  categoryId: string,
  name: string,
  variants: readonly VariantRow[],
  flavors: readonly string[] = [],
) => ({
  id: `live-${name.toLowerCase().replace(/\W+/g, "-")}`,
  category_id: categoryId,
  name,
  flavors: flavors.join("|"),
  variants_json: variants,
  is_available: true,
});

const liveRows = [
  row("live-noodles", "Buldak Carbo", [
    option("carbo-plain", "Plain Carbo Samyang", 119),
    option("carbo-milk", "Carbo Samyang w/ Milk", 129),
    option("carbo-egg", "Carbo Samyang w/ Egg", 135),
  ]),
  row("live-noodles", "Buldak Cheese", [
    option("cheese-plain", "Plain Cheese Samyang", 109),
    option("cheese-milk", "Cheese Samyang w/ Milk", 119),
    option("cheese-egg", "Cheese Samyang w/ Egg", 130),
  ]),
  row("live-noodles", "Sedaap Original", [option("sedaap", "Regular", 65)]),
  row(
    "live-noodles",
    "Sedaap Spicy Chicken",
    [option("sedaap-spicy", "Regular", 69)],
    ["1 Paw (Mild)", "2 Paws (Medium)", "3 Paws (Extra Hot)"],
  ),
  row("live-treats", "Cat Treats", [option("treats", "Regular", 5)]),
  row("live-box", "Take-out Box", [option("box", "Regular", 10)]),
  row("live-drinks", "Bottled Water", [option("water", "Regular", 15)]),
  row(
    "live-bites",
    "Fries (Cat Claws)",
    [
      option("fries-small", "Small", 30),
      option("fries-medium", "Medium", 50),
      option("fries-large", "Large", 70),
      option("fries-jumbo", "Jumbo", 150),
    ],
    ["BBQ Scratch", "Cheesy Purr", "Sour Cream Meow", "Spicy Claw"],
  ),
  row("live-bites", "Nachos (Kitty Litter Crisps)", [
    option("nachos-nvm", "Nachos+Veggies+Meat", 99),
    option("nachos-nfm", "Nachos+Fries+Meat", 119),
    option("nachos-nfmv", "Nachos+Fries+Meat+Veggies", 129),
  ]),
  row(
    "live-bites",
    "Takoyaki (Pawsome Balls)",
    [
      takoyakiSize(4, [40, 50, 55, 60]),
      takoyakiSize(8, [80, 100, 110, 120]),
      takoyakiSize(12, [120, 150, 160, 180]),
      takoyakiSize(16, [150, 200, 210, 240]),
    ],
    takoyakiFlavors,
  ),
  row(
    "live-drinks",
    "Cat-Feine (Classic Coffee)",
    cups("coffee", [49, 59, 79]),
    [
      "Salted Caramel Tail",
      "Vanilla Iced Whisker",
      "Caramel Meow-chiato",
      "Hazelnut Hairball",
      "Salted Caramel Paws",
      "Siamese Latte",
    ],
  ),
  row(
    "live-drinks",
    "Matcha (The Lucky Green Neko)",
    cups("matcha", [49, 59, 79]),
    [
      "Dirty Neko",
      "Vanilla Matcha Meow",
      "Caramel Matcha Tail",
      "Salted Caramel Meow-cha",
    ],
  ),
  row("live-drinks", "Oreo (The Tuxedo Cat)", cups("oreo", [49, 59, 79]), [
    "Caramel Oreo Kitten",
    "Oreo Iced Paw-tte",
    "Vanilla Oreo Whisker",
  ]),
  row("live-drinks", "Soda (Fizzy Felines)", cups("soda", [39, 49, 69]), [
    "Yogurt Yarn",
    "Honey Peach Paws",
    "Passion Fruit Purr",
    "Kiwi Kitten",
    "Strawberry Scratch",
    "Lychee Litter",
    "Blueberry Bite",
    "Grumpy Grapes",
    "Green Apple Alley Cat",
  ]),
  row("live-combos", "Cat Association", [
    option(
      "scaredy",
      "Scaredy Cats",
      450,
      "16pcs Veggie Takoyaki + Jumbo Fries (Any flavor) + 4pcs 12oz soda",
    ),
    option(
      "lazy",
      "Lazy Cats",
      340,
      "12pcs Cheese Takoyaki + 2pcs 16oz soda (Any flavor) + 2pcs 16oz coffee (Any flavor)",
    ),
    option(
      "grumpy",
      "Grumpy Cats",
      480,
      "Jumbo fries (Any flavor) + nachos + meat + veggies + 4pcs 16oz coffee (Any flavor)",
    ),
    option(
      "funny",
      "Funny Cats",
      470,
      "Jumbo Fries (Any flavor) + 3pcs 16oz coffee (Any flavor) + 3pcs 16oz soda (Any flavor)",
    ),
    option(
      "super",
      "Super Cats",
      590,
      "Jumbo Fries (Any flavor) + 16pcs Veggie Takoyaki + 2pcs 22oz soda (Any flavor) + 2pcs 22oz coffee (Any flavor)",
    ),
  ]),
  row("live-combos", "Couple of Cats", [
    option(
      "two-tail",
      "Two Tail",
      205,
      "8pcs Squid Takoyaki + 2pcs 16oz soda (Any flavor)",
    ),
    option(
      "two-paw",
      "Two Paw",
      145,
      "Medium Fries (Any flavor) + 2pcs 12oz coffee (Any flavor)",
    ),
    option(
      "latte-luna",
      "Latte & Luna",
      175,
      "Nachos + meat + veggies + 2pcs 12oz soda (Any flavor)",
    ),
    option(
      "sweet",
      "Sweet Kittens",
      205,
      "8pcs Cheese Takoyaki + 1pc 16oz soda (Any flavor) + 1pc 16oz coffee (Any flavor)",
    ),
    option(
      "duo",
      "Duo Siamese",
      195,
      "8pcs Veggie Takoyaki + 2pcs 16oz coffee (Any flavor)",
    ),
  ]),
  row("live-combos", "Single-Paw-rtner Combos", [
    option(
      "classy",
      "Classy Cat Combo",
      105,
      "4pcs Cheese Takoyaki + 16oz coffee (Any flavor)",
    ),
    option(
      "fizzy",
      "Fizzy Kitten Combo",
      65,
      "Small Fries (Any flavor) + 12oz soda (Any flavor)",
    ),
    option(
      "persian",
      "Persian Combo",
      175,
      "Nachos + Veggies + Meat + 16oz coffee (Any flavor)",
    ),
    option(
      "kasper",
      "Kasper Combo",
      90,
      "4pcs Squid Takoyaki + 12oz soda (Any flavor)",
    ),
  ]),
];

/** The same rows mapped the way the page maps them, in page order. */
const liveCatalog = mapMenuCatalog(liveCategories, liveRows);
const liveItems = (...categoryIds: string[]) =>
  categoryIds.flatMap(
    (id) =>
      liveCatalog.categories.find((category) => category.id === id)?.items ??
      [],
  );
function liveItem(name: string) {
  const found = liveItems(...liveCategories.map(({ id }) => id)).find(
    (entry) => entry.name === name,
  );
  if (!found) throw new Error(`${name} is not on the live menu`);
  return found;
}

/**
 * Opens the Menu on the live items and scrolls past the 3D hero, which
 * pauses its scene and leaves the (software) GPU to the menu cards.
 */
async function openLiveMenu(
  page: Page,
  extraRows: ReadonlyArray<(typeof liveRows)[number]> = [],
) {
  await page.route("**/rest/v1/categories*", (route) =>
    route.fulfill({ json: liveCategories }),
  );
  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: [...liveRows, ...extraRows] }),
  );
  await page.goto("/menu");
  await expect(page.locator(".menu-hero--ready")).toBeAttached({
    timeout: 45_000,
  });
  await page.evaluate(() => {
    const hero = document.querySelector(".menu-hero");
    const bottom = hero
      ? hero.getBoundingClientRect().bottom + window.scrollY
      : 0;
    window.scrollTo({ top: bottom + 240, behavior: "instant" });
  });
}

/** The category an item sits in on the live menu. */
const categoryOf = (item: MenuItem) =>
  liveCatalog.categories.find((entry) =>
    entry.items.some((candidate) => candidate.id === item.id),
  )?.name ?? "";

/**
 * Opens an item's Add to order dialog and waits until its model floats
 * there: the stage has drawn its first frame, names the right model (the
 * built model), and what
 * it draws has contrast. Software GL draws a frame or two a second, so this
 * polls. The dialog is closed again unless `keepOpen` is set.
 */
async function showCard(
  page: Page,
  item: MenuItem,
  options: { keepOpen?: boolean } = {},
) {
  await page
    .getByRole("button", { name: `Order ${item.name}`, exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: `Order ${item.name}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: item.name });
  const preview = dialog.locator(".order-preview");
  await expect(preview, item.name).toHaveAttribute("data-stage", "ready", {
    timeout: 90_000,
  });
  const canvas = preview.locator(".menu-card__stage");
  const variant = item.variants[0] ?? null;
  await expect(canvas).toHaveAttribute(
    "data-model",
    menuModelSpec(item, categoryOf(item), variant, null).key,
  );
  await expect
    .poll(() => pixelSpread(preview), {
      message: `${item.name} is drawn`,
      timeout: 30_000,
    })
    .toBeGreaterThan(12);
  if (!options.keepOpen) {
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }
  return { media: preview, canvas, dialog };
}

test("TC-P4-003 — menu cards show photos, and Add to Order tosses into the real cart", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await mockMenu(page);
  await page.goto("/menu");
  await expect(
    page.getByRole("button", { name: "Order Buldak Carbo" }),
  ).toBeVisible({ timeout: 45_000 });
  // cards are plain photos: no 3D tiles, no canvases and no 3D button
  await expect(page.locator("[data-three-tile]")).toHaveCount(0);
  await expect(page.locator(".menu-card__stage")).toHaveCount(0);
  await expect(page.getByText("Ready to enjoy?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /in 3D/i })).toHaveCount(0);
  // the photo keeps its text alternative
  await expect(
    page
      .getByRole("img", {
        name: "Buldak Carbo spicy noodles with a fried egg",
      })
      .first(),
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
    page.getByRole("main").getByText(/Closed every Saturday\./),
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

  // rider delivery copies a summary in every build; pickup places the order
  // online when the switch is on
  await page.getByRole("radio", { name: /Rider Delivery/ }).check();
  await page.getByLabel(/Full Name/).fill("Maria Santos");
  await page.getByLabel(/Contact Phone Number/).fill("0918 123 4567");
  await page.getByLabel("Delivery Address").fill("Purok 2, Kabacan");
  await page.getByRole("button", { name: /Continue to Order Review/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Review Order" }),
  ).toBeVisible();
  // a resize (or a phone turning) must not bring the first title back; the
  // wait lets the heading's debounced re-split run before the check
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(1000);
  await expect(heading).toHaveText("Review Order");
  await expect(heading).toHaveAccessibleName("Review Order");

  await page.getByRole("button", { name: /Proceed to Send to Rider/ }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Order Summary for Your Rider",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("TC-P4-052 — the Add to order dialog floats the item in 3D, turns on drag, and orders", async ({
  page,
}) => {
  const problems = collectProblems(page);
  const carbo = liveItem("Buldak Carbo");
  await openLiveMenu(page);
  await expect(page.locator(".menu-card__stage")).toHaveCount(0);
  const { media, canvas, dialog } = await showCard(page, carbo, {
    keepOpen: true,
  });
  await expect(page.getByRole("button", { name: /in 3D/i })).toHaveCount(0);

  // drag to spin: the canvas takes the drag and keeps drawing after it. The
  // model also turns on its own, so the grab state proves the drag and the
  // pixels prove the drawing.
  const before = await media.screenshot();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the 3D canvas is not on screen");
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height / 2);
  await page.mouse.down();
  await expect(canvas).toHaveClass(/is-dragging/);
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(canvas).not.toHaveClass(/is-dragging/);
  await expect
    .poll(async () => changedShare(before, await media.screenshot()).whole, {
      message: "the scene keeps drawing after the drag",
      timeout: 30_000,
    })
    .toBeGreaterThan(0.01);

  // the same dialog adds the item to the cart
  await dialog.getByRole("button", { name: "Add to Order" }).click();
  const drawer = page.locator('[aria-labelledby="cart-drawer-title"]');
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  await expect(drawer).toContainText("Buldak Carbo");
  expect(problems).toEqual([]);
});

test("TC-P4-144 — a product the owner adds later floats as a generic 3D model in its dialog with no redeploy", async ({
  page,
}) => {
  const problems = collectProblems(page);
  const extra = [
    row("live-drinks", "Brown Sugar Boba", [option("boba", "16oz", 85)]),
    row("live-treats", "Cat Ear Headband", [option("band", "Regular", 120)]),
  ];
  await openLiveMenu(page, extra);
  const catalog = mapMenuCatalog(liveCategories, [...liveRows, ...extra]);
  const find = (name: string) => {
    for (const category of catalog.categories) {
      const found = category.items.find((entry) => entry.name === name);
      if (found) return { item: found, category: category.name };
    }
    throw new Error(`${name} is not on the menu`);
  };
  const drink = find("Brown Sugar Boba");
  const other = find("Cat Ear Headband");
  // neither has a hand-built model: a drink gets a cup, anything else a box
  expect(menuModelSpec(drink.item, drink.category)).toMatchObject({
    kind: "cup",
  });
  expect(menuModelSpec(other.item, other.category)).toMatchObject({
    kind: "takeout-box",
  });
  for (const { item, category } of [drink, other]) {
    await page
      .getByRole("button", { name: `Order ${item.name}`, exact: true })
      .scrollIntoViewIfNeeded();
    await page
      .getByRole("button", { name: `Order ${item.name}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: item.name });
    const preview = dialog.locator(".order-preview");
    await expect(preview, item.name).toHaveAttribute("data-stage", "ready", {
      timeout: 90_000,
    });
    await expect(preview.locator(".menu-card__stage")).toHaveAttribute(
      "data-model",
      menuModelSpec(item, category, item.variants[0] ?? null, null).key,
    );
    await expect
      .poll(() => pixelSpread(preview), { timeout: 30_000 })
      .toBeGreaterThan(12);
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }
  expect(problems).toEqual([]);
});

test("TC-P4-053 — every noodle dialog floats its model", async ({ page }) => {
  test.setTimeout(600_000);
  const problems = collectProblems(page);
  await openLiveMenu(page);
  for (const item of liveItems("live-noodles")) await showCard(page, item);
  expect(problems).toEqual([]);
});

test("TC-P4-054 — every bite dialog floats its model", async ({ page }) => {
  test.setTimeout(600_000);
  const problems = collectProblems(page);
  await openLiveMenu(page);
  for (const item of liveItems("live-bites")) await showCard(page, item);
  expect(problems).toEqual([]);
});

test("TC-P4-055 — every drink dialog floats its model", async ({ page }) => {
  test.setTimeout(600_000);
  const problems = collectProblems(page);
  await openLiveMenu(page);
  for (const item of liveItems("live-drinks")) await showCard(page, item);
  expect(problems).toEqual([]);
});

test("TC-P4-056 — every combo, the take-out box and the cat treats dialog floats its model", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const problems = collectProblems(page);
  await openLiveMenu(page);
  for (const item of liveItems("live-combos", "live-box", "live-treats")) {
    await showCard(page, item);
  }
  expect(problems).toEqual([]);
});

test("TC-P4-058 — the Contact sign and street sit inside the canvas, not cut off at its sides", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // the scene, without the page's own animated backdrop behind it
  const still = ".ambient-backdrop { visibility: hidden !important; }";
  const blank = `${still} .visit-stage__canvas canvas { visibility: hidden !important; }`;
  // wide screens frame the scene in a 7:6 canvas beside the visit details
  for (const width of [1280, 960]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contact");
    const stage = page.locator(".visit-stage__canvas");
    await expect(stage).toHaveClass(/is-ready/, { timeout: 45_000 });
    await stage.scrollIntoViewIfNeeded();
    // the canvas fades in, and the page's entrances settle
    await page.waitForTimeout(1500);
    // each screenshot waits on a software GL frame, so keep the last pair
    let share = { whole: 0, left: 1, right: 1 };
    await expect
      .poll(
        async () => {
          share = changedShare(
            await stage.screenshot({ style: still }),
            await stage.screenshot({ style: blank }),
          );
          return share.whole;
        },
        { message: `the scene is drawn at ${width}px`, timeout: 60_000 },
      )
      .toBeGreaterThan(0.05);
    expect(share.left, `left edge at ${width}px`).toBeLessThan(0.002);
    expect(share.right, `right edge at ${width}px`).toBeLessThan(0.002);
  }
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
    expect(await pixelSpread(stage)).toBeGreaterThan(12);
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

  test("TC-P4-057 — on a phone the 3D picture in the order dialog fits the screen", async ({
    page,
  }) => {
    const problems = collectProblems(page);
    const takoyaki = liveItem("Takoyaki (Pawsome Balls)");
    await openLiveMenu(page);
    const { media, canvas } = await showCard(page, takoyaki, {
      keepOpen: true,
    });
    // phones draw at a capped pixel ratio, not the screen's 2.6×
    const ratio = await canvas.evaluate(
      (element: HTMLCanvasElement) => element.width / element.clientWidth,
    );
    expect(ratio).toBeLessThanOrEqual(1.26);
    // the picture fits the screen, with no sideways scroll
    const frame = await media.boundingBox();
    if (!frame) throw new Error("the 3D card is not on screen");
    const width = page.viewportSize()?.width ?? 0;
    expect(frame.x).toBeGreaterThanOrEqual(0);
    expect(frame.x + frame.width).toBeLessThanOrEqual(width + 0.5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });

  test("TC-P4-128 — a phone gets the lite showcase at 1× with the small HDRI", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const hdris: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith("/three/hdri/")) hdris.push(pathname);
    });
    await page.goto("/");
    await expect(page.locator(".showcase--ready")).toBeVisible({
      timeout: 45_000,
    });
    const stage = page.locator(".showcase__stage canvas");
    await expect(stage).toHaveAttribute("data-tier", "lite");
    await page.waitForTimeout(1500);
    // no post effects, shadows or refraction, and still a drawn scene
    expect(await pixelSpread(stage)).toBeGreaterThan(12);
    const ratio = await stage.evaluate(
      (canvas: HTMLCanvasElement) => canvas.width / canvas.clientWidth,
    );
    expect(ratio).toBeLessThanOrEqual(1.01);
    // the phone downloads only the half-size HDRI
    expect(hdris).toEqual(["/three/hdri/studio_small_09_512.hdr"]);
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
