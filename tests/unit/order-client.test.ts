// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { placeOrder } from "@/lib/orders/order-client";
import { PLACE_ORDER_MESSAGES } from "@/lib/orders/place-order";
import type { PlaceOrderRequest } from "@/lib/orders/types";

const TOKEN = "A".repeat(43);

const request: PlaceOrderRequest = {
  idempotencyKey: "6f1c2a4e-5b7d-4e8f-9a0b-1c2d3e4f5a6b",
  trackingToken: TOKEN,
  fulfillment: "pickup",
  customer: {
    name: "Pedro Penduko",
    phone: "09279876543",
    notes: "",
    paymentPreference: "Cash",
  },
  lines: [
    {
      itemId: "iced-caramel",
      variantId: "latte-16",
      flavor: "Caramel",
      quantity: 2,
    },
  ],
  expectedSubtotal: 190,
};

const placed = {
  ok: true,
  reference: "BNC-7K2Q9F",
  trackingToken: TOKEN,
  status: "pending",
  createdAt: "2026-10-24T08:00:00.000Z",
};

function answering(body: string, status = 200) {
  return vi.fn<typeof fetch>(
    async () =>
      new Response(body, {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
}

const serverError = {
  ok: false,
  reason: "server-error",
  message: PLACE_ORDER_MESSAGES["server-error"],
};

describe("Place order from the browser", () => {
  it("TC-P4-121 — posts the order as JSON, uncached, and returns the API's answer", async () => {
    const fetchImpl = answering(JSON.stringify(placed), 201);
    expect(await placeOrder(request, fetchImpl)).toEqual(placed);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("/api/orders");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });
    expect(JSON.parse(String(init?.body))).toEqual(request);

    // a refusal comes back as it is
    const changed = {
      ok: false,
      reason: "price-changed",
      message: PLACE_ORDER_MESSAGES["price-changed"],
      subtotal: 210,
    };
    expect(
      await placeOrder(request, answering(JSON.stringify(changed), 409)),
    ).toEqual(changed);
  });

  it("TC-P4-122 — no answer, or one the API never sends, is a server error to retry", async () => {
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await placeOrder(request, offline)).toEqual(serverError);

    // a proxy's error page, an empty body, an unknown shape
    expect(
      await placeOrder(request, answering("<html>Bad gateway</html>", 502)),
    ).toEqual(serverError);
    expect(await placeOrder(request, answering("", 504))).toEqual(serverError);
    expect(await placeOrder(request, answering('{"ok":true}'))).toEqual(
      serverError,
    );

    // a saved order with another token can't be opened, so it is not trusted
    const otherToken = { ...placed, trackingToken: "B".repeat(43) };
    expect(
      await placeOrder(request, answering(JSON.stringify(otherToken), 201)),
    ).toEqual(serverError);
  });
});
