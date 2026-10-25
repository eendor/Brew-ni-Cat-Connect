import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchOrder } from "@/lib/orders/fetch-order";

describe("fetchOrder unit tests", () => {
  const validRef = "BNC-234567";
  const validToken = "1234567890123456789012345678901234567890123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when order reference format is invalid", async () => {
    const result = await fetchOrder("INVALID-REF", validToken);
    expect(result).toBeNull();
  });

  it("returns null when tracking token format is invalid", async () => {
    const result = await fetchOrder(validRef, "short_token");
    expect(result).toBeNull();
  });

  it("returns the mock order fixture when reference and token are valid", async () => {
    const result = await fetchOrder(validRef, validToken);
    expect(result).not.toBeNull();
    expect(result?.reference).toBe(validRef);
    expect(result?.customerName).toBe("Test Customer Verification");
  });
});