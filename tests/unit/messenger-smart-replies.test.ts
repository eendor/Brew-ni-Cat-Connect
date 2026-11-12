/**
 * Smart replies (ADR-031, added 2026-11-13): "are you open now?", the staff
 * topics read from the Page's chats, and the Gemini client with its checks.
 * Gemini is never called: every test passes its own fetch.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createGeminiAssistant,
  DEFAULT_GEMINI_MODELS,
  maskPersonal,
  resetGeminiRest,
  parseSmartAnswer,
  shopFacts,
  SYSTEM_INSTRUCTION,
} from "@/lib/messenger/assistant";
import { handoffText, handoffTopic } from "@/lib/messenger/handoff";
import { openStatusText, shopClock } from "@/lib/messenger/shop-time";

import { catalog, content, NOW, ORIGIN } from "./messenger-fixtures";

const HOUR = 60 * 60 * 1000;

beforeEach(() => resetGeminiRest());
/** NOW is Monday 9 November 2026, 2:00 PM in Manila. */
const at = (hoursFromNow: number) => NOW + hoursFromNow * HOUR;

describe("Open right now (ADR-031)", () => {
  it("TC-P7-090 — reads the day and time in Manila, not the server's time zone", () => {
    expect(shopClock(NOW)).toEqual({ day: "monday", minutes: 14 * 60 });
    // 11:30 PM UTC on Monday is already 7:30 AM Tuesday in Manila.
    expect(shopClock(Date.UTC(2026, 10, 9, 23, 30))).toEqual({
      day: "tuesday",
      minutes: 7 * 60 + 30,
    });
  });

  it("TC-P7-091 — says open now, opening later, closed for the night, or closed today", () => {
    expect(openStatusText(content, NOW)).toBe(
      "🟢 Yes, we're open now until 6 PM!",
    );
    expect(openStatusText(content, at(-6))).toBe(
      "⏰ We open today at 10 AM until 6 PM.",
    );
    expect(openStatusText(content, at(5))).toBe(
      "🌙 We're closed for today (we close at 6 PM). We open tomorrow at 10 AM.",
    );
    // Saturday is closed; Sunday opens at noon.
    expect(openStatusText(content, at(5 * 24))).toBe(
      "😿 We're closed today (Saturday). We open tomorrow at 12 PM.",
    );
    // Friday night: the next open day is Sunday, not tomorrow.
    expect(openStatusText(content, at(4 * 24 + 6))).toBe(
      "🌙 We're closed for today (we close at 6 PM). We open Sunday at 12 PM.",
    );
  });

  it("TC-P7-092 — the owner's 'closed today' switch wins over the hours", () => {
    const closed = {
      ...content,
      closure: { closed: true, note: "Family emergency." },
    };
    expect(openStatusText(closed, NOW)).toBe(
      "🚪 Sorry, we're closed today. Family emergency. We open tomorrow at 10 AM.",
    );
  });
});

describe("Messages for the staff (ADR-031)", () => {
  it.each([
    ["Store/Restaurant: Brew ni Cat\norder 1: 2 takoyaki", "partner-order"],
    ["M&S rider po, pa order 3 fries", "partner-order"],
    ["order 1 takoyaki\norder 2 fries\norder 3 matcha", "partner-order"],
    ["Hi! We supply ice cubes, interested po kayo?", "offer"],
    ["may yelo po kami, need nyo?", "offer"],
    ["Good day! We'd like to propose a collab", "offer"],
    ["nag ooffer po kami ng ice", "offer"],
    ["pwede po pa reserve for a birthday on Sat?", "bulk-order"],
    ["Hiring po kayo? Part time", "hiring"],
    ["May naiwan po akong payong kahapon", "lost-item"],
    ["nascratch po ako ng cat", "concern"],
  ] as const)("TC-P7-093 — %j is for the staff (%s)", (text, topic) => {
    expect(handoffTopic(text)).toBe(topic);
    expect(handoffText(topic)).toMatch(/(staff|owner)/);
  });

  it.each([
    "open po kayo today?",
    "how much po takoyaki?",
    "may matcha po?",
    "pa order po",
  ])("TC-P7-094 — %j is a normal question, not a staff topic", (text) => {
    expect(handoffTopic(text)).toBeNull();
  });
});

const answer = (value: unknown) =>
  JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  });

const ok = (value: unknown) =>
  new Response(answer(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("Gemini smart replies (ADR-031)", () => {
  it("TC-P7-095 — mobile numbers, emails and long numbers are masked before Gemini", () => {
    expect(
      maskPersonal(
        "call me 0917 123 4567 or +639171234567, me@mail.example, ref 1234-5678-90",
      ),
    ).toBe("call me [mobile number] or [mobile number], [email], ref [number]");
    expect(maskPersonal("2 fries po")).toBe("2 fries po");
  });

  it("TC-P7-096 — the facts carry the open status, address, menu and known answers only", () => {
    const facts = shopFacts({
      content,
      menu: catalog,
      takeoutBoxPrice: 10,
      now: NOW,
      onlineOrdering: true,
      origin: ORIGIN,
    });
    expect(facts).toContain("Right now: 🟢 Yes, we're open now until 6 PM!");
    expect(facts).toContain("1 Sample St");
    expect(facts).toContain("Takeout box: ₱10 each.");
    expect(facts).toContain("Our coffee is cold brew.");
    expect(facts).toContain("🛒 Order here");
    expect(facts).toMatch(/Menu \(today's prices\):\n/);
    expect(
      shopFacts({
        content,
        menu: null,
        takeoutBoxPrice: null,
        now: NOW,
        onlineOrdering: false,
        origin: ORIGIN,
      }),
    ).toContain("hand off price questions");
  });

  it("TC-P7-097 — the instructions hand off partner orders, ice, offers and unknowns, and never say 'AI'", () => {
    for (const topic of [
      "delivery rider",
      "ice order",
      "offers something",
      "facts don't answer",
    ]) {
      expect(SYSTEM_INSTRUCTION).toContain(topic);
    }
    expect(SYSTEM_INSTRUCTION).toContain("Never call yourself a bot, an AI");
    expect(SYSTEM_INSTRUCTION).toContain("auto-reply");
  });

  it("TC-P7-098 — an answer is checked: no links or markdown, known buttons only, at most three", () => {
    expect(
      parseSmartAnswer({
        handoff: false,
        reply: "**Yes po!** See https://evil.example/x for more 😺",
        buttons: ["menu", "menu", "hack", "order", "staff", "hours-location"],
      }),
    ).toEqual({
      handoff: false,
      reply: "Yes po! See  for more 😺",
      buttons: ["menu", "order", "staff"],
    });
    expect(parseSmartAnswer("not json")).toBeNull();
    expect(parseSmartAnswer({ handoff: "no", reply: "x" })).toBeNull();
    expect(parseSmartAnswer({ handoff: false, reply: "   " })).toBeNull();
    expect(
      parseSmartAnswer({ handoff: true, reply: "x".repeat(900) })?.reply,
    ).toHaveLength(600);
  });

  it("TC-P7-099 — tries the next model when one is busy, and sends the key only in a header", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(
        ok({
          handoff: false,
          reply: "Opo, may matcha po! 🍵",
          buttons: ["order"],
        }),
      );
    const ask = createGeminiAssistant("test-key", { fetch: request });
    await expect(ask("facts", "may matcha po? 09171234567")).resolves.toEqual({
      handoff: false,
      reply: "Opo, may matcha po! 🍵",
      buttons: ["order"],
    });
    expect(request).toHaveBeenCalledTimes(2);
    const [firstUrl] = request.mock.calls[0] ?? [];
    const [secondUrl, init] = request.mock.calls[1] ?? [];
    expect(String(firstUrl)).toContain(
      `/${DEFAULT_GEMINI_MODELS[0]}:generateContent`,
    );
    expect(String(secondUrl)).toContain(
      `/${DEFAULT_GEMINI_MODELS[1]}:generateContent`,
    );
    expect(String(secondUrl)).not.toContain("test-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-key",
    );
    const body = String(init?.body);
    expect(body).toContain("[mobile number]");
    expect(body).not.toContain("09171234567");
  });

  it("TC-P7-100 — gives up (null) only when the whole time limit passes without an answer", async () => {
    // Update 2026-11-13: every model is tried, round after round, until one
    // answers or the time limit passes.
    const failing = vi.fn<typeof fetch>().mockRejectedValue(new Error("down"));
    await expect(
      createGeminiAssistant("k", {
        fetch: failing,
        timeoutMs: 60,
        maxPauseMs: 5,
      })("f", "m"),
    ).resolves.toBeNull();
    expect(failing.mock.calls.length).toBeGreaterThan(
      DEFAULT_GEMINI_MODELS.length,
    );

    const slow = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("timeout", "TimeoutError")),
          );
        }),
    );
    await expect(
      createGeminiAssistant("k", {
        fetch: slow,
        timeoutMs: 80,
        attemptMs: 20,
        maxPauseMs: 0,
      })("f", "m"),
    ).resolves.toBeNull();
    // one slow model doesn't use up the whole limit
    expect(slow.mock.calls.length).toBeGreaterThan(1);

    const nonsense = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ candidates: [] })));
    await expect(
      createGeminiAssistant("k", {
        fetch: nonsense,
        models: ["one"],
        timeoutMs: 40,
        maxPauseMs: 5,
      })("f", "m"),
    ).resolves.toBeNull();
  });

  it("TC-P7-108 — keeps going round the models through busy, rate-limited, gone and empty answers until one replies", async () => {
    const answer = {
      handoff: false,
      reply: "Hello po! 😺",
      buttons: ["menu"],
    };
    const replies = [
      new Response("busy", { status: 503 }), // a: busy
      new Response(
        JSON.stringify({
          error: {
            code: 429,
            details: [{ "@type": "RetryInfo", retryDelay: "30s" }],
          },
        }),
        { status: 429 },
      ), // b: free quota used up for 30 s
      new Response("gone", { status: 404 }), // c: no longer offered
      new Response(JSON.stringify({ candidates: [] })), // gemma: empty
      new Response("busy", { status: 503 }), // round 2, a: still busy
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "```json\n" + JSON.stringify(answer) + "\n```" },
                ],
              },
            },
          ],
        }),
      ), // round 2, gemma answers in a fence
    ];
    const request = vi.fn<typeof fetch>(async () => replies.shift()!);
    const ask = createGeminiAssistant("k", {
      fetch: request,
      models: ["a", "b", "c", "gemma-x"],
      maxPauseMs: 1,
    });
    await expect(ask("f", "hi")).resolves.toEqual(answer);
    const asked = request.mock.calls.map(
      ([url]) => String(url).split("/models/")[1]?.split(":")[0],
    );
    // b rests for its retry delay and c for a day, so round 2 skips them
    expect(asked).toEqual(["a", "b", "c", "gemma-x", "a", "gemma-x"]);
    // Gemma gets the instructions in the message, not as a system instruction
    const gemmaBody = JSON.parse(String(request.mock.calls[5]?.[1]?.body));
    expect(gemmaBody.systemInstruction).toBeUndefined();
    expect(gemmaBody.contents[0].parts[0].text).toContain("JSON object");
    const geminiBody = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(geminiBody.generationConfig.responseMimeType).toBe(
      "application/json",
    );

    // The next message skips the resting models too.
    const next = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(answer) }] } },
            ],
          }),
        ),
    );
    await createGeminiAssistant("k", {
      fetch: next,
      models: ["b", "c", "a"],
    })("f", "hi");
    expect(String(next.mock.calls[0]?.[0])).toContain("/a:generateContent");
  });
});
