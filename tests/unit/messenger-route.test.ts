// @vitest-environment node
import { createHmac } from "node:crypto";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

const mocks = vi.hoisted(() => ({
  tasks: [] as (() => Promise<void>)[],
  processWebhook: vi.fn(async () => ({ replied: 0, skipped: 0, failed: 0 })),
  createMessengerDeps: vi.fn((origin: string, pageToken: string) => ({
    origin,
    pageToken,
  })),
}));

vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    mocks.tasks.push(task);
  },
}));
vi.mock("@/lib/messenger/events", () => ({
  processWebhook: mocks.processWebhook,
}));
vi.mock("@/lib/messenger/deps", () => ({
  createMessengerDeps: mocks.createMessengerDeps,
}));

import { GET, POST } from "@/app/api/messenger/route";
import { MAX_WEBHOOK_BODY_BYTES } from "@/lib/messenger/signature";

const URL_BASE = "https://brew.example/api/messenger";
const APP_SECRET = "test-app-secret";
const VERIFY_TOKEN = "test-verify-token";
const PAGE_TOKEN = "test-page-token";

const PAYLOAD = {
  object: "page",
  entry: [
    {
      id: "900000000000001",
      time: 1793944800000,
      messaging: [
        {
          sender: { id: "7100000000000001" },
          recipient: { id: "900000000000001" },
          timestamp: 1793944800000,
          postback: { title: "Get Started", payload: "GET_STARTED" },
        },
      ],
    },
  ],
};

function sign(body: string, secret = APP_SECRET) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function post(body: string, headers: Record<string, string> = {}) {
  return new Request(URL_BASE, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

const signed = (body: string) =>
  post(body, { "x-hub-signature-256": sign(body) });

function subscription(values: Record<string, string>) {
  return new Request(`${URL_BASE}?${new URLSearchParams(values)}`);
}

let warned: MockInstance<typeof console.warn>;

beforeEach(() => {
  vi.stubEnv("MESSENGER_APP_SECRET", APP_SECRET);
  vi.stubEnv("MESSENGER_VERIFY_TOKEN", VERIFY_TOKEN);
  vi.stubEnv("MESSENGER_PAGE_ACCESS_TOKEN", PAGE_TOKEN);
  mocks.tasks.length = 0;
  mocks.processWebhook.mockClear();
  mocks.createMessengerDeps.mockClear();
  warned = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function expectPlainHeaders(response: Response) {
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toBe(
    "text/plain; charset=utf-8",
  );
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}

describe("Messenger webhook subscription check (FR-058)", () => {
  const valid = {
    "hub.mode": "subscribe",
    "hub.verify_token": VERIFY_TOKEN,
    "hub.challenge": "1158201444",
  };

  it("TC-P7-037 — echoes Meta's challenge when the verify token matches", async () => {
    const response = GET(subscription(valid));
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("1158201444");
    expectPlainHeaders(response);
  });

  it("TC-P7-037 — refuses a wrong verify token", async () => {
    const response = GET(
      subscription({ ...valid, "hub.verify_token": "guess" }),
    );
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Forbidden");
    expectPlainHeaders(response);
  });

  it("TC-P7-037 — refuses every check while no verify token is saved", async () => {
    vi.stubEnv("MESSENGER_VERIFY_TOKEN", "");
    const response = GET(subscription({ ...valid, "hub.verify_token": "" }));
    expect(response.status).toBe(403);
  });
});

describe("Messenger webhook events (FR-058, NFR-022)", () => {
  it("TC-P7-038 — answers 200 at once and replies after the response", async () => {
    const body = JSON.stringify(PAYLOAD);
    const response = await POST(signed(body));
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("EVENT_RECEIVED");
    expectPlainHeaders(response);
    expect(mocks.tasks).toHaveLength(1);
    expect(mocks.processWebhook).not.toHaveBeenCalled();

    await mocks.tasks[0]?.();
    expect(mocks.createMessengerDeps).toHaveBeenCalledWith(
      "https://brew.example",
      PAGE_TOKEN,
    );
    expect(mocks.processWebhook).toHaveBeenCalledWith(PAYLOAD, {
      origin: "https://brew.example",
      pageToken: PAGE_TOKEN,
    });
    expect(warned).not.toHaveBeenCalled();
  });

  it("TC-P7-038 — a failure after the response is logged by name only", async () => {
    mocks.processWebhook.mockRejectedValueOnce(
      new Error(`Send failed with ${PAGE_TOKEN}`),
    );
    await POST(signed(JSON.stringify(PAYLOAD)));
    await expect(mocks.tasks[0]?.()).resolves.toBeUndefined();
    expect(warned).toHaveBeenCalledWith(
      JSON.stringify({ event: "messenger-processing-failed" }),
    );
    expect(JSON.stringify(warned.mock.calls)).not.toContain(PAGE_TOKEN);
  });

  it.each<{ name: string; headers: Record<string, string> }>([
    { name: "no signature", headers: {} },
    {
      name: "a signature from another secret",
      headers: {
        "x-hub-signature-256": sign(JSON.stringify(PAYLOAD), "someone-else"),
      },
    },
    {
      name: "a signature of another body",
      headers: {
        "x-hub-signature-256": sign(
          JSON.stringify({ ...PAYLOAD, object: "user" }),
        ),
      },
    },
    {
      name: "a SHA-1 signature",
      headers: {
        "x-hub-signature": `sha1=${createHmac("sha1", APP_SECRET)
          .update(JSON.stringify(PAYLOAD))
          .digest("hex")}`,
      },
    },
  ])("TC-P7-039 — refuses an event with $name", async ({ headers }) => {
    const response = await POST(post(JSON.stringify(PAYLOAD), headers));
    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("Unauthorized");
    expect(mocks.tasks).toHaveLength(0);
    expect(warned).toHaveBeenCalledWith(
      JSON.stringify({ event: "messenger-bad-signature" }),
    );
  });

  it("TC-P7-039 — checks the exact bytes Meta signed", async () => {
    const body = JSON.stringify(PAYLOAD);
    const spaced = JSON.stringify(PAYLOAD, null, 2);
    const response = await POST(
      post(spaced, { "x-hub-signature-256": sign(body) }),
    );
    expect(response.status).toBe(401);

    const accented = '{"object":"page","entry":[],"note":"Ménu 😺"}';
    const ok = await POST(signed(accented));
    expect(ok.status).toBe(200);
    await mocks.tasks[0]?.();
    expect(mocks.processWebhook).toHaveBeenCalledWith(
      JSON.parse(accented),
      expect.anything(),
    );
  });

  it.each([
    { name: "a body that isn't JSON", body: "not json", status: 400 },
    { name: "a body that's JSON null", body: "null", status: 404 },
    {
      name: "another product's events",
      body: JSON.stringify({ ...PAYLOAD, object: "instagram" }),
      status: 404,
    },
  ])("TC-P7-040 — refuses a signed $name", async ({ body, status }) => {
    const response = await POST(signed(body));
    expect(response.status).toBe(status);
    expect(mocks.tasks).toHaveLength(0);
  });

  it("TC-P7-040 — refuses a body over 1 MB, unread when its size says so", async () => {
    const declared = post(JSON.stringify(PAYLOAD), {
      "content-length": String(MAX_WEBHOOK_BODY_BYTES + 1),
    });
    const response = await POST(declared);
    expect(response.status).toBe(413);
    await expect(response.text()).resolves.toBe("Too large");
    expect(declared.bodyUsed).toBe(false);

    const big = JSON.stringify({
      object: "page",
      entry: [],
      padding: "x".repeat(MAX_WEBHOOK_BODY_BYTES),
    });
    const tooBig = await POST(signed(big));
    expect(tooBig.status).toBe(413);
    expect(mocks.tasks).toHaveLength(0);
  });

  it("TC-P7-041 — without a Page token, answers 200 so Meta keeps the webhook", async () => {
    vi.stubEnv("MESSENGER_PAGE_ACCESS_TOKEN", "");
    const response = await POST(signed(JSON.stringify(PAYLOAD)));
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("EVENT_RECEIVED");
    expect(mocks.tasks).toHaveLength(0);
    expect(warned).toHaveBeenCalledWith(
      JSON.stringify({ event: "messenger-no-page-token" }),
    );
  });

  it("TC-P7-041 — without an app secret, accepts nothing", async () => {
    vi.stubEnv("MESSENGER_APP_SECRET", "");
    const response = await POST(signed(JSON.stringify(PAYLOAD)));
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe("Not configured");
    expect(mocks.tasks).toHaveLength(0);
    expect(warned).toHaveBeenCalledWith(
      JSON.stringify({ event: "messenger-not-configured" }),
    );
  });

  it("TC-P7-041 — logs never carry the secrets", async () => {
    await POST(post(JSON.stringify(PAYLOAD)));
    vi.stubEnv("MESSENGER_PAGE_ACCESS_TOKEN", "");
    await POST(signed(JSON.stringify(PAYLOAD)));
    const logged = JSON.stringify(warned.mock.calls);
    for (const secret of [APP_SECRET, VERIFY_TOKEN, PAGE_TOKEN]) {
      expect(logged).not.toContain(secret);
    }
  });
});
