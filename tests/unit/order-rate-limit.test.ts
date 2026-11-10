// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/public-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/public-client")>()),
  getPublicSupabaseClient,
}));

import { POST } from "@/app/api/orders/route";
import {
  clientKey,
  createRateLimiter,
  ORDER_RATE_LIMIT,
  orderRateLimiter,
  RATE_LIMITED_MESSAGE,
} from "@/lib/orders/rate-limit";
import { pinOpenShopClock } from "./shop-clock";

pinOpenShopClock();

function post(ip: string) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: "not json",
  });
}

describe("order rate limit", () => {
  beforeEach(() => {
    orderRateLimiter.reset();
    vi.stubEnv("NEXT_PUBLIC_ONLINE_ORDERING", "enabled");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("TC-P4-261 — allows the limit per window, then refuses until the window ends", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check("a", 0)).toEqual({ allowed: true });
    expect(limiter.check("a", 1_000)).toEqual({ allowed: true });
    expect(limiter.check("a", 30_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    });
    expect(limiter.check("b", 30_000)).toEqual({ allowed: true });
    expect(limiter.check("a", 60_000)).toEqual({ allowed: true });
  });

  it("TC-P4-261 — reads the first forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(request)).toBe("203.0.113.7");
    expect(clientKey(new Request("http://localhost"))).toBe("unknown");
  });

  it("TC-P4-261 — the route answers 429 with retry-after and never reaches the database", async () => {
    for (let i = 0; i < ORDER_RATE_LIMIT; i += 1) {
      expect((await POST(post("198.51.100.4"))).status).toBe(400);
    }
    const refused = await POST(post("198.51.100.4"));
    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(refused.headers.get("cache-control")).toBe("no-store");
    expect(await refused.json()).toEqual({
      ok: false,
      reason: "server-error",
      message: RATE_LIMITED_MESSAGE,
    });
    expect((await POST(post("198.51.100.5"))).status).toBe(400);
    expect(getPublicSupabaseClient).not.toHaveBeenCalled();
  });
});
