import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { shopFacts } from "@/lib/messenger/assistant";
import { processWebhook, resetMessengerState } from "@/lib/messenger/events";
import type { MessengerDeps } from "@/lib/messenger/events";
import {
  MAX_POST_TEXT,
  POSTS_TTL_MS,
  cleanPostText,
  postTime,
  postedHours,
  readTodaysPosts,
  resetPagePosts,
  type PagePost,
  type RawPost,
} from "@/lib/messenger/page-posts";
import { createPictureReader } from "@/lib/messenger/picture-text";
import { openNowReply } from "@/lib/messenger/replies";
import { createGraphClient } from "@/lib/messenger/send";

import {
  catalog,
  content,
  CUSTOMER,
  NOW,
  ORIGIN,
  PAGE,
} from "./messenger-fixtures";

// NOW is Monday 2026-11-09, 14:00 in Manila; the shop is open until 6 PM.
const HOUR = 60 * 60 * 1000;
const PICTURE = "https://scontent.fmnl1-1.fna.fbcdn.net/v/t39/photo.jpg";

const raw = (
  id: string,
  at: number,
  extra: Partial<Record<keyof RawPost, unknown>> = {},
): RawPost => ({
  id,
  // Graph API style: +0000, no colon.
  created_time: new Date(at).toISOString().replace(".000Z", "+0000"),
  ...extra,
});

const post = (text: string, at = NOW - HOUR): PagePost => ({
  id: "p1",
  time: at,
  text,
});

beforeEach(() => {
  resetPagePosts();
  resetMessengerState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Today's Page posts (FR-114)", () => {
  it("TC-P7-117 — keeps only today's posts (Manila day), at most two, and reads the Page again after two minutes", async () => {
    let now = NOW;
    const listPosts = vi.fn(async () => [
      raw("a", NOW - HOUR, { message: "We open at 3:00 pm today po!" }),
      raw("b", NOW - 2 * HOUR, { message: "New iced latte flavor today" }),
      raw("c", NOW - 3 * HOUR, { message: "A third post today" }),
      // 2026-11-08 23:00 Manila: yesterday
      raw("d", Date.UTC(2026, 10, 8, 15), { message: "Closed today" }),
    ]);
    const sources = { listPosts, now: () => now };
    const posts = await readTodaysPosts(sources);
    expect(posts.map((entry) => entry.id)).toEqual(["a", "b"]);
    await readTodaysPosts(sources);
    expect(listPosts).toHaveBeenCalledTimes(1);
    now += POSTS_TTL_MS;
    await readTodaysPosts(sources);
    expect(listPosts).toHaveBeenCalledTimes(2);
  });

  it("TC-P7-118 — reads the words in a picture once per post, never from a picture off Facebook's servers, and tries again after a failure", async () => {
    let words: string | null = null;
    let now = NOW;
    const readImageText = vi.fn(async () => words);
    const listPosts = async () => [
      raw("pic", NOW - HOUR, { full_picture: PICTURE }),
      raw("off", NOW - HOUR, { full_picture: "https://example.com/x.jpg" }),
    ];
    const sources = { listPosts, readImageText, now: () => now };
    expect(await readTodaysPosts(sources)).toEqual([]);
    expect(readImageText).toHaveBeenCalledTimes(1);
    expect(readImageText).toHaveBeenCalledWith(PICTURE);

    words = "We Open at 1:00 pm today.";
    now += POSTS_TTL_MS;
    const posts = await readTodaysPosts(sources);
    expect(posts).toEqual([
      { id: "pic", time: NOW - HOUR, text: "We Open at 1:00 pm today." },
    ]);
    now += POSTS_TTL_MS;
    await readTodaysPosts(sources);
    expect(readImageText).toHaveBeenCalledTimes(2);
  });

  it("TC-P7-119 — finds an opening time or 'closed today' in a post, in English or Tagalog", () => {
    expect(postedHours([post("We Open at 1:00 pm today.")])).toEqual({
      kind: "opens",
      minutes: 13 * 60,
    });
    expect(postedHours([post("open po kami ngayon at 3pm 🐾")])).toEqual({
      kind: "opens",
      minutes: 15 * 60,
    });
    expect(postedHours([post("Opens today at 10:30 AM")])).toEqual({
      kind: "opens",
      minutes: 10 * 60 + 30,
    });
    expect(postedHours([post("Sorry, we're closed today!")])).toEqual({
      kind: "closed",
    });
    expect(postedHours([post("Sarado po kami ngayon")])).toEqual({
      kind: "closed",
    });
    expect(postedHours([post("New iced latte flavor! 🧋")])).toBeNull();
    expect(postedHours([post("We open tomorrow at 3:00 pm")])).toBeNull();
    expect(postedHours([post("Sarado po kami bukas")])).toBeNull();
    expect(postTime("2026-11-13T02:29:01+0000")).toBe(
      Date.UTC(2026, 10, 13, 2, 29, 1),
    );
    expect(cleanPostText("See https://x.example/a\u0000 now  ".repeat(1))).toBe(
      "See now",
    );
    expect(Array.from(cleanPostText("a".repeat(500)))).toHaveLength(
      MAX_POST_TEXT,
    );
  });

  it("TC-P7-120 — 'are you open?' shows today's post: its later opening time, or the usual status once that time has passed; the closed switch still wins", () => {
    const later = openNowReply(content, NOW, [
      post("We open at 5:00 pm today"),
    ]);
    expect(later.text).toMatch(
      /^⏰ Today we open at 5 PM, as we posted on our Page\./,
    );
    expect(later.text).toContain("📢 Posted today: “We open at 5:00 pm today”");

    const passed = openNowReply(content, NOW, [
      post("We open at 1:00 pm today"),
    ]);
    expect(passed.text).toMatch(/^🟢 Yes, we're open now until 6 PM!/);
    expect(passed.text).toContain("📢 Posted today:");

    const closed = openNowReply(content, NOW, [post("Closed today po")]);
    expect(closed.text).toMatch(/^🚪 Sorry, we're closed today, as we posted/);

    const switched = openNowReply(
      { ...content, closure: { closed: true, note: "" } },
      NOW,
      [post("We open at 5:00 pm today")],
    );
    expect(switched.text).toMatch(/^🚪 Sorry, we're closed today\./);
  });

  it("TC-P7-121 — Gemini's shop facts carry today's posts and the posted status", () => {
    const facts = shopFacts({
      content,
      menu: catalog,
      takeoutBoxPrice: 10,
      now: NOW,
      onlineOrdering: true,
      origin: ORIGIN,
      posts: [post("We open at 5:00 pm today")],
    });
    expect(facts).toContain(
      "Right now: ⏰ Today we open at 5 PM, as we posted on our Page.",
    );
    expect(facts).toContain(
      "Posted today on the shop's Facebook Page (these replace the usual hours for today):\n- We open at 5:00 pm today",
    );
    expect(
      shopFacts({
        content,
        menu: catalog,
        takeoutBoxPrice: 10,
        now: NOW,
        onlineOrdering: true,
        origin: ORIGIN,
      }),
    ).not.toContain("Posted today");
  });

  it("TC-P7-122 — lists the Page's latest posts with the Page token, and logs only the path and status when it can't", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ data: [{ id: "1" }, "odd", null] }), {
          status: 200,
        }),
    );
    const client = createGraphClient("page-token-secret", fetchMock);
    await expect(client.listPosts()).resolves.toEqual([{ id: "1" }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(
      /\/me\/posts\?fields=id%2Ccreated_time%2Cmessage%2Cfull_picture&limit=5$/,
    );
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer page-token-secret",
    );

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    await expect(client.listPosts()).resolves.toBeNull();
    const logged = warn.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).toContain('"path":"/me/posts","status":403');
    expect(logged).not.toContain("page-token-secret");
  });

  it("TC-P7-123 — reads a picture's words with Gemini: NONE is no words, a non-image or off-Facebook link is never sent, a failure is unknown", async () => {
    const gemini = (text: string) =>
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
        { status: 200 },
      );
    const image = () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    const fetchMock = vi.fn<typeof fetch>();
    const read = createPictureReader("gemini-key", {
      fetch: fetchMock,
      models: ["model-a", "model-b"],
    });

    fetchMock
      .mockResolvedValueOnce(image())
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(gemini("We Open at 1:00 pm today."));
    await expect(read(PICTURE)).resolves.toBe("We Open at 1:00 pm today.");
    const body = JSON.parse(String(fetchMock.mock.calls[2]![1]!.body));
    expect(body.contents[0].parts[0].inline_data).toEqual({
      mime_type: "image/jpeg",
      data: "AQID",
    });
    expect(String(fetchMock.mock.calls[2]![0])).toContain("model-b");

    fetchMock
      .mockResolvedValueOnce(image())
      .mockResolvedValueOnce(gemini("NONE"));
    await expect(read(PICTURE)).resolves.toBe("");

    fetchMock.mockResolvedValueOnce(
      new Response("<html>", { headers: { "content-type": "text/html" } }),
    );
    await expect(read(PICTURE)).resolves.toBe("");

    fetchMock.mockClear();
    await expect(read("https://example.com/a.jpg")).resolves.toBe("");
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock
      .mockResolvedValueOnce(image())
      .mockRejectedValue(new Error("offline"));
    await expect(read(PICTURE)).resolves.toBeNull();
  });

  it("TC-P7-124 — a typed 'open po kayo?' answers from today's post, and still answers when the posts can't be read", async () => {
    const sent: string[] = [];
    const deps = {
      origin: ORIGIN,
      now: () => NOW,
      onlineOrdering: () => true,
      readContent: async () => content,
      readMenu: async () => catalog,
      lookupOrder: async () => null,
      lookupMyOrders: async () => [],
      readCustomerName: async () => null,
      readTakeoutBoxPrice: async () => 10,
      newNonce: () => "nonce0000000000a",
      placeOrder: async () => null,
      send: async (_recipient, answer) => {
        sent.push(answer.text);
        return true;
      },
      readTodaysPosts: async () => [post("We open at 5:00 pm today")],
    } satisfies MessengerDeps;
    const message = (mid: string) => ({
      object: "page",
      entry: [
        {
          id: PAGE,
          time: NOW,
          messaging: [
            {
              sender: { id: CUSTOMER },
              recipient: { id: PAGE },
              timestamp: NOW,
              message: { mid, text: "open po kayo today?" },
            },
          ],
        },
      ],
    });
    vi.spyOn(console, "info").mockImplementation(() => {});
    await processWebhook(message("m_posts_1"), deps);
    expect(sent[0]).toMatch(/^⏰ Today we open at 5 PM, as we posted/);

    resetMessengerState();
    await processWebhook(message("m_posts_2"), {
      ...deps,
      readTodaysPosts: async () => {
        throw new Error("Graph down");
      },
    });
    expect(sent[1]).toMatch(/^🟢 Yes, we're open now until 6 PM!/);
  });
});
