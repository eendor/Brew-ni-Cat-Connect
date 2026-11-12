// @vitest-environment node
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import {
  EVENT_MAX_AGE_MS,
  EVENT_MAX_SKEW_MS,
  eventTime,
  LIMIT_WINDOW_MS,
  MAX_EVENTS_PER_DELIVERY,
  NOTICE_INTERVAL_MS,
  ORDER_LOOKUP_LIMIT,
  ORDER_STEP_LIMIT,
  processWebhook,
  resetMessengerState,
  SENDER_REPLY_LIMIT,
  type MessengerDeps,
} from "@/lib/messenger/events";
import { CATEGORY_PAYLOAD_PREFIX, PAYLOADS } from "@/lib/messenger/intents";
import { encodeOrderPayload, newOrder } from "@/lib/messenger/order-state";
import { orderPausedReply } from "@/lib/messenger/ordering";
import {
  ASSISTANT_NOTICE,
  noOrdersReply,
  orderLimitReply,
  orderNotFoundReply,
  orderUnavailableReply,
  welcomeReply,
  type Reply,
} from "@/lib/messenger/replies";
import { hoursNotice } from "@/lib/site-content/format";

import {
  catalog,
  content,
  CUSTOMER,
  NOW,
  order,
  ORDER_LINK,
  ORIGIN,
  OTHER_CUSTOMER,
  PAGE,
  REFERENCE,
  TOKEN,
} from "./messenger-fixtures";

type Options = Readonly<{ sender?: string; time?: unknown; mid?: string }>;

let messageCount = 0;
const nextMid = () => `m_test_${(messageCount += 1)}`;

function base(options: Options) {
  return {
    sender: { id: options.sender ?? CUSTOMER },
    recipient: { id: PAGE },
    timestamp: "time" in options ? options.time : NOW,
  };
}

/** A tap on a button in the chat's menu or a message's button. */
function postback(payload: string, options: Options = {}) {
  return {
    ...base(options),
    postback: { title: "Tap", payload, mid: options.mid ?? nextMid() },
  };
}

/** A tap on a quick reply: Meta sends its title as text and its payload. */
function quickReplyTap(payload: string, title: string, options: Options = {}) {
  return {
    ...base(options),
    message: {
      mid: options.mid ?? nextMid(),
      text: title,
      quick_reply: { payload },
    },
  };
}

function typed(text: string, options: Options = {}) {
  return {
    ...base(options),
    message: { mid: options.mid ?? nextMid(), text },
  };
}

function delivery(...messaging: unknown[]) {
  return { object: "page", entry: [{ id: PAGE, time: NOW, messaging }] };
}

function setup(overrides: Partial<MessengerDeps> = {}) {
  let now = NOW;
  const sent: { recipient: string; answer: Reply }[] = [];
  const deps = {
    origin: ORIGIN,
    now: () => now,
    onlineOrdering: () => true,
    readContent: vi.fn<MessengerDeps["readContent"]>(async () => content),
    readMenu: vi.fn<MessengerDeps["readMenu"]>(async () => catalog),
    lookupOrder: vi.fn<MessengerDeps["lookupOrder"]>(async () => null),
    lookupMyOrders: vi.fn<MessengerDeps["lookupMyOrders"]>(async () => []),
    readCustomerName: vi.fn<MessengerDeps["readCustomerName"]>(
      async () => "Test Customer",
    ),
    readTakeoutBoxPrice: vi.fn<MessengerDeps["readTakeoutBoxPrice"]>(
      async () => 10,
    ),
    newNonce: () => "nonce0000000000a",
    placeOrder: vi.fn<MessengerDeps["placeOrder"]>(async () => null),
    send: vi.fn<MessengerDeps["send"]>(async (recipient, answer) => {
      sent.push({ recipient, answer });
      return true;
    }),
    ...overrides,
  };
  return {
    deps,
    sent,
    texts: () => sent.map((entry) => entry.answer.text),
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const count = (text: string | undefined, part: string) =>
  (text ?? "").split(part).length - 1;

let info: MockInstance<typeof console.info>;

beforeEach(() => {
  resetMessengerState();
  info = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Messenger buttons (FR-059, FR-062)", () => {
  it("TC-P7-019 — answers a button tap, with the notice on the first reply only", async () => {
    const { deps, sent, texts } = setup();
    await expect(
      processWebhook(delivery(postback(PAYLOADS["hours-location"])), deps),
    ).resolves.toEqual({ replied: 1, skipped: 0, failed: 0 });
    expect(sent[0]?.recipient).toBe(CUSTOMER);
    expect(texts()[0]).toBe(
      `${ASSISTANT_NOTICE}\n\n🕒 ${hoursNotice(content.hours)}\n\n📢 Notice: Closed on June 12 for a holiday.\n\n📍 We're at 1 Sample St, Sample Area, Sample Town, Sample Province 1000, beside the sample park.`,
    );
    // The map comes as a button (FR-104).
    expect(sent[0]?.answer.links).toEqual([
      { title: "📍 Open map", url: "https://maps.example/shop" },
    ]);

    await processWebhook(delivery(postback(PAYLOADS["how-to-order"])), deps);
    expect(texts()[1]).toMatch(/^How to order from Brew ni Cat: 🐱☕\n/);
    expect(count(texts()[1], ASSISTANT_NOTICE)).toBe(0);
  });

  it("TC-P7-020 — a quick reply goes by its payload, not its text", async () => {
    const { deps, texts } = setup();
    await processWebhook(
      delivery(quickReplyTap(PAYLOADS["order-status"], "Menu & prices")),
      deps,
    );
    expect(texts()[0]).toContain("I can't see any orders from this chat yet.");
    expect(texts()[0]).not.toContain("What are you craving?");
  });

  it("TC-P7-020 — a category button lists that category", async () => {
    const { deps, sent, texts } = setup();
    await processWebhook(
      delivery(postback(`${CATEGORY_PAYLOAD_PREFIX}cat_drinks`)),
      deps,
    );
    expect(texts()[0]).toContain(
      "🥤 Cat-Tastic Drinks\n• Iced Latte — 16oz ₱49 · 22oz ₱59\n",
    );
    expect(sent[0]?.answer.quickReplies[0]?.payload).toBe(PAYLOADS.order);
    expect(sent[0]?.answer.quickReplies[1]?.payload).toBe(
      `${CATEGORY_PAYLOAD_PREFIX}cat_bites`,
    );
  });

  it("TC-P7-021 — a typed button name works like the button", async () => {
    const { deps, texts } = setup();
    await processWebhook(delivery(typed("Hi!")), deps);
    expect(texts()[0]).toBe(welcomeReply().text);
    expect(count(texts()[0], ASSISTANT_NOTICE)).toBe(1);

    await processWebhook(delivery(typed("menu po")), deps);
    expect(texts()[1]).toContain("What are you craving?");
    expect(count(texts()[1], ASSISTANT_NOTICE)).toBe(0);
  });

  it("TC-P7-022 — other messages, photos and stickers are left for the staff", async () => {
    const { deps } = setup();
    const photo = {
      ...base({}),
      message: {
        mid: nextMid(),
        attachments: [
          { type: "image", payload: { url: "https://cdn.example/photo.jpg" } },
        ],
      },
    };
    const sticker = {
      ...base({}),
      message: {
        mid: nextMid(),
        sticker_id: 369239263222822,
        attachments: [
          {
            type: "image",
            payload: {
              url: "https://cdn.example/sticker.png",
              sticker_id: 369239263222822,
            },
          },
        ],
      },
    };
    await expect(
      processWebhook(
        delivery(
          typed("pa order po 2 fries, pickup at 5"),
          typed("may available pa po ba na matcha?"),
          photo,
          sticker,
        ),
        deps,
      ),
    ).resolves.toEqual({ replied: 0, skipped: 4, failed: 0 });
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.readContent).not.toHaveBeenCalled();
    expect(deps.readMenu).not.toHaveBeenCalled();
  });

  // Added 2026-11-11: a typed "are you open?" used to get no reply.
  it("TC-P7-089 — a typed question about being open gets the hours and location", async () => {
    const { deps, texts } = setup();
    await expect(
      processWebhook(
        delivery(
          typed("Hello po, open po ba kayo today?"),
          typed("pa order po bukas"),
        ),
        deps,
      ),
    ).resolves.toEqual({ replied: 1, skipped: 1, failed: 0 });
    expect(texts()[0]).toContain(ASSISTANT_NOTICE);
    expect(texts()[0]).toContain("📍 We're at");
    expect(deps.readMenu).not.toHaveBeenCalled();
  });

  it("TC-P7-023 — skips events that aren't a customer's message or tap", async () => {
    const { deps } = setup();
    const echo = {
      sender: { id: PAGE },
      recipient: { id: CUSTOMER },
      timestamp: NOW,
      message: { mid: nextMid(), is_echo: true, app_id: 1, text: "menu" },
    };
    const echoFromCustomerSide = {
      ...base({}),
      message: { mid: nextMid(), is_echo: true, text: "menu" },
    };
    const pageSender = typed("menu", { sender: PAGE });
    const deliveryReceipt = {
      ...base({}),
      delivery: { mids: ["m_1"], watermark: NOW },
    };
    const readReceipt = { ...base({}), read: { watermark: NOW } };
    const userRef = {
      sender: { user_ref: "ref-1" },
      recipient: { id: PAGE },
      timestamp: NOW,
      message: { mid: nextMid(), text: "menu" },
    };
    const notAnId = typed("menu", { sender: "abc" });
    const handover = {
      ...base({}),
      pass_thread_control: { new_owner_app_id: "263902037430900" },
    };
    const noTime = typed("menu", { time: undefined });

    await expect(
      processWebhook(
        delivery(
          echo,
          echoFromCustomerSide,
          pageSender,
          deliveryReceipt,
          readReceipt,
          userRef,
          notAnId,
          handover,
          noTime,
          "menu",
          null,
        ),
        deps,
      ),
    ).resolves.toEqual({ replied: 0, skipped: 11, failed: 0 });

    const standby = {
      object: "page",
      entry: [{ id: PAGE, time: NOW, standby: [typed("menu")] }],
    };
    for (const payload of [
      standby,
      {
        object: "instagram",
        entry: [{ id: PAGE, messaging: [typed("menu")] }],
      },
      { object: "page", entry: "nope" },
      { object: "page" },
      null,
      "page",
    ]) {
      await expect(processWebhook(payload, deps)).resolves.toEqual({
        replied: 0,
        skipped: 0,
        failed: 0,
      });
    }
    expect(deps.send).not.toHaveBeenCalled();
  });
});

describe("Messenger event checks (NFR-022)", () => {
  it.each([
    { name: "an hour old", time: NOW - EVENT_MAX_AGE_MS, replied: 1 },
    { name: "over an hour old", time: NOW - EVENT_MAX_AGE_MS - 1, replied: 0 },
    { name: "5 minutes ahead", time: NOW + EVENT_MAX_SKEW_MS, replied: 1 },
    {
      name: "over 5 minutes ahead",
      time: NOW + EVENT_MAX_SKEW_MS + 1,
      replied: 0,
    },
    { name: "in seconds", time: Math.floor(NOW / 1000), replied: 1 },
    { name: "a numeric string", time: String(NOW), replied: 1 },
  ])("TC-P7-024 — an event $name", async ({ time, replied }) => {
    const { deps } = setup();
    const result = await processWebhook(
      delivery(postback(PAYLOADS.welcome, { time })),
      deps,
    );
    expect(result).toEqual({ replied, skipped: 1 - replied, failed: 0 });
  });

  it("TC-P7-024 — reads event times in milliseconds or seconds", () => {
    expect(eventTime(NOW)).toBe(NOW);
    expect(eventTime(NOW / 1000)).toBe(NOW);
    expect(eventTime(String(NOW))).toBe(NOW);
    for (const value of [
      0,
      -5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "12a",
      "",
      "1".repeat(17),
      null,
      undefined,
      {},
    ]) {
      expect(eventTime(value)).toBeNull();
    }
  });

  it("TC-P7-025 — answers an event Meta sends twice only once", async () => {
    const { deps } = setup();
    const tap = postback(PAYLOADS.menu, { mid: "m_same" });
    await processWebhook(delivery(tap), deps);
    await expect(processWebhook(delivery(tap), deps)).resolves.toEqual({
      replied: 0,
      skipped: 1,
      failed: 0,
    });

    // Without a message id, the customer and time tell events apart.
    const noId = {
      ...base({}),
      postback: { title: "Tap", payload: PAYLOADS.staff },
    };
    await expect(processWebhook(delivery(noId, noId), deps)).resolves.toEqual({
      replied: 1,
      skipped: 1,
      failed: 0,
    });
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
});

describe("Messenger limits (NFR-018)", () => {
  it("TC-P7-026 — replies to each customer at most 20 times in 10 minutes", async () => {
    const { deps, advance } = setup();
    const taps = Array.from({ length: SENDER_REPLY_LIMIT + 5 }, () =>
      postback(PAYLOADS.welcome),
    );
    await expect(
      processWebhook(
        delivery(
          ...taps,
          postback(PAYLOADS.welcome, { sender: OTHER_CUSTOMER }),
        ),
        deps,
      ),
    ).resolves.toEqual({
      replied: SENDER_REPLY_LIMIT + 1,
      skipped: 5,
      failed: 0,
    });

    advance(LIMIT_WINDOW_MS);
    await expect(
      processWebhook(
        delivery(postback(PAYLOADS.welcome, { time: NOW + LIMIT_WINDOW_MS })),
        deps,
      ),
    ).resolves.toEqual({ replied: 1, skipped: 0, failed: 0 });
  });

  it("TC-P7-028 — checks at most 5 orders per customer in 10 minutes", async () => {
    const { deps, texts } = setup({
      lookupOrder: vi.fn<MessengerDeps["lookupOrder"]>(async () =>
        order("ready"),
      ),
    });
    const links = Array.from({ length: ORDER_LOOKUP_LIMIT + 2 }, () =>
      typed(ORDER_LINK),
    );
    await processWebhook(
      delivery(...links, typed(ORDER_LINK, { sender: OTHER_CUSTOMER })),
      deps,
    );
    expect(deps.lookupOrder).toHaveBeenCalledTimes(ORDER_LOOKUP_LIMIT + 1);
    expect(texts().slice(ORDER_LOOKUP_LIMIT, ORDER_LOOKUP_LIMIT + 2)).toEqual([
      orderLimitReply().text,
      orderLimitReply().text,
    ]);
    expect(texts().at(-1)).toContain("Order BNC-7K2Q9F: Ready for Pickup");
  });
});

describe("Messenger order status (FR-063)", () => {
  it("TC-P7-027 — an order link gets the order's status", async () => {
    const lookupOrder = vi.fn<MessengerDeps["lookupOrder"]>(async () =>
      order("preparing"),
    );
    const { deps, sent, texts } = setup({ lookupOrder });
    await processWebhook(
      delivery(typed(`Hi po, status ng order ko ${ORDER_LINK} salamat po`)),
      deps,
    );
    expect(lookupOrder).toHaveBeenCalledWith(REFERENCE, TOKEN);
    expect(texts()[0]).toBe(
      `${ASSISTANT_NOTICE}\n\n🍳 Order BNC-7K2Q9F: Preparing\nYour drinks and food are being prepared.`,
    );
    // An order from the website keeps its page, as a button.
    expect(sent[0]?.answer.links?.[0]?.title).toBe("📍 Track order");
  });

  it.each([
    {
      name: "no order matches",
      lookup: async () => null,
      text: orderNotFoundReply().text,
    },
    {
      name: "orders can't be checked",
      lookup: async () => {
        throw new Error("Timed out.");
      },
      text: orderUnavailableReply().text,
    },
  ])("TC-P7-027 — says so when $name", async ({ lookup, text }) => {
    const { deps, texts } = setup({
      lookupOrder: vi.fn<MessengerDeps["lookupOrder"]>(lookup),
    });
    await expect(
      processWebhook(delivery(typed(ORDER_LINK)), deps),
    ).resolves.toEqual({ replied: 1, skipped: 0, failed: 0 });
    expect(texts()[0]).toBe(`${ASSISTANT_NOTICE}\n\n${text}`);
  });

  it("TC-P7-029 — a short message with only a reference gets asked for the link", async () => {
    const { deps, texts } = setup();
    await processWebhook(
      delivery(typed("BNC-7K2Q9F po"), typed("bnc-7k2q9f")),
      deps,
    );
    expect(deps.lookupOrder).not.toHaveBeenCalled();
    expect(texts()[0]).toContain(
      "For your privacy, I can only check an order from its full order link",
    );
    expect(count(texts()[1], "Paste the link of order BNC-7K2Q9F here")).toBe(
      1,
    );
  });

  it("TC-P7-029 — a longer message with a reference is left for the staff", async () => {
    const { deps } = setup();
    await expect(
      processWebhook(
        delivery(
          typed(
            "Good afternoon po, yung order ko BNC-7K2Q9F pwede pa po ba dagdagan ng fries?",
          ),
        ),
        deps,
      ),
    ).resolves.toEqual({ replied: 0, skipped: 1, failed: 0 });
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.lookupOrder).not.toHaveBeenCalled();
  });
});

describe("Messenger notice and delivery (FR-062)", () => {
  it("TC-P7-030 — says it's automated again after 24 hours", async () => {
    const { deps, texts, advance } = setup();
    await processWebhook(delivery(postback(PAYLOADS.staff)), deps);
    advance(NOTICE_INTERVAL_MS - 1);
    await processWebhook(
      delivery(
        postback(PAYLOADS.staff, { time: NOW + NOTICE_INTERVAL_MS - 1 }),
      ),
      deps,
    );
    advance(1);
    await processWebhook(
      delivery(postback(PAYLOADS.staff, { time: NOW + NOTICE_INTERVAL_MS })),
      deps,
    );
    expect(texts().map((text) => count(text, ASSISTANT_NOTICE))).toEqual([
      1, 0, 1,
    ]);
  });

  it("TC-P7-031 — a reply Meta refuses is counted, and the next reply has the notice", async () => {
    const send = vi
      .fn<MessengerDeps["send"]>()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const { deps } = setup({ send });
    await expect(
      processWebhook(delivery(postback(PAYLOADS.staff)), deps),
    ).resolves.toEqual({ replied: 0, skipped: 0, failed: 1 });
    await processWebhook(delivery(postback(PAYLOADS.staff)), deps);
    expect(send).toHaveBeenCalledTimes(2);
    for (const [, answer] of send.mock.calls) {
      expect(count(answer.text, ASSISTANT_NOTICE)).toBe(1);
    }
  });

  it("TC-P7-032 — an unknown button shows the welcome again", async () => {
    const { deps, texts } = setup();
    await processWebhook(delivery(postback("SOME_OLD_BUTTON")), deps);
    expect(texts()[0]).toBe(welcomeReply().text);
  });

  it("TC-P7-032 — reads the content and menu once per delivery", async () => {
    const { deps } = setup();
    await expect(
      processWebhook(
        delivery(
          postback(PAYLOADS["hours-location"]),
          postback(PAYLOADS["how-to-order"]),
          postback(PAYLOADS.staff),
          postback(PAYLOADS.menu),
          postback(`${CATEGORY_PAYLOAD_PREFIX}cat_bites`),
        ),
        deps,
      ),
    ).resolves.toEqual({ replied: 5, skipped: 0, failed: 0 });
    expect(deps.readContent).toHaveBeenCalledTimes(1);
    expect(deps.readMenu).toHaveBeenCalledTimes(1);
  });

  it("TC-P7-032 — a menu that can't be read gets no guessed price", async () => {
    const { deps, texts } = setup({
      readMenu: vi.fn<MessengerDeps["readMenu"]>(async () => {
        throw new Error("Database down.");
      }),
    });
    await processWebhook(
      delivery(
        postback(PAYLOADS.menu),
        postback(`${CATEGORY_PAYLOAD_PREFIX}cat_drinks`),
      ),
      deps,
    );
    for (const text of texts()) {
      expect(text).toContain("I can't load the menu right now");
      expect(text).not.toContain("₱");
    }
    expect(deps.readMenu).toHaveBeenCalledTimes(1);
  });

  it("TC-P7-033 — one failed reply doesn't stop the others, and logs carry counts only", async () => {
    const send = vi
      .fn<MessengerDeps["send"]>()
      .mockRejectedValueOnce(new Error("Network down."))
      .mockResolvedValue(true);
    const { deps } = setup({ send });
    await expect(
      processWebhook(
        delivery(
          typed("menu"),
          typed("hours po", { sender: OTHER_CUSTOMER }),
          typed("pa order po"),
        ),
        deps,
      ),
    ).resolves.toEqual({ replied: 1, skipped: 1, failed: 1 });
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      JSON.stringify({
        event: "messenger-webhook-processed",
        replied: 1,
        skipped: 1,
        failed: 1,
      }),
    );
    const logged = JSON.stringify(info.mock.calls);
    for (const secret of [
      CUSTOMER,
      OTHER_CUSTOMER,
      "pa order po",
      "hours po",
    ]) {
      expect(logged).not.toContain(secret);
    }

    await processWebhook(delivery(), deps);
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("TC-P7-033 — handles at most 100 events from one delivery", async () => {
    const { deps } = setup();
    const taps = Array.from({ length: MAX_EVENTS_PER_DELIVERY + 1 }, (_, i) =>
      postback(PAYLOADS.welcome, { sender: String(7200000000000000 + i) }),
    );
    await expect(processWebhook(delivery(...taps), deps)).resolves.toEqual({
      replied: MAX_EVENTS_PER_DELIVERY,
      skipped: 1,
      failed: 0,
    });
  });
});

describe("Messenger order status in the chat (FR-110)", () => {
  it("TC-P7-052 — Order status lists this customer's own orders, with no order number or link", async () => {
    const lookupMyOrders = vi.fn<MessengerDeps["lookupMyOrders"]>(async () => [
      order("preparing"),
    ]);
    const lookupOrder = vi.fn<MessengerDeps["lookupOrder"]>(async () => null);
    const { deps, sent, texts } = setup({ lookupMyOrders, lookupOrder });
    await processWebhook(delivery(postback(PAYLOADS["order-status"])), deps);

    expect(lookupMyOrders).toHaveBeenCalledTimes(1);
    expect(lookupMyOrders).toHaveBeenCalledWith(CUSTOMER);
    expect(lookupOrder).not.toHaveBeenCalled();
    expect(texts()[0]).toBe(
      `${ASSISTANT_NOTICE}\n\n📦 Your orders from this chat\n\n🍳 Order BNC-7K2Q9F: Preparing\nYour drinks and food are being prepared.\n🧾 2 × Iced Latte · ₱98\n\nTap Refresh to see the latest status. 🔄`,
    );
    expect(texts()[0]).not.toContain("https://");
    expect(texts()[0]).not.toContain("#token");
    expect(sent[0]?.answer.links ?? []).toEqual([]);
    expect(sent[0]?.answer.quickReplies[0]).toMatchObject({
      title: "🔄 Refresh",
      payload: PAYLOADS["order-status"],
    });
  });

  it("TC-P7-052 — typing 'order status' does the same, for the person who typed", async () => {
    const lookupMyOrders = vi.fn<MessengerDeps["lookupMyOrders"]>(async () => [
      order("ready"),
    ]);
    const { deps, texts } = setup({ lookupMyOrders });
    await processWebhook(
      delivery(typed("order status", { sender: OTHER_CUSTOMER })),
      deps,
    );
    expect(lookupMyOrders).toHaveBeenCalledWith(OTHER_CUSTOMER);
    expect(texts()[0]).toContain("🎉 Order BNC-7K2Q9F: Ready for Pickup");
  });

  it("TC-P7-052 — tells a customer with no order so, and offers Order here", async () => {
    const { deps, sent, texts } = setup();
    await processWebhook(delivery(postback(PAYLOADS["order-status"])), deps);
    expect(texts()[0]).toContain(noOrdersReply().text);
    expect(sent[0]?.answer.quickReplies[0]?.payload).toBe(PAYLOADS.order);
  });

  it.each([
    { name: "returns nothing", lookup: async () => null },
    {
      name: "fails",
      lookup: async () => {
        throw new Error("down");
      },
    },
  ])(
    "TC-P7-052 — says it can't check, never 'no orders', when the lookup $name",
    async ({ lookup }) => {
      const { deps, texts } = setup({
        lookupMyOrders: vi.fn<MessengerDeps["lookupMyOrders"]>(lookup),
      });
      await processWebhook(delivery(postback(PAYLOADS["order-status"])), deps);
      expect(texts()[0]).toContain(orderUnavailableReply().text);
      expect(texts()[0]).not.toContain("I can't see any orders");
    },
  );

  it("TC-P7-052 — limits order checks per customer, and a status tap counts", async () => {
    const { deps, texts } = setup();
    for (let i = 0; i <= ORDER_LOOKUP_LIMIT; i += 1) {
      await processWebhook(delivery(postback(PAYLOADS["order-status"])), deps);
    }
    expect(texts()).toHaveLength(ORDER_LOOKUP_LIMIT + 1);
    expect(texts().at(-1)).toBe(orderLimitReply().text);
    expect(deps.lookupMyOrders).toHaveBeenCalledTimes(ORDER_LOOKUP_LIMIT);
  });
});

describe("Messenger ordering entry points (FR-100)", () => {
  it("TC-P7-057 — Order here asks for the phone number with Messenger's phone button", async () => {
    const { deps, sent } = setup();
    await processWebhook(delivery(postback(PAYLOADS.order)), deps);
    expect(sent[0]?.answer.askPhone).toBe(true);
    expect(sent[0]?.answer.text).toContain("mobile number");
  });

  it("TC-P7-057 — the phone button's number starts the order and shows the categories", async () => {
    const { deps, sent } = setup();
    await processWebhook(
      delivery(quickReplyTap("+639171234567", "09171234567")),
      deps,
    );
    expect(deps.readMenu).toHaveBeenCalled();
    expect(sent[0]?.answer.cards?.map((card) => card.title)).toEqual([
      "🥤 Cat-Tastic Drinks",
      "🍟 Cat-Tastic Bites",
    ]);
  });

  it("TC-P7-057 — 'order 09XXXXXXXXX' works for someone who can't tap the button", async () => {
    const { deps, sent } = setup();
    await processWebhook(delivery(typed("Order 0917 123 4567")), deps);
    expect(sent[0]?.answer.cards).toHaveLength(2);
  });

  // Update 2026-11-11 (TC-P7-086): a bare mobile number now starts the
  // order; any other bare number is still left to the staff.
  it("TC-P7-057 — a bare number that isn't a mobile is left to the staff, not taken as an order", async () => {
    const { deps, sent } = setup();
    for (const text of ["(082) 123 4567", "1234"]) {
      await expect(
        processWebhook(delivery(typed(text)), deps),
      ).resolves.toEqual({ replied: 0, skipped: 1, failed: 0 });
    }
    expect(sent).toHaveLength(0);
  });

  it("TC-P7-086 — a message that is only a mobile number starts the order", async () => {
    const { deps, sent } = setup();
    await processWebhook(delivery(typed("0917 123 4567")), deps);
    expect(sent[0]?.answer.cards).toHaveLength(2);
  });

  it("TC-P7-057 — says ordering is paused while Place order is off", async () => {
    const { deps, sent } = setup({ onlineOrdering: () => false });
    await processWebhook(delivery(postback(PAYLOADS.order)), deps);
    expect(sent[0]?.answer.text).toContain(orderPausedReply().text);
    expect(sent[0]?.answer.askPhone).toBeFalsy();
  });

  it("TC-P7-058 — an order's own steps have their own limit, so a long order isn't cut off", async () => {
    const { deps, sent } = setup();
    const tap = encodeOrderPayload("cats", newOrder("09171234567"));
    for (let i = 0; i < SENDER_REPLY_LIMIT + 5; i += 1) {
      await processWebhook(delivery(postback(String(tap))), deps);
    }
    expect(sent).toHaveLength(SENDER_REPLY_LIMIT + 5);
    for (let i = 0; i < ORDER_STEP_LIMIT; i += 1) {
      await processWebhook(delivery(postback(String(tap))), deps);
    }
    // Past the limit it stops answering rather than looping forever.
    expect(sent.length).toBeLessThan(SENDER_REPLY_LIMIT + 5 + ORDER_STEP_LIMIT);
  });
});
