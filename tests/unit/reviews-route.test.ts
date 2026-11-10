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

import { POST } from "@/app/api/reviews/route";
import {
  RATE_LIMITED_MESSAGE,
  REVIEW_ERROR_MESSAGES,
} from "@/lib/reviews/constants";
import { reviewRateLimiter } from "@/lib/reviews/rate-limit";

describe("POST /api/reviews (FR-098)", () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    reviewRateLimiter.reset();
    getPublicSupabaseClient.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const createRequest = (
    body: unknown,
    headers: Record<string, string> = {},
  ) => {
    return new Request("http://localhost:3000/api/reviews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "192.168.1.100",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  };

  it("TC-P5-182 — validates rating (1-5) and trimmed body (1-500 chars)", async () => {
    // Missing/invalid rating
    reviewRateLimiter.reset();
    const badRating = await POST(
      createRequest({ rating: 0, body: "Good coffee" }),
    );
    expect(badRating.status).toBe(400);
    const badRatingJson = await badRating.json();
    expect(badRatingJson.ok).toBe(false);
    expect(badRatingJson.error).toBe("invalid-rating");

    // Rating > 5
    reviewRateLimiter.reset();
    const highRating = await POST(
      createRequest({ rating: 6, body: "Good coffee" }),
    );
    expect(highRating.status).toBe(400);

    // Empty body
    reviewRateLimiter.reset();
    const emptyBody = await POST(
      createRequest({ rating: 5, body: "   \t\n  " }),
    );
    expect(emptyBody.status).toBe(400);
    const emptyJson = await emptyBody.json();
    expect(emptyJson.ok).toBe(false);
    expect(emptyJson.error).toBe("empty-body");

    // Body over 500 characters
    reviewRateLimiter.reset();
    const longBody = await POST(
      createRequest({ rating: 5, body: "X".repeat(501) }),
    );
    expect(longBody.status).toBe(400);
    const longJson = await longBody.json();
    expect(longJson.ok).toBe(false);
    expect(longJson.error).toBe("body-too-long");

    // Invalid JSON body
    reviewRateLimiter.reset();
    const invalidJson = await POST(createRequest("not-a-json", {}));
    expect(invalidJson.status).toBe(400);
  });

  it("TC-P5-183 — rate limits to 3 requests per 10 minutes per IP with 429 and retry-after header", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        id: "rev-1",
        display_name: "Guest",
        rating: 5,
        body: "Great!",
        hidden: false,
        created_at: "2026-11-09T10:00:00Z",
        updated_at: "2026-11-09T10:00:00Z",
      },
      error: null,
    });

    getPublicSupabaseClient.mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof getPublicSupabaseClient>);

    const reqBody = { rating: 5, body: "Delicious coffee!" };

    // 3 allowed requests
    for (let i = 0; i < 3; i++) {
      const res = await POST(createRequest(reqBody));
      expect(res.status).toBe(200);
    }

    // 4th request must be rate limited with 429
    const blocked = await POST(createRequest(reqBody));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();

    const blockedJson = await blocked.json();
    expect(blockedJson.ok).toBe(false);
    expect(blockedJson.error).toBe("rate-limited");
    expect(blockedJson.message).toBe(RATE_LIMITED_MESSAGE);

    // Verify RPC was called only 3 times
    expect(mockRpc).toHaveBeenCalledTimes(3);
  });

  it("TC-P5-184 — passes customer session token to Supabase RPC when signed in", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        id: "rev-customer-1",
        display_name: "Juan",
        rating: 5,
        body: "Best latte in town",
        hidden: false,
        created_at: "2026-11-09T10:00:00Z",
        updated_at: "2026-11-09T10:00:00Z",
      },
      error: null,
    });

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "juan@example.com" } },
      error: null,
    });

    getPublicSupabaseClient.mockImplementation((token?: string | null) => {
      expect(token).toBe("valid-customer-token");
      return {
        auth: { getUser: mockGetUser },
        rpc: mockRpc,
      } as unknown as ReturnType<typeof getPublicSupabaseClient>;
    });

    const res = await POST(
      createRequest(
        { rating: 5, body: "Best latte in town" },
        { authorization: "Bearer valid-customer-token" },
      ),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.review.displayName).toBe("Juan");
    expect(json.review.rating).toBe(5);

    expect(mockRpc).toHaveBeenCalledWith("post_review", {
      p_rating: 5,
      p_body: "Best latte in town",
    });
  });

  it("TC-P5-185 — handles guest review posting without auth token", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        id: "rev-guest-1",
        display_name: "Guest",
        rating: 4,
        body: "Cozy atmosphere",
        hidden: false,
        created_at: "2026-11-09T10:00:00Z",
        updated_at: "2026-11-09T10:00:00Z",
      },
      error: null,
    });

    getPublicSupabaseClient.mockImplementation((token?: string | null) => {
      expect(token).toBeNull();
      return {
        rpc: mockRpc,
      } as unknown as ReturnType<typeof getPublicSupabaseClient>;
    });

    const res = await POST(
      createRequest({ rating: 4, body: "Cozy atmosphere" }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.review.displayName).toBe("Guest");
  });

  it("TC-P5-186 — handles expired or invalid session token with 401", async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { code: "session_expired", message: "JWT expired" },
    });

    getPublicSupabaseClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    } as unknown as ReturnType<typeof getPublicSupabaseClient>);

    const res = await POST(
      createRequest(
        { rating: 5, body: "Great coffee" },
        { authorization: "Bearer expired-token" },
      ),
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("session-expired");
    expect(json.message).toBe(REVIEW_ERROR_MESSAGES.unauthorized);
  });

  it("TC-P5-187 — logs never contain personal data or review body", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "internal_error", message: "database error" },
    });

    getPublicSupabaseClient.mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof getPublicSupabaseClient>);

    const sensitiveBody = "Secret personal review text";
    await POST(createRequest({ rating: 5, body: sensitiveBody }));

    expect(consoleErrorSpy).toHaveBeenCalled();
    for (const call of consoleErrorSpy.mock.calls) {
      const logged = JSON.stringify(call);
      expect(logged).not.toContain(sensitiveBody);
      expect(logged).not.toContain("@");
    }
  });
});
