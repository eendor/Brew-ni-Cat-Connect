import { randomBytes } from "node:crypto";

import {
  FINAL_ORDER_STATUSES,
  isFinalOrderStatus,
  isOrderReference,
  isOrderStatus,
  isPaymentPreference,
  isTrackingToken,
  ORDER_REFERENCE_ALPHABET,
  ORDER_REFERENCE_LENGTH,
  ORDER_REFERENCE_PREFIX,
  ORDER_STATUSES,
  PAYMENT_PREFERENCES,
  TRACKING_TOKEN_LENGTH,
} from "@/lib/orders/types";

describe("order statuses", () => {
  it("lists the seven planned statuses once each (TC-P4-059)", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending",
      "accepted",
      "rejected",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ]);
    expect(new Set(ORDER_STATUSES).size).toBe(ORDER_STATUSES.length);
    for (const status of ORDER_STATUSES) {
      expect(isOrderStatus(status)).toBe(true);
    }
  });

  it("rejects anything else as a status (TC-P4-059)", () => {
    for (const value of [
      "Pending",
      "PENDING",
      " pending",
      "pending ",
      "",
      "shipped",
      "delivered",
      null,
      undefined,
      0,
      true,
      {},
      ["pending"],
    ]) {
      expect(isOrderStatus(value)).toBe(false);
    }
  });

  it("treats only rejected, completed and cancelled as final (TC-P4-060)", () => {
    expect(
      ORDER_STATUSES.filter((status) => isFinalOrderStatus(status)),
    ).toEqual(["rejected", "completed", "cancelled"]);
    expect(FINAL_ORDER_STATUSES.every((status) => isOrderStatus(status))).toBe(
      true,
    );
  });
});

describe("order references", () => {
  it("accepts BNC- and six easy-to-read characters (TC-P4-061)", () => {
    expect(ORDER_REFERENCE_PREFIX).toBe("BNC-");
    expect(ORDER_REFERENCE_LENGTH).toBe(6);
    expect(isOrderReference("BNC-7K2Q9F")).toBe(true);
    for (const character of ORDER_REFERENCE_ALPHABET) {
      expect(isOrderReference(`BNC-${character.repeat(6)}`)).toBe(true);
    }
  });

  it("leaves out 0, 1, I, L and O (TC-P4-061)", () => {
    expect(ORDER_REFERENCE_ALPHABET).toHaveLength(31);
    expect(new Set(ORDER_REFERENCE_ALPHABET).size).toBe(31);
    for (const character of ["0", "1", "I", "L", "O"]) {
      expect(ORDER_REFERENCE_ALPHABET).not.toContain(character);
      expect(isOrderReference(`BNC-7K2Q9${character}`)).toBe(false);
    }
  });

  it("rejects other shapes and types (TC-P4-061)", () => {
    for (const value of [
      "bnc-7k2q9f",
      "BNC-7k2q9f",
      "7K2Q9F",
      "BNC7K2Q9F",
      "ABC-7K2Q9F",
      "BNC-7K2Q9",
      "BNC-7K2Q9FF",
      " BNC-7K2Q9F",
      "BNC-7K2Q9F\n",
      "BNC-7K2-9F",
      "",
      null,
      undefined,
      7,
      {},
    ]) {
      expect(isOrderReference(value)).toBe(false);
    }
  });
});

describe("tracking tokens", () => {
  it("accepts 32 random bytes written as base64url (TC-P4-062)", () => {
    for (let run = 0; run < 20; run += 1) {
      const token = randomBytes(32).toString("base64url");
      expect(token).toHaveLength(TRACKING_TOKEN_LENGTH);
      expect(isTrackingToken(token)).toBe(true);
    }
  });

  it("rejects other lengths, characters and types (TC-P4-062)", () => {
    const valid = "A".repeat(TRACKING_TOKEN_LENGTH);
    expect(isTrackingToken(valid)).toBe(true);
    for (const value of [
      "A".repeat(42),
      "A".repeat(44),
      `${"A".repeat(42)}+`,
      `${"A".repeat(42)}/`,
      `${"A".repeat(42)}=`,
      `${"A".repeat(41)}==`,
      ` ${valid}`,
      `${valid}\n`,
      "",
      null,
      undefined,
      43,
      {},
    ]) {
      expect(isTrackingToken(value)).toBe(false);
    }
  });
});

describe("payment preferences", () => {
  it("accepts only Cash and GCash, as at checkout (TC-P4-063)", () => {
    expect(PAYMENT_PREFERENCES).toEqual(["Cash", "GCash"]);
    expect(isPaymentPreference("Cash")).toBe(true);
    expect(isPaymentPreference("GCash")).toBe(true);
    for (const value of [
      "cash",
      "GCASH",
      "Gcash",
      "Card",
      "Maya",
      "",
      null,
      undefined,
      1,
    ]) {
      expect(isPaymentPreference(value)).toBe(false);
    }
  });
});
