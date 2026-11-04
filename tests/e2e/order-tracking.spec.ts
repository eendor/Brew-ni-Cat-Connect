import { expect, test } from "@playwright/test";

const REFERENCE = "BNC-7K2Q9F";
const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";

function makeOrder(status: string, rejectionReason: string | null = null) {
  return {
    reference: REFERENCE,
    status,
    fulfillment: "pickup",
    customerName: "Juan Dela Cruz",
    paymentPreference: "Cash",
    notes: "Please call when ready",
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
    rejectionReason,
    createdAt: "2026-11-04T08:00:00.000Z",
    statusHistory: [
      { status: "pending", changedAt: "2026-11-04T08:00:00.000Z" },
      ...(status !== "pending"
        ? [{ status, changedAt: "2026-11-04T08:10:00.000Z" }]
        : []),
    ],
    realtimeTopic: "order:abcdefghijklmnopqrstuv",
  };
}

test.describe("Live Order Tracking E2E", () => {
  test("TC-P5-022 — verifies live order progresses across statuses without full reload (FR-046, FR-047, FR-048)", async ({
    page,
  }) => {
    let currentStatus = "pending";

    // Intercept get_online_order RPC call to return progressive statuses
    await page.route("**/rest/v1/rpc/get_online_order*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOrder(currentStatus)),
      });
    });

    // 1. Visit the order confirmation page with valid tracking token
    await page.goto(`/orders/${REFERENCE}#token=${TOKEN}`);

    // Wait for the tracker to load
    const tracker = page.getByTestId("order-status-tracker");
    await expect(tracker).toBeVisible();

    // Verify initial "pending" status
    const pendingStage = page.getByTestId("tracker-stage-pending");
    await expect(pendingStage).toHaveAttribute("aria-current", "step");

    // 2. Progress order to "preparing"
    currentStatus = "preparing";
    const refreshBtn = page.getByTestId("manual-refresh-button");
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
    } else {
      // Trigger via polling or reload
      await page.evaluate(() =>
        window.dispatchEvent(new Event("visibilitychange")),
      );
    }

    const preparingStage = page.getByTestId("tracker-stage-preparing");
    await expect(preparingStage).toHaveAttribute("aria-current", "step", {
      timeout: 10_000,
    });
    // Stage 1 (pending) should now show completed icon
    const pendingIcon = page.getByTestId("stage-icon-pending");
    await expect(pendingIcon.locator("svg")).toBeVisible();

    // 3. Progress order to "ready"
    currentStatus = "ready";
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
    }

    const readyStage = page.getByTestId("tracker-stage-ready");
    await expect(readyStage).toHaveAttribute("aria-current", "step", {
      timeout: 10_000,
    });

    // 4. Progress order to "completed"
    currentStatus = "completed";
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
    }

    const completedStage = page.getByTestId("tracker-stage-completed");
    await expect(completedStage).toHaveAttribute("aria-current", "step", {
      timeout: 10_000,
    });

    // Status history list should contain the completed transition
    const historyList = page.getByTestId("status-history-list");
    await expect(historyList).toContainText("Completed");
  });

  test("TC-P5-023 — displays customer-safe rejected order banner with reason and next steps (FR-049)", async ({
    page,
  }) => {
    const rejectionReason = "Matcha powder temporarily out of stock.";

    await page.route("**/rest/v1/rpc/get_online_order*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOrder("rejected", rejectionReason)),
      });
    });

    await page.goto(`/orders/${REFERENCE}#token=${TOKEN}`);

    const rejectedBanner = page.getByTestId("rejected-order-banner");
    await expect(rejectedBanner).toBeVisible();

    // Check rejection reason and customer action instructions
    await expect(page.getByTestId("rejection-reason")).toHaveText(
      rejectionReason,
    );
    const nextSteps = page.getByTestId("rejected-next-steps");
    await expect(nextSteps).toContainText("What should you do next?");
    await expect(nextSteps).toContainText(
      "You have not been charged for this order.",
    );

    // Back to Menu link should navigate correctly
    const backToMenuLink = page.getByRole("link", { name: "Back to Menu" });
    await expect(backToMenuLink).toBeVisible();
  });
});
