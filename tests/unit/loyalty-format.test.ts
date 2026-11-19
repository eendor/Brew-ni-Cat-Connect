import { describe, expect, it } from "vitest";

import {
  formatEarningRule,
  formatLoyaltyDate,
  formatPointsDelta,
  formatReason,
  formatWeeklyLimit,
} from "@/lib/loyalty/format";

describe("Loyalty formatting utilities", () => {
  describe("formatPointsDelta", () => {
    it("formats positive numbers with a leading plus sign", () => {
      expect(formatPointsDelta(12)).toBe("+12");
      expect(formatPointsDelta(1)).toBe("+1");
      expect(formatPointsDelta(150)).toBe("+150");
    });

    it("formats negative numbers with a proper minus sign", () => {
      expect(formatPointsDelta(-50)).toBe("−50");
      expect(formatPointsDelta(-12)).toBe("−12");
      expect(formatPointsDelta(-100)).toBe("−100");
    });

    it("formats zero as '0'", () => {
      expect(formatPointsDelta(0)).toBe("0");
    });

    it("keeps one decimal for coins and hides float drift", () => {
      expect(formatPointsDelta(2.5)).toBe("+2.5");
      expect(formatPointsDelta(0.1 + 0.2)).toBe("+0.3");
      expect(formatPointsDelta(-0.1)).toBe("−0.1");
      expect(formatPointsDelta(0.04)).toBe("0");
    });
  });

  describe("formatReason", () => {
    it("labels order-completed as 'Order completed'", () => {
      expect(formatReason("order-completed")).toBe("Order completed");
      expect(formatReason("order-completed", "ignored note")).toBe(
        "Order completed",
      );
    });

    it("labels reward-redeemed as 'Reward redeemed'", () => {
      expect(formatReason("reward-redeemed")).toBe("Reward redeemed");
    });

    it("labels adjustment with note when provided", () => {
      expect(formatReason("adjustment", "Order completion undone")).toBe(
        "Order completion undone",
      );
      expect(formatReason("adjustment", "Staff adjustment")).toBe(
        "Staff adjustment",
      );
    });

    it("falls back to 'Coins adjustment' when note is empty or null", () => {
      expect(formatReason("adjustment", null)).toBe("Coins adjustment");
      expect(formatReason("adjustment", "")).toBe("Coins adjustment");
      expect(formatReason("adjustment", "   ")).toBe("Coins adjustment");
    });
  });

  describe("formatLoyaltyDate", () => {
    it("formats valid ISO dates into PH locale readable dates", () => {
      const formatted = formatLoyaltyDate("2026-11-10T12:00:00Z");
      expect(formatted).toContain("Nov");
      expect(formatted).toContain("2026");
    });

    it("returns original string if date is invalid", () => {
      expect(formatLoyaltyDate("invalid-date")).toBe("invalid-date");
    });
  });

  describe("formatEarningRule", () => {
    it("formats earning rule sentence with formatted peso step", () => {
      expect(formatEarningRule(10, 1)).toBe(
        "Earn 1 coin for every ₱10 spent on completed orders, counted to 0.1 of a coin.",
      );
      expect(formatEarningRule(20, 2)).toBe(
        "Earn 2 coins for every ₱20 spent on completed orders, counted to 0.1 of a coin.",
      );
    });
  });

  describe("formatWeeklyLimit", () => {
    it("formats weekly limit sentence", () => {
      expect(formatWeeklyLimit(2)).toBe("Redeem up to 2 rewards per week.");
      expect(formatWeeklyLimit(1)).toBe("Redeem up to 1 reward per week.");
    });
  });
});
