import { expect, test, type Page } from "@playwright/test";

/**
 * Cat games while waiting for an order (FR-089), and the ad slot's empty
 * state (FR-090). The order API, game RPCs and the ad script are all mocked
 * in the browser, so nothing live is touched and no real ad loads.
 *
 * Set CAPTURE_EVIDENCE=1 to save screenshots to
 * docs/evidence/phase-9/play-while-waiting/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/play-while-waiting";
const REFERENCE = "BNC-7K2Q9F";
const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";

function makeOrder(status: string) {
  return {
    reference: REFERENCE,
    status,
    fulfillment: "pickup",
    customerName: "Test Customer",
    paymentPreference: "Cash",
    notes: null,
    items: [
      {
        itemId: "item-1",
        itemName: "Matcha Latte",
        variantId: "v-1",
        variantName: "16 oz",
        flavor: null,
        unitPrice: 120,
        quantity: 1,
        lineTotal: 120,
      },
    ],
    subtotal: 120,
    itemCount: 1,
    rejectionReason: null,
    createdAt: "2026-11-13T08:00:00.000Z",
    statusHistory: [
      { status: "pending", changedAt: "2026-11-13T08:00:00.000Z" },
    ],
    realtimeTopic: "order:abcdefghijklmnopqrstuv",
  };
}

async function mockGameStatus(page: Page) {
  await page.route("**/rest/v1/rpc/mini_game_status*", (route) =>
    route.fulfill({
      json: {
        dailyPlays: 3,
        playsToday: null,
        playsLeft: null,
        games: [
          {
            id: "cat-cups",
            name: "Cat cups",
            description: "Oreo hides under one of three cups.",
            choices: 3,
            winPoints: 3,
            tryPoints: 1,
            maxPoints: 3,
          },
          {
            id: "lucky-paw",
            name: "Lucky paw",
            description: "Shake the treat jar and see what Latte paws out.",
            choices: 0,
            winPoints: null,
            tryPoints: null,
            maxPoints: 5,
          },
        ],
      },
    }),
  );
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await page.screenshot({
    path: `${EVIDENCE_DIR}/${name}.png`,
    fullPage: true,
  });
}

test.describe("Play while you wait", () => {
  test("TC-P9-050 — at 390 wide, an open order offers the cat games and the games page links back to it", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/rest/v1/rpc/get_online_order*", (route) =>
      route.fulfill({ json: makeOrder("preparing") }),
    );
    await mockGameStatus(page);

    await page.goto(`/orders/${REFERENCE}#token=${TOKEN}`);
    const card = page.getByTestId("play-while-you-wait");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Play while you wait");
    // the order page never shows ads
    await expect(page.getByTestId("ad-slot")).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, "order-play-while-you-wait-phone");

    await page.getByRole("link", { name: "Play cat games" }).click();
    await expect(page).toHaveURL(/\/games$/);
    const back = page.getByRole("link", { name: "← Back to your order" });
    await expect(back).toBeVisible();
    await capture(page, "games-back-to-order-phone");

    await back.click();
    await expect(page).toHaveURL(
      new RegExp(`/orders/${REFERENCE}#token=${TOKEN}$`),
    );
    await expect(page.getByTestId("order-status-tracker")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("TC-P9-051 — the ad slot shows Loading ad, then the ad, or a short note when no ad comes", async ({
    page,
  }) => {
    test.skip(
      !process.env.NEXT_PUBLIC_AD_KEY,
      "needs a build with NEXT_PUBLIC_AD_KEY set",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockGameStatus(page);
    await page.addInitScript(() =>
      window.localStorage.setItem("bnc-ad-consent", "yes"),
    );
    // a stand-in ad that draws one 300x250 box
    await page.route("https://bauval.org/**", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `setTimeout(function(){var c=document.createElement("canvas");c.width=300;c.height=250;var g=c.getContext("2d");g.fillStyle="#e8d5c4";g.fillRect(0,0,300,250);g.fillStyle="#333";g.font="20px sans-serif";g.fillText("Test ad",16,36);document.body.appendChild(c)},500);`,
      }),
    );

    await page.goto("/games");
    const slot = page.getByTestId("ad-slot");
    await expect(slot.getByTestId("ad-loading")).toBeVisible();
    await expect(slot.getByTestId("ad-loading")).toHaveCount(0);
    await expect(slot.getByTitle("Advertisement")).toBeVisible();
    await slot.scrollIntoViewIfNeeded();
    if (CAPTURE_EVIDENCE) {
      await slot.screenshot({ path: `${EVIDENCE_DIR}/ad-filled.png` });
    }

    // the network leaves an empty inner frame, as the live unit did in the
    // sandbox; that is not an ad
    await page.unroute("https://bauval.org/**");
    await page.route("https://bauval.org/**", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `var f=document.createElement("iframe");f.width=300;f.height=250;f.style.border="0";document.body.appendChild(f);`,
      }),
    );
    await page.reload();
    await expect(slot.getByTestId("ad-empty")).toContainText(
      "No ad to show right now.",
      { timeout: 12_000 },
    );
    await expect(slot.getByTitle("Advertisement")).toHaveCount(0);
    await slot.scrollIntoViewIfNeeded();
    if (CAPTURE_EVIDENCE) {
      await slot.screenshot({ path: `${EVIDENCE_DIR}/ad-empty.png` });
    }
  });
});
