import { beforeEach, describe, expect, it } from "vitest";

import {
  isOrderLink,
  isWaitingForShop,
  readWaitingOrder,
  rememberWaitingOrder,
  WAITING_ORDER_KEY,
} from "@/lib/games/waiting-order";

describe("The way back from the games to an order (FR-089)", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("TC-P9-047 — keeps only same-site order links, so the back link can't lead off the site", () => {
    expect(isOrderLink("/orders/BNC-7K2Q9F")).toBe(true);
    expect(isOrderLink("/orders/BNC-7K2Q9F#token=abc_DEF-1")).toBe(true);
    for (const bad of [
      "https://example.com/orders/BNC-7K2Q9F",
      "//example.com/orders/x",
      "/orders/../account",
      "/orders/x/extra",
      "/games",
      "javascript:alert(1)",
      "/orders/x#<script>",
    ]) {
      expect(isOrderLink(bad)).toBe(false);
    }

    rememberWaitingOrder("https://example.com/orders/x");
    expect(readWaitingOrder()).toBeNull();
    window.sessionStorage.setItem(WAITING_ORDER_KEY, "//example.com");
    expect(readWaitingOrder()).toBeNull();
    rememberWaitingOrder("/orders/BNC-7K2Q9F#token=abc");
    expect(readWaitingOrder()).toBe("/orders/BNC-7K2Q9F#token=abc");
  });

  it("TC-P9-048 — counts pending, accepted and preparing as waiting on the shop", () => {
    expect(["pending", "accepted", "preparing"].every(isWaitingForShop)).toBe(
      true,
    );
    expect(
      ["ready", "completed", "cancelled", "rejected"].some(isWaitingForShop),
    ).toBe(false);
  });
});
