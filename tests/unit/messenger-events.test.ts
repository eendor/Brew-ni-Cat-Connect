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
  processWebhook,
  resetMessengerState,
  SENDER_REPLY_LIMIT,
  type MessengerDeps,
} from "@/lib/messenger/events";
import { CATEGORY_PAYLOAD_PREFIX, PAYLOADS } from "@/lib/messenger/intents";
import {
  ASSISTANT_NOTICE,
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
      `${ASSISTANT_NOTICE}\n\n${hoursNotice(content.hours)}\n\nNotice: Closed on June 12 for a holiday.\n\nWe're at 1 Sample St, Sample Area, Sample Town, Sample Province 1000, beside the sample park.\n\nMap: https://maps.example/shop`,
    );

    await processWebhook(delivery(postback(PAYLOADS["how-to-order"])), deps);
    expect(texts()[1]).toMatch(/^How to order from Brew ni Cat:\n/);
    expect(count(texts()[1], ASSISTANT_NOTICE)).toBe(0);
  });

  it("TC-P7-020 — a quick reply goes by its payload, not its text", async () => {
    const { deps, texts } = setup();
    await processWebhook(
      delivery(quickReplyTap(PAYLOADS["order-status"], "Menu & prices")),
      deps,
    );
    expect(texts()[0]).toContain(
      "To check your order, paste your order link here.",
    );
    expect(texts()[0]).not.toContain("What are you craving?");
  });

  it("TC-P7-020 — a category button lists that category", async () => {
    const { deps, sent, texts } = setup();
    await processWebhook(
      delivery(postback(`${CATEGORY_PAYLOAD_PREFIX}cat_drinks`)),
      deps,
    );
    expect(texts()[0]).toContain(
      "Cat-Tastic Drinks\n• Iced Latte — 16oz ₱49 · 22oz ₱59\n",
    );
    expect(sent[0]?.answer.quickReplies[0]?.payload).toBe(
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
    const { deps, texts } = setup({ lookupOrder });
    await processWebhook(
      delivery(typed(`Hi po, status ng order ko ${ORDER_LINK} salamat po`)),
      deps,
    );
    expect(lookupOrder).toHaveBeenCalledWith(REFERENCE, TOKEN);
    expect(texts()[0]).toBe(
      `${ASSISTANT_NOTICE}\n\nOrder BNC-7K2Q9F: Preparing\nYour drinks and food are being prepared.\n\nYour order link shows live updates.`,
    );
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
