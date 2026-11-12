import { describe, expect, it } from "vitest";

import { getMenuBoardPaths } from "@/config/menu-boards";
import { deriveOrderIds, deriveTrackingToken } from "@/lib/messenger/order-ids";
import {
  addLine,
  argChoice,
  argId,
  argInt,
  argTexts,
  clearLines,
  decodeOrderPayload,
  encodeOrderPayload,
  fitsInPayload,
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  MAX_PAYLOAD_LENGTH,
  newOrder,
  ORDER_OPS,
  ORDER_PAYLOAD_PREFIX,
  type OrderLine,
  type OrderState,
  parsePhone,
  PHONE_PAYLOAD_PATTERN,
  removeLine,
  withPayment,
  withPickup,
  withReview,
} from "@/lib/messenger/order-state";

const PHONE = "09171234567";
const latte: OrderLine = {
  itemId: "item_latte",
  variantId: "var_22oz",
  flavor: null,
  quantity: 2,
};
const fries: OrderLine = {
  itemId: "item_fries",
  variantId: "var_regular",
  flavor: "Cheese",
  quantity: 1,
};

const reviewed: OrderState = withReview(
  withPickup(
    withPayment(addLine(addLine(newOrder(PHONE), latte)!, fries)!, "GCash"),
    "30m",
  ),
  "nonce0000000000a",
  29_000_000,
);

describe("Messenger order payloads (FR-102, FR-107)", () => {
  it.each(ORDER_OPS)(
    "TC-P7-059 — a %s step carries the whole order and its choices through a button",
    (op) => {
      const payload = encodeOrderPayload(op, reviewed, [
        "item_latte",
        2,
        ["a"],
      ]);
      expect(payload?.startsWith(`${ORDER_PAYLOAD_PREFIX}${op}:`)).toBe(true);
      expect(decodeOrderPayload(payload)).toEqual({
        op,
        state: reviewed,
        args: ["item_latte", 2, ["a"]],
      });
    },
  );

  it("TC-P7-059 — an empty order and a bare phone number round-trip", () => {
    const payload = encodeOrderPayload("cats", newOrder(PHONE));
    expect(decodeOrderPayload(payload)).toEqual({
      op: "cats",
      state: newOrder(PHONE),
      args: [],
    });
  });

  it("TC-P7-059 — leaves a choice out when its button would pass Meta's 1000 characters", () => {
    expect(
      encodeOrderPayload("pick", newOrder(PHONE), [
        "x".repeat(MAX_PAYLOAD_LENGTH),
      ]),
    ).toBeNull();
    const payload = encodeOrderPayload("cart", reviewed);
    expect(payload?.length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
  });

  it.each([
    ["not text", 42],
    ["null", null],
    ["another feature's payload", "STATUS:BNC-7K2Q9F:token"],
    [
      "an unknown step",
      `${ORDER_PAYLOAD_PREFIX}teleport:{"s":["${PHONE}",[]],"a":[]}`,
    ],
    ["a missing step", `${ORDER_PAYLOAD_PREFIX}{"s":["${PHONE}",[]],"a":[]}`],
    ["broken JSON", `${ORDER_PAYLOAD_PREFIX}cats:{"s":`],
    ["no choices list", `${ORDER_PAYLOAD_PREFIX}cats:{"s":["${PHONE}",[]]}`],
    [
      "a choices object",
      `${ORDER_PAYLOAD_PREFIX}cats:{"s":["${PHONE}",[]],"a":{}}`,
    ],
    ["a JSON array", `${ORDER_PAYLOAD_PREFIX}cats:[]`],
    [
      "a too-long payload",
      `${ORDER_PAYLOAD_PREFIX}cats:${"x".repeat(MAX_PAYLOAD_LENGTH)}`,
    ],
  ])("TC-P7-059 — refuses %s", (_name, payload) => {
    expect(decodeOrderPayload(payload)).toBeNull();
  });

  it.each([
    ["a non-Philippine phone", ["08171234567", []]],
    ["a phone that is not text", [9171234567, []]],
    ["no lines list", [PHONE, "none"]],
    [
      "too many lines",
      [
        PHONE,
        Array.from({ length: MAX_ORDER_LINES + 1 }, () => ["a", "b", null, 1]),
      ],
    ],
    ["a line with a missing field", [PHONE, [["a", "b", null]]]],
    ["a line with a bad id", [PHONE, [["a b", "b", null, 1]]]],
    ["a zero quantity", [PHONE, [["a", "b", null, 0]]]],
    ["a fractional quantity", [PHONE, [["a", "b", null, 1.5]]]],
    [
      "a quantity over the limit",
      [PHONE, [["a", "b", null, MAX_LINE_QUANTITY + 1]]],
    ],
    ["a flavor that is not text", [PHONE, [["a", "b", 7, 1]]]],
    ["an empty flavor", [PHONE, [["a", "b", "", 1]]]],
    ["an unknown payment", [PHONE, [], "Bitcoin"]],
    ["an unknown pickup", [PHONE, [], "Cash", "yesterday"]],
    ["a short nonce", [PHONE, [], "Cash", "asap", "abc"]],
    ["a nonce with symbols", [PHONE, [], "Cash", "asap", "nonce-0000000000!"]],
    [
      "a review time of zero",
      [PHONE, [], "Cash", "asap", "nonce0000000000a", 0],
    ],
    [
      "a review time that is not a number",
      [PHONE, [], "Cash", "asap", "nonce0000000000a", "now"],
    ],
    ["too many parts", [PHONE, [], "Cash", "asap", "nonce0000000000a", 5, 6]],
    ["too few parts", [PHONE]],
  ])("TC-P7-059 — refuses a state with %s", (_name, state) => {
    const payload = `${ORDER_PAYLOAD_PREFIX}cart:${JSON.stringify({ s: state, a: [] })}`;
    expect(decodeOrderPayload(payload)).toBeNull();
  });

  it("TC-P7-059 — reads a step's choices only when they are what that step expects", () => {
    const args = [
      "item_1",
      3,
      ["Mocha", "Caramel"],
      "GCash",
      "no good id",
      1.5,
    ];
    expect(argId(args, 0)).toBe("item_1");
    expect(argId(args, 4)).toBeNull();
    expect(argId(args, 9)).toBeNull();
    expect(argInt(args, 1, 1, 5)).toBe(3);
    expect(argInt(args, 1, 4, 5)).toBeNull();
    expect(argInt(args, 5, 1, 5)).toBeNull();
    expect(argTexts(args, 2)).toEqual(["Mocha", "Caramel"]);
    expect(argTexts(args, 0)).toBeNull();
    expect(argTexts([[""]], 0)).toBeNull();
    expect(argTexts([Array.from({ length: 13 }, () => "a")], 0)).toBeNull();
    expect(argChoice(args, 3, ["Cash", "GCash"] as const)).toBe("GCash");
    expect(argChoice(args, 0, ["Cash", "GCash"] as const)).toBeNull();
  });
});

describe("Messenger phone numbers (FR-101)", () => {
  it.each([
    ["09171234567", "09171234567"],
    ["0917 123 4567", "09171234567"],
    ["+63 917 123 4567", "09171234567"],
    ["63917-123-4567", "09171234567"],
    ["(0917) 123-4567", "09171234567"],
  ])("TC-P7-060 — reads %s as %s", (text, local) => {
    expect(parsePhone(text)).toBe(local);
    expect(parsePhone(text, true)).toBe(local);
  });

  it.each(["9171234567", "917 123 4567"])(
    "TC-P7-060 — accepts %s only from the phone button, never typed text",
    (text) => {
      expect(parsePhone(text)).toBeNull();
      expect(parsePhone(text, true)).toBe("09171234567");
    },
  );

  it.each([
    "",
    "hello",
    "0817 123 4567",
    "0917 123 456",
    "0917 123 45678",
    "09171234567 please",
    "+1 917 123 4567",
    "0917123456a",
  ])("TC-P7-060 — refuses %j", (text) => {
    expect(parsePhone(text)).toBeNull();
    expect(parsePhone(text, true)).toBeNull();
  });

  it("TC-P7-060 — only number-shaped text can be a phone button's reply", () => {
    for (const ok of ["+639171234567", "09171234567", "(0917) 123-4567"]) {
      expect(PHONE_PAYLOAD_PATTERN.test(ok)).toBe(true);
    }
    for (const no of [
      "",
      "hi",
      "12345",
      "call me 0917 123 4567",
      "1".repeat(26),
    ]) {
      expect(PHONE_PAYLOAD_PATTERN.test(no)).toBe(false);
    }
  });
});

describe("Messenger order cart changes (FR-102)", () => {
  it("TC-P7-061 — the same item, size and flavor adds to the quantity", () => {
    const order = addLine(addLine(newOrder(PHONE), latte)!, latte)!;
    expect(order.lines).toEqual([{ ...latte, quantity: 4 }]);
  });

  it("TC-P7-061 — another size or flavor is a new line", () => {
    const order = addLine(addLine(newOrder(PHONE), latte)!, {
      ...latte,
      variantId: "var_16oz",
    })!;
    expect(order.lines).toHaveLength(2);
    const flavored = addLine(order, { ...latte, flavor: "Mocha" })!;
    expect(flavored.lines).toHaveLength(3);
  });

  it("TC-P7-061 — a line never goes over 99", () => {
    const order = addLine(
      addLine(newOrder(PHONE), { ...latte, quantity: 98 })!,
      { ...latte, quantity: 5 },
    )!;
    expect(order.lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("TC-P7-061 — refuses a 13th item, so the cart stays small enough for a button", () => {
    let order = newOrder(PHONE);
    for (let i = 0; i < MAX_ORDER_LINES; i += 1) {
      order = addLine(order, { ...latte, itemId: `item_${i}` })!;
      expect(order).not.toBeNull();
    }
    expect(addLine(order, { ...latte, itemId: "item_extra" })).toBeNull();
    // More of an item that is already there still fits.
    expect(addLine(order, { ...latte, itemId: "item_0" })).not.toBeNull();
  });

  it("TC-P7-061 — refuses a line that would make the cart too long for a button", () => {
    const long: OrderLine = { ...fries, flavor: "F".repeat(200) };
    let order = newOrder(PHONE);
    let refused = false;
    for (let i = 0; i < MAX_ORDER_LINES && !refused; i += 1) {
      const next = addLine(order, { ...long, itemId: `item_${i}` });
      if (next === null) refused = true;
      else {
        order = next;
        expect(fitsInPayload(order)).toBe(true);
      }
    }
    expect(refused).toBe(true);
  });

  it("TC-P7-061 — changing the cart reopens the order, so an old summary can't be placed", () => {
    for (const changed of [
      addLine(reviewed, latte)!,
      removeLine(reviewed, 0),
      clearLines(reviewed),
    ]) {
      expect(changed).toMatchObject({
        payment: null,
        pickup: null,
        nonce: null,
        reviewedAt: null,
      });
    }
    expect(removeLine(reviewed, 0).lines).toEqual([fries]);
    expect(removeLine(reviewed, 7).lines).toEqual(reviewed.lines);
    expect(clearLines(reviewed).lines).toEqual([]);
    expect(clearLines(reviewed).phone).toBe(PHONE);
  });

  it("TC-P7-061 — a new payment or pickup asks the later steps again", () => {
    expect(withPayment(reviewed, "Cash")).toMatchObject({
      payment: "Cash",
      pickup: null,
      nonce: null,
      reviewedAt: null,
    });
    expect(withPickup(reviewed, "1h")).toMatchObject({
      payment: "GCash",
      pickup: "1h",
      nonce: null,
      reviewedAt: null,
    });
    expect(withReview(newOrder(PHONE), "abcdefgh12345678", 5)).toMatchObject({
      nonce: "abcdefgh12345678",
      reviewedAt: 5,
    });
  });
});

describe("Messenger order IDs (FR-107, FR-110)", () => {
  const SECRET = "test-app-secret";
  const SENDER = "900000000000001";
  const NONCE = "nonce0000000000a";

  it("TC-P7-062 — the same summary always gets the same key, so a double tap is one order", () => {
    expect(deriveOrderIds(SECRET, SENDER, NONCE)).toEqual(
      deriveOrderIds(SECRET, SENDER, NONCE),
    );
  });

  it("TC-P7-062 — another summary, another customer or another secret gets another key", () => {
    const base = deriveOrderIds(SECRET, SENDER, NONCE).idempotencyKey;
    expect(
      deriveOrderIds(SECRET, SENDER, "nonce0000000000b").idempotencyKey,
    ).not.toBe(base);
    expect(
      deriveOrderIds(SECRET, "900000000000002", NONCE).idempotencyKey,
    ).not.toBe(base);
    expect(
      deriveOrderIds("another-secret", SENDER, NONCE).idempotencyKey,
    ).not.toBe(base);
  });

  it("TC-P7-062 — the key looks like the UUID the order function expects", () => {
    expect(deriveOrderIds(SECRET, SENDER, NONCE).idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("TC-P7-062 — a customer's token is the same for all their orders and found from who they are", () => {
    const first = deriveOrderIds(SECRET, SENDER, NONCE).trackingToken;
    const second = deriveOrderIds(
      SECRET,
      SENDER,
      "nonce0000000000b",
    ).trackingToken;
    expect(first).toBe(second);
    expect(first).toBe(deriveTrackingToken(SECRET, SENDER));
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("TC-P7-062 — a token belongs to one customer and one app secret", () => {
    const token = deriveTrackingToken(SECRET, SENDER);
    expect(deriveTrackingToken(SECRET, "900000000000002")).not.toBe(token);
    expect(deriveTrackingToken("another-secret", SENDER)).not.toBe(token);
    // The token and the key can't be turned into each other.
    expect(deriveOrderIds(SECRET, SENDER, NONCE).idempotencyKey).not.toContain(
      token.slice(0, 8),
    );
  });
});

describe("Messenger menu boards (FR-105)", () => {
  it.each([
    ["Cat-Tastic Bites", ["/images/menu/bites.jpg"]],
    ["Cat-Tastic Drinks", ["/images/menu/drinks.jpg", "/images/menu/soda.jpg"]],
    ["Buldak & Sedaap Noodles", ["/images/menu/noodles.jpg"]],
    ["Cat Association Combos", ["/images/menu/combo.jpg"]],
    ["Cat Association Packages", ["/images/menu/combo.jpg"]],
  ])("TC-P7-063 — %s shows its own board", (category, paths) => {
    expect(getMenuBoardPaths(category)).toEqual(paths);
  });

  it("TC-P7-063 — a category with no board, like Cat Treats, shows none", () => {
    expect(getMenuBoardPaths("Cat Treats")).toEqual([]);
    expect(getMenuBoardPaths("Seasonal")).toEqual([]);
    expect(getMenuBoardPaths("")).toEqual([]);
  });
});
