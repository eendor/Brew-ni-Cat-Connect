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
  MAX_QUICK_REPLIES,
  welcomeReply,
  type Reply,
} from "@/lib/messenger/replies";
import {
  cleanName,
  createGraphClient,
  GRAPH_API_VERSION,
  MAX_BUTTON_TEXT,
  MAX_BUTTONS,
  MAX_CARDS,
  participantName,
  ASSISTANT_METADATA,
  sendApiBodies,
} from "@/lib/messenger/send";

import { CUSTOMER } from "./messenger-fixtures";

const PAGE_TOKEN = "test-page-token";

const accepted = () =>
  new Response(
    JSON.stringify({ recipient_id: CUSTOMER, message_id: "m_reply_1" }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

let warned: MockInstance<typeof console.warn>;

beforeEach(() => {
  warned = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Messenger Send API (FR-059)", () => {
  it("TC-P7-034 — posts the reply with the Page token in the header only", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => accepted());
    const client = createGraphClient(PAGE_TOKEN, fetchMock);
    const answer = welcomeReply();

    await expect(client.send(CUSTOMER, answer)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`,
    );
    expect(GRAPH_API_VERSION).toBe("v26.0");
    expect(String(url)).not.toContain(PAGE_TOKEN);
    expect(init?.method).toBe("POST");
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${PAGE_TOKEN}`);
    expect(headers.get("content-type")).toBe("application/json");

    const body = JSON.parse(String(init?.body));
    // the same body TC-P7-050 checks: buttons inside the reply
    expect(body).toEqual(sendApiBodies(CUSTOMER, answer)[0]);
    expect(body.message.attachment.payload.text).toBe(answer.text);
    // Never marks the chat as seen, so the staff still get the alert.
    expect(String(init?.body)).not.toContain("sender_action");
    expect(String(init?.body)).not.toContain("mark_seen");
    expect(String(init?.body)).not.toContain(PAGE_TOKEN);
    expect(warned).not.toHaveBeenCalled();
  });

  it("TC-P7-035 — leaves out empty quick replies and keeps at most 13", () => {
    expect(
      sendApiBodies(CUSTOMER, { text: "Okay!", quickReplies: [] }),
    ).toEqual([
      {
        recipient: { id: CUSTOMER },
        messaging_type: "RESPONSE",
        message: { text: "Okay!", metadata: ASSISTANT_METADATA },
      },
    ]);

    const many: Reply = {
      text: "Pick one.",
      quickReplies: Array.from({ length: 20 }, (_, i) => ({
        content_type: "text" as const,
        title: `Option ${i + 1}`,
        payload: "MENU",
      })),
    };
    // A text over 640 characters is sent first, then the buttons, and the
    // quick replies ride on the last message.
    const bodies = sendApiBodies(CUSTOMER, { ...many, text: "x".repeat(641) });
    expect(bodies).toHaveLength(2);
    expect(bodies[0]?.message).toEqual({
      text: "x".repeat(641),
      metadata: ASSISTANT_METADATA,
    });
    const last = bodies.at(-1);
    expect(last?.message.quick_replies).toHaveLength(MAX_QUICK_REPLIES);
    expect(
      (last?.message.quick_replies as { title: string }[] | undefined)?.at(-1)
        ?.title,
    ).toBe("Option 16");
  });

  it("TC-P7-050 — puts the first three choices as buttons inside the reply and keeps the rest as quick replies", () => {
    const choices = Array.from({ length: 5 }, (_, i) => ({
      content_type: "text" as const,
      title: `Option ${i + 1}`,
      payload: `P${i + 1}`,
    }));
    expect(
      sendApiBodies(CUSTOMER, { text: "Pick one.", quickReplies: choices }),
    ).toEqual([
      {
        recipient: { id: CUSTOMER },
        messaging_type: "RESPONSE",
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "Pick one.",
              buttons: choices.slice(0, MAX_BUTTONS).map((c) => ({
                type: "postback",
                title: c.title,
                payload: c.payload,
              })),
            },
          },
          quick_replies: choices.slice(MAX_BUTTONS),
          metadata: ASSISTANT_METADATA,
        },
      },
    ]);

    const [three] = sendApiBodies(CUSTOMER, {
      text: "x".repeat(MAX_BUTTON_TEXT),
      quickReplies: choices.slice(0, 3),
    });
    expect(three?.message).not.toHaveProperty("quick_replies");
    expect(three?.message).toHaveProperty("attachment");
  });

  it.each([
    {
      name: "Meta refuses the reply",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: { message: `Invalid token ${PAGE_TOKEN}`, code: 190 },
          }),
          { status: 400 },
        ),
      status: 400,
    },
    {
      name: "the network fails",
      fetchImpl: async () => {
        throw new TypeError(`fetch failed for ${PAGE_TOKEN}`);
      },
      status: 0,
    },
  ])(
    "TC-P7-036 — returns false and logs the status only when $name",
    async ({ fetchImpl, status }) => {
      const client = createGraphClient(
        PAGE_TOKEN,
        vi.fn<typeof fetch>(fetchImpl),
      );
      await expect(client.send(CUSTOMER, welcomeReply())).resolves.toBe(false);
      expect(warned).toHaveBeenCalledTimes(1);
      expect(warned).toHaveBeenCalledWith(
        JSON.stringify({
          event: "messenger-graph-failed",
          path: "/me/messages",
          status,
        }),
      );
      const logged = JSON.stringify(warned.mock.calls);
      for (const secret of [PAGE_TOKEN, CUSTOMER, "automated assistant"]) {
        expect(logged).not.toContain(secret);
      }
    },
  );
});

// Ordering in the chat (FR-100 to FR-109) ------------------------------------

const choice = (n: number) => ({
  content_type: "text" as const,
  title: `Option ${n}`,
  payload: `P${n}`,
});

describe("Messenger Send API: links, pictures and cards (FR-104)", () => {
  it("TC-P7-053 — a website link is a button, never a link in the text", () => {
    const [body] = sendApiBodies(CUSTOMER, {
      text: "See the menu.",
      quickReplies: [choice(1), choice(2), choice(3)],
      links: [{ title: "🌐 Full menu", url: "https://brew.example/menu" }],
    });
    expect(body?.message.attachment).toEqual({
      type: "template",
      payload: {
        template_type: "button",
        text: "See the menu.",
        buttons: [
          {
            type: "web_url",
            url: "https://brew.example/menu",
            title: "🌐 Full menu",
          },
          { type: "postback", title: "Option 1", payload: "P1" },
          { type: "postback", title: "Option 2", payload: "P2" },
        ],
      },
    });
    // The third choice did not fit in the three buttons, so it stays a
    // quick reply.
    expect(body?.message.quick_replies).toEqual([choice(3)]);
  });

  it("TC-P7-053 — a reply can keep most of its choices under the message", () => {
    const [body] = sendApiBodies(CUSTOMER, {
      text: "What are you craving?",
      quickReplies: [choice(1), choice(2), choice(3)],
      links: [{ title: "🌐 Full menu", url: "https://brew.example/menu" }],
      inlineChoices: 1,
    });
    const payload = (
      body?.message.attachment as { payload: { buttons: unknown[] } }
    ).payload;
    expect(payload.buttons).toHaveLength(2);
    expect(body?.message.quick_replies).toEqual([choice(2), choice(3)]);
  });

  it("TC-P7-053 — a list of choices stays under the message as quick replies", () => {
    const bodies = sendApiBodies(CUSTOMER, {
      text: "Which size?",
      quickReplies: [choice(1), choice(2)],
      listChoices: true,
    });
    expect(bodies).toEqual([
      {
        recipient: { id: CUSTOMER },
        messaging_type: "RESPONSE",
        message: {
          text: "Which size?",
          quick_replies: [choice(1), choice(2)],
          metadata: ASSISTANT_METADATA,
        },
      },
    ]);
  });

  it("TC-P7-054 — sends the pictures, then the cards, with the quick replies on the last message", () => {
    const cards = Array.from({ length: MAX_CARDS + 2 }, (_, i) => ({
      title: `Item ${i}`,
      subtitle: "from ₱45",
      imageUrl: `https://brew.example/images/${i}.jpg`,
      buttons: [
        { type: "postback" as const, title: "🛒 Order", payload: `P${i}` },
      ],
    }));
    const bodies = sendApiBodies(CUSTOMER, {
      text: "Bites",
      quickReplies: [choice(1)],
      listChoices: true,
      images: ["https://brew.example/images/menu/bites.jpg"],
      cards,
    });
    expect(bodies).toHaveLength(3);
    expect(bodies[0]?.message).toEqual({
      text: "Bites",
      metadata: ASSISTANT_METADATA,
    });
    expect(bodies[1]?.message).toEqual({
      attachment: {
        type: "image",
        payload: {
          url: "https://brew.example/images/menu/bites.jpg",
          is_reusable: true,
        },
      },
      metadata: ASSISTANT_METADATA,
    });
    const carousel = bodies[2]?.message.attachment as {
      payload: {
        template_type: string;
        image_aspect_ratio: string;
        elements: unknown[];
      };
    };
    expect(carousel.payload.template_type).toBe("generic");
    expect(carousel.payload.image_aspect_ratio).toBe("square");
    expect(carousel.payload.elements).toHaveLength(MAX_CARDS);
    expect(carousel.payload.elements[0]).toEqual({
      title: "Item 0",
      subtitle: "from ₱45",
      image_url: "https://brew.example/images/0.jpg",
      buttons: [{ type: "postback", title: "🛒 Order", payload: "P0" }],
    });
    expect(bodies[0]?.message).not.toHaveProperty("quick_replies");
    expect(bodies[2]?.message.quick_replies).toEqual([choice(1)]);
  });

  it("TC-P7-055 — asks for the phone number with Messenger's own button, first", () => {
    const [body] = sendApiBodies(CUSTOMER, {
      text: "Share your number.",
      quickReplies: [choice(1)],
      listChoices: true,
      askPhone: true,
    });
    expect(body?.message.quick_replies).toEqual([
      { content_type: "user_phone_number" },
      choice(1),
    ]);
  });

  it("TC-P7-054 — a picture Meta refuses does not stop the rest of the reply", async () => {
    const answer: Reply = {
      text: "Bites",
      quickReplies: [],
      images: ["https://brew.example/images/menu/bites.jpg"],
      cards: [
        {
          title: "Fries",
          subtitle: "from ₱45",
          imageUrl: "https://brew.example/a.jpg",
          buttons: [],
        },
      ],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(new Response("{}", { status: 400 }))
      .mockResolvedValueOnce(accepted());
    const client = createGraphClient(PAGE_TOKEN, fetchMock);
    await expect(client.send(CUSTOMER, answer)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refusedText = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 400 }));
    await expect(
      createGraphClient(PAGE_TOKEN, refusedText).send(CUSTOMER, answer),
    ).resolves.toBe(false);
    // The text failed, so nothing after it was sent.
    expect(refusedText).toHaveBeenCalledTimes(1);
  });
});

describe("Messenger customer name for an order (FR-106)", () => {
  const conversation = (people: unknown[]) =>
    new Response(
      JSON.stringify({ data: [{ id: "t_1", participants: { data: people } }] }),
      { status: 200 },
    );

  it("TC-P7-056 — reads the customer's name from the conversation, with the token in the header", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      conversation([
        { id: "900000000000001", name: "Brew ni Cat Coffee Shop" },
        { id: CUSTOMER, name: "  Maria   Santos " },
      ]),
    );
    const client = createGraphClient(PAGE_TOKEN, fetchMock);
    await expect(client.customerName(CUSTOMER)).resolves.toBe("Maria Santos");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe(`/${GRAPH_API_VERSION}/me/conversations`);
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      platform: "messenger",
      user_id: CUSTOMER,
      fields: "participants",
      limit: "1",
    });
    expect(String(url)).not.toContain(PAGE_TOKEN);
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${PAGE_TOKEN}`,
    );
  });

  it.each([
    {
      name: "Meta refuses",
      impl: async () => new Response("{}", { status: 403 }),
      status: 403,
    },
    {
      name: "the network fails",
      impl: async () => {
        throw new TypeError("down");
      },
      status: 0,
    },
  ])(
    "TC-P7-056 — gives no name and logs only the path and status when $name",
    async ({ impl, status }) => {
      const client = createGraphClient(PAGE_TOKEN, vi.fn<typeof fetch>(impl));
      await expect(client.customerName(CUSTOMER)).resolves.toBeNull();
      expect(warned).toHaveBeenCalledWith(
        JSON.stringify({
          event: "messenger-graph-failed",
          path: "/me/conversations",
          status,
        }),
      );
      const logged = JSON.stringify(warned.mock.calls);
      expect(logged).not.toContain(CUSTOMER);
      expect(logged).not.toContain(PAGE_TOKEN);
    },
  );

  it("TC-P7-056 — takes the participant who is the sender, and cleans the name", () => {
    const body = (people: unknown[]) => ({
      data: [{ participants: { data: people } }],
    });
    expect(
      participantName(body([{ id: "other", name: "Someone" }]), CUSTOMER),
    ).toBeNull();
    expect(participantName({ data: [] }, CUSTOMER)).toBeNull();
    expect(participantName(null, CUSTOMER)).toBeNull();
    expect(participantName(body([{ id: CUSTOMER }]), CUSTOMER)).toBeNull();
    expect(cleanName("  Ana\u0000 \n Reyes\u200b ")).toBe("Ana Reyes");
    expect(cleanName("   ")).toBeNull();
    expect(cleanName(42)).toBeNull();
    expect(cleanName("x".repeat(150))).toHaveLength(100);
    // A lone half of an emoji can't be stored, so it becomes \uFFFD.
    expect(cleanName(`${"y".repeat(99)}\ud83d`)).toBe(
      `${"y".repeat(99)}\ufffd`,
    );
  });

  it("TC-P7-109 — marks every message the assistant sends, so its echoes aren't taken for the staff", () => {
    const bodies = sendApiBodies(CUSTOMER, {
      text: "Bites",
      quickReplies: [choice(1)],
      listChoices: true,
      images: ["https://brew.example/images/menu/bites.jpg"],
    });
    expect(bodies.length).toBeGreaterThan(1);
    for (const body of bodies) {
      expect(body.message.metadata).toBe(ASSISTANT_METADATA);
    }
  });
});
