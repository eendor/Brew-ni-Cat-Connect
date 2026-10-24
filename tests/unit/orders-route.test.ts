// @vitest-environment node
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

const getPublicSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/public-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/public-client")>()),
  getPublicSupabaseClient,
}));

import { POST } from "@/app/api/orders/route";
import {
  ORDERING_UNAVAILABLE_MESSAGE,
  PLACE_ORDER_MESSAGES,
} from "@/lib/orders/place-order";
import { PublicSupabaseConfigurationError } from "@/lib/supabase/public-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";

const orderRequest = {
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
  body: string = JSON.stringify(orderRequest),
  type = "application/json",
) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": type },
    body,
  });
}

let rpc: ReturnType<typeof vi.fn>;
let logged: MockInstance<typeof console.error>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ONLINE_ORDERING", "enabled");
  rpc = vi.fn();
  getPublicSupabaseClient.mockReset();
  getPublicSupabaseClient.mockReturnValue({ rpc });
  logged = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Everything the route wrote to the log, as one string. */
function logText(): string {
  return logged.mock.calls.map((call) => call.join(" ")).join("\n");
}

describe("POST /api/orders", () => {
  it("TC-P4-115 — with online ordering off, nothing reaches the database", async () => {
    vi.stubEnv("NEXT_PUBLIC_ONLINE_ORDERING", "");
    const response = await POST(post());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "server-error",
      message: ORDERING_UNAVAILABLE_MESSAGE,
    });
    expect(getPublicSupabaseClient).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_ONLINE_ORDERING", "true");
    expect((await POST(post())).status).toBe(503);
  });

  it("TC-P4-116 — without the database settings it says ordering is unavailable", async () => {
    getPublicSupabaseClient.mockImplementation(() => {
      throw new PublicSupabaseConfigurationError();
    });
    const response = await POST(post());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      reason: "server-error",
      message: ORDERING_UNAVAILABLE_MESSAGE,
    });
    expect(logText()).toContain('"code":"not-configured"');
  });

  it("TC-P4-117 — places the order with the database function and the publishable key's client", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        created: true,
        reference: "BNC-7K2Q9F",
        status: "pending",
        createdAt: "2026-10-24T08:00:00.000Z",
      },
      error: null,
    });
    const response = await POST(post());

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const correlationId = response.headers.get("x-correlation-id");
    expect(correlationId).toMatch(UUID);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("place_online_order", {
      p_request: orderRequest,
      p_correlation_id: correlationId,
    });
    expect(await response.json()).toEqual({
      ok: true,
      reference: "BNC-7K2Q9F",
      trackingToken: TOKEN,
      status: "pending",
      createdAt: "2026-10-24T08:00:00.000Z",
    });
    expect(logged).not.toHaveBeenCalled();
  });

  it("TC-P4-118 — a retry that finds the order is 200, and refusals keep their status codes", async () => {
    const answers: Array<[unknown, number, string]> = [
      [
        {
          ok: true,
          created: false,
          reference: "BNC-7K2Q9F",
          status: "accepted",
          createdAt: "2026-10-24T08:00:00.000Z",
        },
        200,
        "",
      ],
      [{ ok: false, reason: "invalid-request" }, 400, "invalid-request"],
      [{ ok: false, reason: "empty-cart" }, 422, "empty-cart"],
      [
        {
          ok: false,
          reason: "invalid-details",
          fieldErrors: { phone: "invalid" },
        },
        422,
        "invalid-details",
      ],
      [
        {
          ok: false,
          reason: "line-unavailable",
          lines: [{ index: 0, reason: "item-unavailable" }],
        },
        409,
        "line-unavailable",
      ],
      [
        { ok: false, reason: "price-changed", subtotal: 210 },
        409,
        "price-changed",
      ],
    ];
    for (const [data, status, reason] of answers) {
      rpc.mockResolvedValueOnce({ data, error: null });
      const response = await POST(post());
      expect(response.status).toBe(status);
      const body = await response.json();
      if (reason) {
        expect(body).toMatchObject({
          ok: false,
          reason,
          message:
            PLACE_ORDER_MESSAGES[reason as keyof typeof PLACE_ORDER_MESSAGES],
        });
      } else {
        expect(body).toMatchObject({ ok: true, trackingToken: TOKEN });
      }
    }
  });

  it("TC-P4-119 — a database failure is a 502 and the log holds no order details", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "57014", message: "canceling statement" },
    });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "", message: "?" },
    });
    rpc.mockRejectedValueOnce(new TypeError("fetch failed"));
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });

    for (const code of [
      "57014",
      "rpc-error",
      "rpc-unreachable",
      "unexpected-response",
    ]) {
      const response = await POST(post());
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        ok: false,
        reason: "server-error",
        message: PLACE_ORDER_MESSAGES["server-error"],
      });
      const entry = JSON.parse(String(logged.mock.lastCall?.[0]));
      expect(entry).toEqual({
        event: "place-order-failed",
        correlationId: response.headers.get("x-correlation-id"),
        code,
      });
    }

    const text = logText();
    for (const secret of [
      TOKEN,
      "Pedro Penduko",
      "09279876543",
      orderRequest.idempotencyKey,
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("TC-P4-120 — a body the route can't read never reaches the database", async () => {
    const cases: Array<[Request, number]> = [
      [post(JSON.stringify(orderRequest), "text/plain"), 415],
      [post("{"), 400],
      [post(JSON.stringify({ ...orderRequest, trackingToken: "short" })), 400],
      [
        post(JSON.stringify({ ...orderRequest, extra: "x".repeat(40 * 1024) })),
        413,
      ],
    ];
    for (const [request, status] of cases) {
      const response = await POST(request);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({
        ok: false,
        reason: "invalid-request",
        message: PLACE_ORDER_MESSAGES["invalid-request"],
      });
    }
    expect(rpc).not.toHaveBeenCalled();
  });
});
