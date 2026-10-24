// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  FIELD_ERROR_MESSAGES,
  PLACE_ORDER_MESSAGES,
} from "@/lib/orders/place-order";
import {
  MAX_PLACE_ORDER_BODY_BYTES,
  readPlaceOrderBody,
  toPlaceOrderResponse,
} from "@/lib/orders/place-order-server";

const TOKEN = "A".repeat(43);
const URL = "http://localhost/api/orders";

const validRequest = {
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

function post(
  body: BodyInit | null,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return new Request(URL, { method: "POST", headers, body });
}

function postJson(text: string) {
  return post(text);
}

describe("Place order request body", () => {
  it("TC-P4-107 — only JSON is read", async () => {
    const json = JSON.stringify(validRequest);
    for (const type of [
      "text/plain",
      "application/x-www-form-urlencoded",
      "multipart/form-data; boundary=x",
      "application/jsonp",
      "",
    ]) {
      const result = await readPlaceOrderBody(
        post(json, { "content-type": type }),
      );
      expect(result).toEqual({ ok: false, status: 415 });
    }
    expect(await readPlaceOrderBody(post(json, {}))).toEqual({
      ok: false,
      status: 415,
    });
    // a charset is fine
    const withCharset = await readPlaceOrderBody(
      post(json, { "content-type": "Application/JSON; charset=utf-8" }),
    );
    expect(withCharset.ok).toBe(true);
  });

  it("TC-P4-108 — a body over 32 KB is refused, whether or not its size is declared", async () => {
    const padded = JSON.stringify({
      ...validRequest,
      customer: {
        ...validRequest.customer,
        notes: "x".repeat(MAX_PLACE_ORDER_BODY_BYTES),
      },
    });
    expect(await readPlaceOrderBody(postJson(padded))).toEqual({
      ok: false,
      status: 413,
    });

    expect(
      await readPlaceOrderBody(
        post("{}", {
          "content-type": "application/json",
          "content-length": String(MAX_PLACE_ORDER_BODY_BYTES + 1),
        }),
      ),
    ).toEqual({ ok: false, status: 413 });

    // streamed with no declared size: reading stops once it is too big
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new Uint8Array(8 * 1024).fill(0x20));
      },
    });
    const streamed = new Request(URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect(await readPlaceOrderBody(streamed)).toEqual({
      ok: false,
      status: 413,
    });
    expect(pulled).toBeLessThan(10);

    // exactly 32 KB is still read
    const fits = JSON.stringify(validRequest);
    const exact = fits.replace(
      '"notes":""',
      `"notes":"${"x".repeat(MAX_PLACE_ORDER_BODY_BYTES - fits.length)}"`,
    );
    expect(new TextEncoder().encode(exact).byteLength).toBe(
      MAX_PLACE_ORDER_BODY_BYTES,
    );
    expect((await readPlaceOrderBody(postJson(exact))).ok).toBe(true);
  });

  it("TC-P4-109 — a body that is not a JSON object is refused", async () => {
    const bodies: BodyInit[] = [
      "",
      "{",
      "not json",
      "[]",
      "null",
      '"order"',
      "42",
      // not UTF-8
      new Uint8Array([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d]),
    ];
    for (const body of bodies) {
      expect(await readPlaceOrderBody(post(body))).toEqual({
        ok: false,
        status: 400,
      });
    }
  });

  it("TC-P4-110 — text and numbers the database can't store are refused", async () => {
    const withNotes = (notes: string) =>
      JSON.stringify({
        ...validRequest,
        customer: { ...validRequest.customer, notes },
      });

    const bodies = [
      withNotes("less\u0000ice"),
      withNotes("\ud83d"), // half of an emoji
      withNotes("\udc00 x"),
      JSON.stringify({ ...validRequest, "bad\u0000key": 1 }),
      JSON.stringify(validRequest).replace(
        '"expectedSubtotal":190',
        '"expectedSubtotal":1e400',
      ),
      JSON.stringify({ ...validRequest, extra: [[[[[[["too deep"]]]]]]] }),
    ];
    for (const body of bodies) {
      expect(await readPlaceOrderBody(postJson(body))).toEqual({
        ok: false,
        status: 400,
      });
    }

    // a whole emoji is fine
    expect(
      (await readPlaceOrderBody(postJson(withNotes("salamat 😺")))).ok,
    ).toBe(true);
  });

  it("TC-P4-111 — the tracking token must be well formed; the rest goes to the database as sent", async () => {
    for (const trackingToken of [
      undefined,
      null,
      42,
      "",
      "A".repeat(42),
      `${"A".repeat(42)}=`,
      `${"A".repeat(42)}+`,
    ]) {
      const body = JSON.stringify({ ...validRequest, trackingToken });
      expect(await readPlaceOrderBody(postJson(body))).toEqual({
        ok: false,
        status: 400,
      });
    }

    // the database checks everything else, so odd fields pass through
    const odd = { ...validRequest, fulfillment: "delivery", lines: "many" };
    expect(await readPlaceOrderBody(postJson(JSON.stringify(odd)))).toEqual({
      ok: true,
      request: odd,
      trackingToken: TOKEN,
    });
  });
});

describe("Place order database answers", () => {
  const saved = {
    ok: true,
    created: true,
    reference: "BNC-7K2Q9F",
    status: "pending",
    createdAt: "2026-10-24T08:00:00.000Z",
  };

  it("TC-P4-112 — a saved order is 201, and a retry that finds it is 200", () => {
    expect(toPlaceOrderResponse(saved, TOKEN)).toEqual({
      status: 201,
      result: {
        ok: true,
        reference: "BNC-7K2Q9F",
        trackingToken: TOKEN,
        status: "pending",
        createdAt: "2026-10-24T08:00:00.000Z",
      },
    });
    expect(
      toPlaceOrderResponse(
        { ...saved, created: false, status: "preparing" },
        TOKEN,
      ),
    ).toEqual({
      status: 200,
      result: {
        ok: true,
        reference: "BNC-7K2Q9F",
        trackingToken: TOKEN,
        status: "preparing",
        createdAt: "2026-10-24T08:00:00.000Z",
      },
    });
  });

  it("TC-P4-113 — each refusal gets its status code and a customer-safe message", () => {
    expect(
      toPlaceOrderResponse({ ok: false, reason: "invalid-request" }, TOKEN),
    ).toEqual({
      status: 400,
      result: {
        ok: false,
        reason: "invalid-request",
        message: PLACE_ORDER_MESSAGES["invalid-request"],
      },
    });
    expect(
      toPlaceOrderResponse({ ok: false, reason: "empty-cart" }, TOKEN),
    ).toEqual({
      status: 422,
      result: {
        ok: false,
        reason: "empty-cart",
        message: PLACE_ORDER_MESSAGES["empty-cart"],
      },
    });
    expect(
      toPlaceOrderResponse(
        {
          ok: false,
          reason: "invalid-details",
          fieldErrors: {
            name: "too-long",
            phone: "invalid",
            notes: "too-long",
          },
        },
        TOKEN,
      ),
    ).toEqual({
      status: 422,
      result: {
        ok: false,
        reason: "invalid-details",
        message: PLACE_ORDER_MESSAGES["invalid-details"],
        fieldErrors: {
          name: FIELD_ERROR_MESSAGES.name["too-long"],
          phone: FIELD_ERROR_MESSAGES.phone.invalid,
          notes: FIELD_ERROR_MESSAGES.notes["too-long"],
        },
      },
    });
    expect(
      toPlaceOrderResponse(
        {
          ok: false,
          reason: "line-unavailable",
          lines: [
            { index: 0, reason: "item-unavailable" },
            { index: 3, reason: "unknown-flavor" },
          ],
        },
        TOKEN,
      ),
    ).toEqual({
      status: 409,
      result: {
        ok: false,
        reason: "line-unavailable",
        message: PLACE_ORDER_MESSAGES["line-unavailable"],
        lines: [
          { index: 0, reason: "item-unavailable" },
          { index: 3, reason: "unknown-flavor" },
        ],
      },
    });
    expect(
      toPlaceOrderResponse(
        { ok: false, reason: "price-changed", subtotal: 255.5 },
        TOKEN,
      ),
    ).toEqual({
      status: 409,
      result: {
        ok: false,
        reason: "price-changed",
        message: PLACE_ORDER_MESSAGES["price-changed"],
        subtotal: 255.5,
      },
    });
  });

  it("TC-P4-114 — an answer the database function never gives is not passed on", () => {
    const unexpected: unknown[] = [
      null,
      "ok",
      [saved],
      {},
      { ...saved, created: "yes" },
      { ...saved, reference: "BNC-1" },
      { ...saved, status: "Pending" },
      { ...saved, createdAt: null },
      { ok: "false", reason: "empty-cart" },
      { ok: false, reason: "teapot" },
      { ok: false, reason: "invalid-details", fieldErrors: {} },
      { ok: false, reason: "invalid-details", fieldErrors: { name: "rude" } },
      {
        ok: false,
        reason: "invalid-details",
        fieldErrors: { address: "required" },
      },
      {
        ok: false,
        reason: "invalid-details",
        fieldErrors: { name: "toString" },
      },
      { ok: false, reason: "line-unavailable", lines: [] },
      {
        ok: false,
        reason: "line-unavailable",
        lines: [{ index: 0.5, reason: "item-unavailable" }],
      },
      {
        ok: false,
        reason: "line-unavailable",
        lines: [{ index: 0, reason: "sold-out" }],
      },
      { ok: false, reason: "price-changed" },
      { ok: false, reason: "price-changed", subtotal: -1 },
      { ok: false, reason: "price-changed", subtotal: "255" },
    ];
    for (const data of unexpected) {
      expect(toPlaceOrderResponse(data, TOKEN)).toBeNull();
    }
  });
});
