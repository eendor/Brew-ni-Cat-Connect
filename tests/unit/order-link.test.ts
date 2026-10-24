import { randomBytes } from "node:crypto";

import {
  buildOrderPath,
  InvalidOrderLinkError,
  readTrackingTokenFromHash,
  TRACKING_TOKEN_FRAGMENT_KEY,
} from "@/lib/orders/order-link";
import {
  isOrderRealtimeTopic,
  ORDER_REALTIME_TOPIC_LENGTH,
  ORDER_REALTIME_TOPIC_PREFIX,
  ORDER_STATUS_CHANGED_EVENT,
} from "@/lib/orders/types";

const REFERENCE = "BNC-7K2Q9F";
const TOKEN = randomBytes(32).toString("base64url");

describe("order page links", () => {
  it("puts the tracking token in the fragment, never in the path or query (TC-P4-064)", () => {
    const path = buildOrderPath(REFERENCE, TOKEN);

    expect(path).toBe(`/orders/${REFERENCE}#token=${TOKEN}`);
    expect(TRACKING_TOKEN_FRAGMENT_KEY).toBe("token");

    const url = new URL(path, "https://brew-ni-cat.example");
    expect(url.pathname).toBe(`/orders/${REFERENCE}`);
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#token=${TOKEN}`);
  });

  it("builds the bare path for a signed-in customer's own order (TC-P4-064)", () => {
    expect(buildOrderPath(REFERENCE)).toBe(`/orders/${REFERENCE}`);
    expect(buildOrderPath(REFERENCE, null)).toBe(`/orders/${REFERENCE}`);
  });

  it("refuses a malformed reference or token instead of building a broken link (TC-P4-064)", () => {
    for (const reference of [
      "bnc-7k2q9f",
      "BNC-7K2Q9O",
      "BNC-7K2Q9F/../x",
      "",
    ]) {
      expect(() => buildOrderPath(reference, TOKEN)).toThrow(
        InvalidOrderLinkError,
      );
    }
    for (const token of [
      "short",
      `${TOKEN}A`,
      `${TOKEN.slice(0, 42)}+`,
      `${TOKEN.slice(0, 42)}&`,
      "",
    ]) {
      expect(() => buildOrderPath(REFERENCE, token)).toThrow(
        InvalidOrderLinkError,
      );
    }
  });
});

describe("reading the tracking token", () => {
  it("reads it from the hash with or without the leading # (TC-P4-065)", () => {
    expect(readTrackingTokenFromHash(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(readTrackingTokenFromHash(`token=${TOKEN}`)).toBe(TOKEN);
    expect(readTrackingTokenFromHash(`#other=1&token=${TOKEN}`)).toBe(TOKEN);
  });

  it("round-trips what buildOrderPath writes (TC-P4-065)", () => {
    const url = new URL(
      buildOrderPath(REFERENCE, TOKEN),
      "https://brew-ni-cat.example",
    );
    expect(readTrackingTokenFromHash(url.hash)).toBe(TOKEN);
  });

  it("returns null when the token is missing or malformed (TC-P4-065)", () => {
    for (const hash of [
      "",
      "#",
      "#token=",
      `#tok=${TOKEN}`,
      `#token=${TOKEN.slice(0, 42)}`,
      `#token=${TOKEN}A`,
      `#token=${TOKEN.slice(0, 42)}+`,
      `#token=${TOKEN.slice(0, 41)}%20`,
    ]) {
      expect(readTrackingTokenFromHash(hash)).toBeNull();
    }
  });
});

describe("order Realtime topics", () => {
  it("accepts order: and 22 base64url characters (TC-P4-066)", () => {
    expect(ORDER_REALTIME_TOPIC_PREFIX).toBe("order:");
    expect(ORDER_REALTIME_TOPIC_LENGTH).toBe(22);
    expect(ORDER_STATUS_CHANGED_EVENT).toBe("status-changed");
    for (let run = 0; run < 20; run += 1) {
      const topic = `order:${randomBytes(16).toString("base64url")}`;
      expect(isOrderRealtimeTopic(topic)).toBe(true);
    }
  });

  it("rejects other shapes and types (TC-P4-066)", () => {
    for (const value of [
      "order:",
      `order:${"A".repeat(21)}`,
      `order:${"A".repeat(23)}`,
      `order:${"A".repeat(21)}+`,
      `Order:${"A".repeat(22)}`,
      `orders:${"A".repeat(22)}`,
      `realtime:order:${"A".repeat(22)}`,
      ` order:${"A".repeat(22)}`,
      "",
      null,
      undefined,
      22,
    ]) {
      expect(isOrderRealtimeTopic(value)).toBe(false);
    }
  });
});
