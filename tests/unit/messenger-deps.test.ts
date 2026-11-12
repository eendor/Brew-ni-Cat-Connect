import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveOrderIds, deriveTrackingToken } from "@/lib/messenger/order-ids";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  abortSignal: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock("@/lib/supabase/public-client", () => {
  class PublicSupabaseConfigurationError extends Error {}
  return {
    PublicSupabaseConfigurationError,
    getPublicSupabaseClient: mocks.getClient,
  };
});

import {
  listMessengerOrders,
  MY_ORDERS_LIMIT,
  newNonce,
  placeMessengerOrder,
  smartReplyAssistant,
} from "@/lib/messenger/deps";
import { PublicSupabaseConfigurationError } from "@/lib/supabase/public-client";

import { CUSTOMER, order, REFERENCE } from "./messenger-fixtures";

const SECRET = "test-app-secret";
const NONCE = "nonce0000000000a";
const TRACKING_TOKEN = deriveTrackingToken(SECRET, CUSTOMER);

const input = {
  customer: {
    name: "Maria Santos",
    phone: "09171234567",
    notes: "Messenger order. Pickup: as soon as possible.",
    paymentPreference: "Cash" as const,
  },
  lines: [
    { itemId: "i-iced-latte", variantId: "v-16oz", flavor: null, quantity: 1 },
  ],
  expectedSubtotal: 49,
};

let errored: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.abortSignal.mockReset();
  mocks.getClient.mockReset();
  // The client is built like Supabase's: rpc(...) is awaited after
  // .abortSignal(...).
  mocks.rpc.mockImplementation(() => ({ abortSignal: mocks.abortSignal }));
  mocks.getClient.mockReturnValue({ rpc: mocks.rpc });
  errored = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errored.mockRestore();
});

const logged = () => JSON.stringify(errored.mock.calls);

describe("Placing a Messenger order in the database (FR-107)", () => {
  const saved = {
    ok: true,
    created: true,
    reference: REFERENCE,
    status: "pending",
    createdAt: "2026-11-09T06:00:00.000Z",
  };

  it("TC-P7-071 — calls the website's order function with the customer's own key and token", async () => {
    mocks.abortSignal.mockResolvedValue({ data: saved, error: null });
    const result = await placeMessengerOrder(SECRET, CUSTOMER, NONCE, input);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [name, args] = mocks.rpc.mock.calls[0] ?? [];
    expect(name).toBe("place_online_order");
    const ids = deriveOrderIds(SECRET, CUSTOMER, NONCE);
    expect(args.p_request).toEqual({
      idempotencyKey: ids.idempotencyKey,
      trackingToken: TRACKING_TOKEN,
      fulfillment: "pickup",
      customer: input.customer,
      lines: input.lines,
      expectedSubtotal: 49,
    });
    expect(args.p_correlation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.getClient).toHaveBeenCalledWith(null);
    expect(result).toEqual({
      ok: true,
      reference: REFERENCE,
      trackingToken: TRACKING_TOKEN,
      status: "pending",
      createdAt: "2026-11-09T06:00:00.000Z",
    });
  });

  it("TC-P7-071 — the same summary sent twice has the same key, so the database returns the saved order", async () => {
    mocks.abortSignal.mockResolvedValue({ data: saved, error: null });
    await placeMessengerOrder(SECRET, CUSTOMER, NONCE, input);
    mocks.abortSignal.mockResolvedValue({
      data: { ...saved, created: false, status: "preparing" },
      error: null,
    });
    const again = await placeMessengerOrder(SECRET, CUSTOMER, NONCE, input);
    const keys = mocks.rpc.mock.calls.map(
      (call) => call[1].p_request.idempotencyKey,
    );
    expect(keys[0]).toBe(keys[1]);
    expect(again).toMatchObject({
      ok: true,
      reference: REFERENCE,
      status: "preparing",
    });
  });

  it("TC-P7-071 — passes on a refusal the way the website does", async () => {
    mocks.abortSignal.mockResolvedValue({
      data: { ok: false, reason: "price-changed", subtotal: 55 },
      error: null,
    });
    await expect(
      placeMessengerOrder(SECRET, CUSTOMER, NONCE, input),
    ).resolves.toMatchObject({
      ok: false,
      reason: "price-changed",
      subtotal: 55,
    });
  });

  it.each([
    ["a database error", { data: null, error: { code: "57014" } }, "57014"],
    [
      "an error with no code",
      { data: null, error: { message: "x" } },
      "rpc-error",
    ],
    [
      "an answer it can't read",
      { data: { ok: "maybe" }, error: null },
      "unexpected-response",
    ],
    ["an empty answer", { data: null, error: null }, "unexpected-response"],
  ])(
    "TC-P7-071 — %s is an unknown outcome, logged with a code only",
    async (_name, answer, code) => {
      mocks.abortSignal.mockResolvedValue(answer);
      await expect(
        placeMessengerOrder(SECRET, CUSTOMER, NONCE, input),
      ).resolves.toBeNull();
      const line = JSON.parse(String(errored.mock.calls[0]?.[0])) as Record<
        string,
        string
      >;
      expect(line).toMatchObject({
        event: "messenger-place-order-failed",
        code,
      });
      expect(line.correlationId).toMatch(/^[0-9a-f-]{36}$/);
      expect(logged()).not.toContain(CUSTOMER);
      expect(logged()).not.toContain(TRACKING_TOKEN);
      expect(logged()).not.toContain("Maria");
      expect(logged()).not.toContain("0917");
    },
  );

  it("TC-P7-071 — a network failure is an unknown outcome too", async () => {
    mocks.abortSignal.mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      placeMessengerOrder(SECRET, CUSTOMER, NONCE, input),
    ).resolves.toBeNull();
    expect(logged()).toContain("rpc-unreachable");
  });

  it("TC-P7-071 — a missing database setting is logged, not thrown", async () => {
    mocks.getClient.mockImplementation(() => {
      throw new PublicSupabaseConfigurationError();
    });
    await expect(
      placeMessengerOrder(SECRET, CUSTOMER, NONCE, input),
    ).resolves.toBeNull();
    expect(logged()).toContain("not-configured");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("TC-P7-071 — an unexpected error is not hidden", async () => {
    mocks.getClient.mockImplementation(() => {
      throw new RangeError("bug");
    });
    await expect(
      placeMessengerOrder(SECRET, CUSTOMER, NONCE, input),
    ).rejects.toThrow("bug");
  });
});

describe("Listing a customer's orders from the chat (FR-110)", () => {
  const listed = (reference: string, status = "pending") => ({
    ...order("pending"),
    reference,
    status,
  });

  it("TC-P7-072 — asks the database for the orders of this customer's token, newest three", async () => {
    mocks.abortSignal.mockResolvedValue({
      data: [listed("BNC-AAAAAA"), listed("BNC-BBBBBB", "ready")],
      error: null,
    });
    const orders = await listMessengerOrders(SECRET, CUSTOMER);

    expect(mocks.rpc).toHaveBeenCalledWith("list_online_orders_by_token", {
      p_tracking_token: TRACKING_TOKEN,
      p_limit: MY_ORDERS_LIMIT,
    });
    expect(MY_ORDERS_LIMIT).toBe(3);
    expect(orders?.map((entry) => entry.reference)).toEqual([
      "BNC-AAAAAA",
      "BNC-BBBBBB",
    ]);
  });

  it("TC-P7-072 — a different customer asks with a different token", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [], error: null });
    await listMessengerOrders(SECRET, "7100000000000002");
    expect(mocks.rpc.mock.calls[0]?.[1].p_tracking_token).toBe(
      deriveTrackingToken(SECRET, "7100000000000002"),
    );
    expect(mocks.rpc.mock.calls[0]?.[1].p_tracking_token).not.toBe(
      TRACKING_TOKEN,
    );
  });

  it("TC-P7-072 — a customer with no orders gets an empty list, which is not an error", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [], error: null });
    await expect(listMessengerOrders(SECRET, CUSTOMER)).resolves.toEqual([]);
    expect(errored).not.toHaveBeenCalled();
  });

  it("TC-P7-072 — leaves out anything that isn't an order", async () => {
    mocks.abortSignal.mockResolvedValue({
      data: [
        listed("BNC-AAAAAA"),
        null,
        "BNC-BBBBBB",
        { ...listed("BNC-CCCCCC"), reference: "not-a-reference" },
        { ...listed("BNC-DDDDDD"), status: 3 },
        { ...listed("BNC-EEEEEE"), items: "none" },
        { ...listed("BNC-FFFFFF"), subtotal: "98" },
      ],
      error: null,
    });
    const orders = await listMessengerOrders(SECRET, CUSTOMER);
    expect(orders?.map((entry) => entry.reference)).toEqual(["BNC-AAAAAA"]);
  });

  it.each([
    ["a database error", { data: null, error: { code: "42883" } }, "42883"],
    [
      "an error with no code",
      { data: null, error: { message: "x" } },
      "unexpected-response",
    ],
    [
      "an answer that is not a list",
      { data: { reference: "BNC-AAAAAA" }, error: null },
      "unexpected-response",
    ],
    ["no answer", { data: null, error: null }, "unexpected-response"],
  ])(
    "TC-P7-072 — %s gives null, never an empty list",
    async (_name, answer, code) => {
      mocks.abortSignal.mockResolvedValue(answer);
      await expect(listMessengerOrders(SECRET, CUSTOMER)).resolves.toBeNull();
      expect(errored).toHaveBeenCalledWith(
        "Messenger order list failed:",
        code,
      );
    },
  );

  it("TC-P7-072 — a network failure or missing setting gives null, and the log has no ID or token", async () => {
    mocks.abortSignal.mockRejectedValue(new TypeError("fetch failed"));
    await expect(listMessengerOrders(SECRET, CUSTOMER)).resolves.toBeNull();
    mocks.getClient.mockImplementation(() => {
      throw new PublicSupabaseConfigurationError();
    });
    await expect(listMessengerOrders(SECRET, CUSTOMER)).resolves.toBeNull();
    expect(logged()).toContain("rpc-unreachable");
    expect(logged()).not.toContain(CUSTOMER);
    expect(logged()).not.toContain(TRACKING_TOKEN);
    expect(logged()).not.toContain(SECRET);
  });
});

describe("Order summary numbers (FR-107)", () => {
  it("TC-P7-073 — a number is 16 random letters and digits, new every time", () => {
    const numbers = Array.from({ length: 50 }, () => newNonce());
    for (const number of numbers) expect(number).toMatch(/^[A-Za-z0-9]{16}$/);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

// Added 2026-11-13 (ADR-031).
describe("Smart replies switch (ADR-031)", () => {
  it("TC-P7-107 — Gemini is used only when GEMINI_API_KEY is set on the server", () => {
    expect(smartReplyAssistant({})).toBeUndefined();
    expect(smartReplyAssistant({ GEMINI_API_KEY: "  " })).toBeUndefined();
    expect(typeof smartReplyAssistant({ GEMINI_API_KEY: "test-key" })).toBe(
      "function",
    );
    expect(
      typeof smartReplyAssistant({
        GEMINI_API_KEY: "test-key",
        GEMINI_MODELS: "gemini-flash-latest, ../bad/model?x=1",
      }),
    ).toBe("function");
  });
});
