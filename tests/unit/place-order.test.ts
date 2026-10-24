import { describe, expect, it } from "vitest";

import {
  buildOrderDraft,
  createIdempotencyKey,
  createTrackingToken,
  isPlaceOrderResult,
  PLACE_ORDER_MESSAGES,
  placeOrderFailure,
} from "@/lib/orders/place-order";
import { isTrackingToken } from "@/lib/orders/types";
import type { CartItem } from "@/types/ordering";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOKEN = "A".repeat(43);

/** A random source that fills every byte with `byte`. */
function filledWith(byte: number) {
  return {
    getRandomValues<T extends ArrayBufferView | null>(array: T): T {
      if (array instanceof Uint8Array) array.fill(byte);
      return array;
    },
  };
}

/** A random source that writes 0, 1, 2, … */
const counting = {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    if (array instanceof Uint8Array) array.forEach((_, i) => (array[i] = i));
    return array;
  },
};

describe("Place order keys and tokens", () => {
  it("TC-P4-103 — an idempotency key is a version 4 UUID from 16 random bytes", () => {
    expect(createIdempotencyKey(filledWith(0))).toBe(
      "00000000-0000-4000-8000-000000000000",
    );
    expect(createIdempotencyKey(filledWith(0xff))).toBe(
      "ffffffff-ffff-4fff-bfff-ffffffffffff",
    );
    expect(createIdempotencyKey(counting)).toBe(
      "00010203-0405-4607-8809-0a0b0c0d0e0f",
    );

    const keys = new Set(
      Array.from({ length: 50 }, () => createIdempotencyKey()),
    );
    expect(keys.size).toBe(50);
    for (const key of keys) expect(key).toMatch(UUID_V4);
  });

  it("TC-P4-104 — a tracking token is 32 random bytes as 43 base64url characters", () => {
    expect(createTrackingToken(filledWith(0))).toBe("A".repeat(43));
    // base64's "/" and "+" become "_" and "-", and there is no "=" padding
    expect(createTrackingToken(filledWith(0xff))).toBe(`${"_".repeat(42)}8`);
    expect(createTrackingToken(filledWith(0xfb))).toBe(
      `${"-_v7".repeat(10)}-_s`,
    );
    expect(createTrackingToken(counting)).toBe(
      "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
    );

    const tokens = new Set(
      Array.from({ length: 50 }, () => createTrackingToken()),
    );
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(isTrackingToken(token)).toBe(true);
  });
});

describe("Place order request", () => {
  it("TC-P4-105 — the request names what was picked, never a price or a name to show", () => {
    const lines: CartItem[] = [
      {
        key: "iced-caramel::latte-16::Caramel",
        itemId: "iced-caramel",
        itemName: "Iced Caramel Latte",
        variantId: "latte-16",
        variantName: "16 oz",
        flavor: "Caramel",
        unitPrice: 1,
        quantity: 2,
        lineTotal: 2,
      },
      {
        key: "nachos::nachos-reg::",
        itemId: "nachos",
        itemName: "Nachos",
        variantId: "nachos-reg",
        variantName: "Regular",
        flavor: null,
        unitPrice: 85,
        quantity: 1,
        lineTotal: 85,
      },
    ];
    const customer = {
      name: "Pedro Penduko",
      phone: "09279876543",
      address: "should not be sent",
      notes: "less ice",
      paymentPreference: "GCash" as const,
    };

    expect(buildOrderDraft(customer, lines, 87)).toEqual({
      fulfillment: "pickup",
      customer: {
        name: "Pedro Penduko",
        phone: "09279876543",
        notes: "less ice",
        paymentPreference: "GCash",
      },
      lines: [
        {
          itemId: "iced-caramel",
          variantId: "latte-16",
          flavor: "Caramel",
          quantity: 2,
        },
        {
          itemId: "nachos",
          variantId: "nachos-reg",
          flavor: null,
          quantity: 1,
        },
      ],
      expectedSubtotal: 87,
    });
  });
});

describe("Place order answers", () => {
  const success = {
    ok: true,
    reference: "BNC-7K2Q9F",
    trackingToken: TOKEN,
    status: "pending",
    createdAt: "2026-10-24T08:00:00.000Z",
  };

  it("TC-P4-106 — the browser accepts only the answers the API sends", () => {
    const accepted: unknown[] = [
      success,
      { ...success, status: "ready" },
      placeOrderFailure("invalid-request"),
      placeOrderFailure("empty-cart"),
      placeOrderFailure("server-error", "Online ordering is off."),
      {
        ok: false,
        reason: "invalid-details",
        message: PLACE_ORDER_MESSAGES["invalid-details"],
        fieldErrors: { name: "Name needed.", phone: "Phone needed." },
      },
      {
        ok: false,
        reason: "line-unavailable",
        message: PLACE_ORDER_MESSAGES["line-unavailable"],
        lines: [{ index: 0, reason: "item-unavailable" }],
      },
      {
        ok: false,
        reason: "price-changed",
        message: PLACE_ORDER_MESSAGES["price-changed"],
        subtotal: 0,
      },
    ];
    for (const value of accepted) expect(isPlaceOrderResult(value)).toBe(true);

    const rejected: unknown[] = [
      null,
      "ok",
      [],
      {},
      { ...success, reference: "BNC-00000O" },
      { ...success, trackingToken: "short" },
      { ...success, status: "shipped" },
      { ...success, createdAt: 0 },
      { ok: "true" },
      { ok: false, reason: "server-error" },
      { ok: false, reason: "teapot", message: "?" },
      { ok: false, reason: "toString", message: "?" },
      {
        ok: false,
        reason: "invalid-details",
        message: "?",
        fieldErrors: {},
      },
      {
        ok: false,
        reason: "invalid-details",
        message: "?",
        fieldErrors: { address: "Address needed." },
      },
      { ok: false, reason: "line-unavailable", message: "?", lines: [] },
      {
        ok: false,
        reason: "line-unavailable",
        message: "?",
        lines: [{ index: -1, reason: "item-unavailable" }],
      },
      {
        ok: false,
        reason: "line-unavailable",
        message: "?",
        lines: [{ index: 0, reason: "sold-out" }],
      },
      { ok: false, reason: "price-changed", message: "?", subtotal: -1 },
      { ok: false, reason: "price-changed", message: "?", subtotal: "255" },
    ];
    for (const value of rejected) expect(isPlaceOrderResult(value)).toBe(false);
  });
});
