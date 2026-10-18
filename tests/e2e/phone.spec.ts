import { devices, expect, test, type Page } from "@playwright/test";

/**
 * The order flow on a phone: a touch screen, a phone-sized viewport and
 * taps instead of mouse clicks. Runs in the "chromium" project, so pages
 * use the reduced-motion render (the same DOM without WebGL); the 3D layer
 * on a phone profile is checked in three.spec.ts.
 */
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
  devices["Pixel 7"];
test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

const noodles = { id: "e2e-noodles", name: "Buldak & Sedaap" };
const snacks = { id: "e2e-snacks", name: "Takoyaki" };
const buldak = {
  id: "e2e-buldak",
  category_id: noodles.id,
  name: "Buldak Carbo",
  flavors: "",
  variants_json: [
    { id: "e2e-plain", name: "Plain Carbo Samyang", basePrice: 119 },
  ],
  is_available: true,
};
const takoyaki = {
  id: "e2e-takoyaki",
  category_id: snacks.id,
  name: "Takoyaki",
  flavors: "Octopus|Cheese",
  variants_json: [
    { id: "e2e-4pc", name: "4 pcs", basePrice: 60 },
    { id: "e2e-8pc", name: "8 pcs", basePrice: 110 },
  ],
  is_available: true,
};

async function mockMenu(page: Page) {
  await page.route("**/rest/v1/categories*", (route) =>
    route.fulfill({ json: [noodles, snacks] }),
  );
  await page.route("**/rest/v1/items*", (route) =>
    route.fulfill({ json: [buldak, takoyaki] }),
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

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Buttons, links and form controls a thumb has to hit, smaller than 44 px. */
async function smallTapTargets(page: Page) {
  return page.evaluate(() => {
    const selector = [
      "button",
      "a[href]",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "[role=button]",
      "[role=tab]",
    ].join(",");
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        // not rendered, or visually hidden until focused (the skip link)
        if (box.width <= 1 || box.height <= 1) return false;
        if (element.closest("[inert], [aria-hidden=true]")) return false;
        // links inside a sentence are exempt, as in WCAG 2.5.8
        if (
          element.matches("a") &&
          getComputedStyle(element).display === "inline" &&
          (element.parentElement?.textContent?.trim().length ?? 0) >
            (element.textContent?.trim().length ?? 0)
        )
          return false;
        // a radio or checkbox counts its whole label as the target
        const label = element.matches("input[type=radio], input[type=checkbox]")
          ? element.closest("label")
          : null;
        const target = (label ?? element).getBoundingClientRect();
        return target.width < 44 || target.height < 44;
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        const name =
          element.getAttribute("aria-label") ??
          element.textContent?.trim().slice(0, 40) ??
          element.tagName;
        return `${element.tagName.toLowerCase()} "${name}" ${Math.round(box.width)}×${Math.round(box.height)}`;
      });
  });
}

test("TC-P4-023 — a phone can tap through the whole order flow", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const small: string[] = [];
  const checkTargets = async (stage: string) => {
    for (const target of await smallTapTargets(page))
      small.push(`${stage}: ${target}`);
    await expectNoSidewaysScroll(page);
  };
  await mockMenu(page);
  await page.goto("/");
  await checkTargets("home");

  // header menu → Menu page
  await page.getByRole("button", { name: "Open navigation" }).tap();
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  await checkTargets("navigation open");
  await nav.getByRole("link", { name: "Menu", exact: true }).tap();
  await page.waitForURL("**/menu");
  await expect(nav).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Order Takoyaki" }),
  ).toBeVisible();
  await checkTargets("menu");

  // an item with sizes and flavors: 2 × 8 pcs, Cheese
  await page.getByRole("button", { name: "Order Takoyaki" }).tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await checkTargets("order dialog");
  await dialog.getByRole("button", { name: /8 pcs/ }).tap();
  await dialog.getByRole("button", { name: "Cheese" }).tap();
  await dialog.getByRole("button", { name: "Increase quantity" }).tap();
  await dialog.getByRole("button", { name: "Add to Order" }).tap();

  const drawer = page.locator('[aria-labelledby="cart-drawer-title"]');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Takoyaki");
  await drawer.getByRole("button", { name: "Close cart drawer" }).tap();
  await expect(drawer).toBeHidden();

  // a single-option item straight from its card
  await page.getByRole("button", { name: "Order Buldak Carbo" }).tap();
  await expect(dialog).toContainText("Plain Carbo Samyang");
  await dialog.getByRole("button", { name: "Add to Order" }).tap();
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Buldak Carbo");
  await expect(
    page.getByRole("button", { name: "Open cart (3 items)" }).first(),
  ).toBeAttached();
  await checkTargets("cart drawer");
  await drawer.getByRole("link", { name: "Proceed to Checkout" }).tap();
  await page.waitForURL("**/checkout");
  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout" }),
  ).toBeVisible();

  // an empty form sends the thumb to the first field to fix
  await page.getByRole("button", { name: /Continue to Order Review/ }).tap();
  await expect(page.getByLabel(/Full Name/)).toBeFocused();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await checkTargets("checkout with errors");

  await page.getByLabel(/Full Name/).fill("Maria Santos");
  await page.getByLabel(/Contact Phone Number/).fill("0918 123 4567");
  await page.getByRole("button", { name: /Continue to Order Review/ }).tap();
  const main = page.getByRole("main");
  await expect(
    page.getByRole("heading", { level: 1, name: "Review Order" }),
  ).toBeVisible();
  await expect(main).toContainText("Maria Santos");
  // 2 × ₱110 + ₱119
  await expect(main).toContainText("₱339");
  await checkTargets("review");

  await page.getByRole("button", { name: /Proceed to Send to Shop/ }).tap();
  await expect(
    page.getByRole("heading", { level: 1, name: "Order Summary for Shop" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Copy order summary" }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Message on Facebook" }),
  ).toBeVisible();
  await expect(main.getByRole("link", { name: /Call or Text/ })).toBeVisible();
  await checkTargets("summary");

  // the cart keeps the order until the summary is sent or a new one starts
  await page.goto("/cart");
  const cartList = main.getByRole("list", { name: "Cart items list" });
  await expect(cartList).toContainText("Takoyaki");
  await expect(cartList).toContainText("Buldak Carbo");
  await checkTargets("filled cart");

  expect(small).toEqual([]);
  expect(errors).toEqual([]);
});

test("TC-P4-024 — phone pages fit the screen and keep thumb-sized targets", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await mockMenu(page);
  const problems: string[] = [];
  for (const width of [412, 390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/",
      "/menu",
      "/about",
      "/gallery",
      "/contact",
      "/cart",
      "/checkout",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      if (overflow > 0) problems.push(`${path} @${width}: ${overflow}px wide`);
      for (const target of await smallTapTargets(page))
        problems.push(`${path} @${width}: ${target}`);
    }
  }
  expect(problems).toEqual([]);
  expect(errors).toEqual([]);
});
