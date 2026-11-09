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
  createGraphClient,
  GRAPH_API_VERSION,
  MAX_BUTTON_TEXT,
  MAX_BUTTONS,
  sendApiBody,
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
    expect(body).toEqual(sendApiBody(CUSTOMER, answer));
    expect(body.message.attachment.payload.text).toBe(answer.text);
    // Never marks the chat as seen, so the staff still get the alert.
    expect(String(init?.body)).not.toContain("sender_action");
    expect(String(init?.body)).not.toContain("mark_seen");
    expect(String(init?.body)).not.toContain(PAGE_TOKEN);
    expect(warned).not.toHaveBeenCalled();
  });

  it("TC-P7-035 — leaves out empty quick replies and keeps at most 13", () => {
    expect(sendApiBody(CUSTOMER, { text: "Okay!", quickReplies: [] })).toEqual({
      recipient: { id: CUSTOMER },
      messaging_type: "RESPONSE",
      message: { text: "Okay!" },
    });

    const many: Reply = {
      text: "Pick one.",
      quickReplies: Array.from({ length: 20 }, (_, i) => ({
        content_type: "text" as const,
        title: `Option ${i + 1}`,
        payload: "MENU",
      })),
    };
    const body = sendApiBody(CUSTOMER, { ...many, text: "x".repeat(641) });
    expect(body.message.quick_replies).toHaveLength(MAX_QUICK_REPLIES);
    expect(body.message.quick_replies?.at(-1)?.title).toBe("Option 13");
  });

  it("TC-P7-050 — puts the first three choices as buttons inside the reply and keeps the rest as quick replies", () => {
    const choices = Array.from({ length: 5 }, (_, i) => ({
      content_type: "text" as const,
      title: `Option ${i + 1}`,
      payload: `P${i + 1}`,
    }));
    expect(
      sendApiBody(CUSTOMER, { text: "Pick one.", quickReplies: choices }),
    ).toEqual({
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
      },
    });

    const three = sendApiBody(CUSTOMER, {
      text: "x".repeat(MAX_BUTTON_TEXT),
      quickReplies: choices.slice(0, 3),
    });
    expect(three.message).not.toHaveProperty("quick_replies");
    expect(three.message).toHaveProperty("attachment");
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
