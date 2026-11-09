// @vitest-environment node
import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  checkSubscription,
  isValidSignature,
  MAX_WEBHOOK_BODY_BYTES,
} from "@/lib/messenger/signature";

const SECRET = "test-app-secret";
const VERIFY_TOKEN = "test-verify-token";

const encode = (text: string) => new TextEncoder().encode(text);
const BODY = encode('{"object":"page","entry":[]}');

function sign(body: Uint8Array, secret = SECRET) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("Messenger webhook signature (FR-058, NFR-022)", () => {
  it("TC-P7-001 — accepts the HMAC-SHA256 of the exact body", () => {
    const header = sign(BODY);
    expect(isValidSignature(BODY, header, SECRET)).toBe(true);
    expect(
      isValidSignature(
        BODY,
        `sha256=${header.slice("sha256=".length).toUpperCase()}`,
        SECRET,
      ),
    ).toBe(true);
    expect(isValidSignature(BODY, ` ${header} `, SECRET)).toBe(true);
    expect(MAX_WEBHOOK_BODY_BYTES).toBe(1024 * 1024);
  });

  it.each([
    { name: "no header", header: null, secret: SECRET },
    { name: "an empty header", header: "", secret: SECRET },
    { name: "no app secret", header: sign(BODY), secret: undefined },
    { name: "an empty app secret", header: sign(BODY), secret: "" },
    {
      name: "another secret",
      header: sign(BODY, "someone-else"),
      secret: SECRET,
    },
    {
      name: "a changed body",
      header: sign(encode('{"object":"page","entry":[] }')),
      secret: SECRET,
    },
    {
      name: "the old SHA-1 header format",
      header: `sha1=${createHmac("sha1", SECRET).update(BODY).digest("hex")}`,
      secret: SECRET,
    },
    {
      name: "a short signature",
      header: sign(BODY).slice(0, -1),
      secret: SECRET,
    },
    {
      name: "a signature that isn't hex",
      header: `sha256=${"z".repeat(64)}`,
      secret: SECRET,
    },
    { name: "the hex alone", header: sign(BODY).slice(7), secret: SECRET },
  ])("TC-P7-002 — refuses $name", ({ header, secret }) => {
    expect(isValidSignature(BODY, header, secret)).toBe(false);
  });
});

describe("Messenger subscription check (FR-058)", () => {
  const params = (values: Record<string, string>) =>
    new URLSearchParams(values);
  const valid = {
    "hub.mode": "subscribe",
    "hub.verify_token": VERIFY_TOKEN,
    "hub.challenge": "1158201444",
  };

  it("TC-P7-003 — echoes the challenge when the verify token matches", () => {
    expect(checkSubscription(params(valid), VERIFY_TOKEN)).toEqual({
      ok: true,
      challenge: "1158201444",
    });
  });

  it.each<{
    name: string;
    values: Record<string, string>;
    token: string | undefined;
  }>([
    {
      name: "a wrong verify token",
      values: { ...valid, "hub.verify_token": "guess" },
      token: VERIFY_TOKEN,
    },
    {
      name: "the start of the verify token",
      values: { ...valid, "hub.verify_token": VERIFY_TOKEN.slice(0, 8) },
      token: VERIFY_TOKEN,
    },
    {
      name: "another mode",
      values: { ...valid, "hub.mode": "unsubscribe" },
      token: VERIFY_TOKEN,
    },
    {
      name: "no verify token",
      values: { "hub.mode": "subscribe", "hub.challenge": "1158201444" },
      token: VERIFY_TOKEN,
    },
    {
      name: "no challenge",
      values: { "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN },
      token: VERIFY_TOKEN,
    },
    {
      name: "a challenge with markup",
      values: { ...valid, "hub.challenge": "<script>alert(1)</script>" },
      token: VERIFY_TOKEN,
    },
    {
      name: "a challenge over 128 characters",
      values: { ...valid, "hub.challenge": "1".repeat(129) },
      token: VERIFY_TOKEN,
    },
    {
      name: "a server without a verify token",
      values: valid,
      token: undefined,
    },
    { name: "an empty server verify token", values: valid, token: "" },
  ])("TC-P7-003 — refuses $name", ({ values, token }) => {
    expect(checkSubscription(params(values), token)).toEqual({ ok: false });
  });
});
