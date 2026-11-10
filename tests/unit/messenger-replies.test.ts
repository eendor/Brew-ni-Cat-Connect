import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PAYLOADS,
  readPayload,
  statusPayload,
  typedButton,
} from "@/lib/messenger/intents";
import {
  MAX_GREETING_LENGTH,
  MAX_MENU_TITLE_LENGTH,
  messengerProfile,
} from "@/lib/messenger/profile";
import {
  ASSISTANT_NOTICE,
  BOARD_NOTE,
  categoryReply,
  clip,
  hoursLocationReply,
  howToOrderReply,
  MAIN_BUTTONS,
  MAX_QUICK_REPLIES,
  MAX_QUICK_REPLY_TITLE,
  MAX_TEXT_LENGTH,
  menuReply,
  menuUnavailableReply,
  myOrdersReply,
  orderLimitReply,
  orderLinkNeededReply,
  orderNotFoundReply,
  noOrdersReply,
  orderStatusReply,
  orderUnavailableReply,
  priceText,
  staffReply,
  STATUS_TEXT,
  welcomeReply,
  withNotice,
  type Reply,
} from "@/lib/messenger/replies";
import { formatPrice } from "@/lib/menu/format-price";
import { buildOrderPath } from "@/lib/orders/order-link";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";
import { hoursNotice, hoursSummary } from "@/lib/site-content/format";
import type { MenuCatalog } from "@/types/menu";

import {
  catalog,
  content,
  item,
  order,
  ORIGIN,
  REFERENCE,
  TOKEN,
  variant,
} from "./messenger-fixtures";

const titles = (answer: Reply) => answer.quickReplies.map((q) => q.title);
const payloads = (answer: Reply) => answer.quickReplies.map((q) => q.payload);
const mainTitlesExcept = (...intents: string[]) =>
  MAIN_BUTTONS.filter((button) => !intents.includes(button.intent)).map(
    (button) => button.title,
  );
const linkTitles = (answer: Reply) => (answer.links ?? []).map((l) => l.title);
const characters = (text: string) => Array.from(text).length;

describe("Messenger welcome (FR-059, FR-062)", () => {
  it("TC-P7-008 — the welcome says it's automated and shows the six main buttons", () => {
    const answer = welcomeReply();
    expect(ASSISTANT_NOTICE).toBe(
      "I'm Brew ni Cat's automated assistant, not a person.",
    );
    expect(answer.text).toBe(
      `Hi! 👋 ${ASSISTANT_NOTICE} 🐱\n\nTap a button below to order right here in the chat 🛒, see our menu and prices 📋, our hours and location 🕒, or your order status 📦.\n\nOur staff read this chat too, so you can also type your message. 💬`,
    );
    expect(titles(answer)).toEqual([
      "🛒 Order here",
      "📋 Menu & prices",
      "🕒 Hours & location",
      "❓ How to order",
      "📦 Order status",
      "💬 Talk to staff",
    ]);
    expect(payloads(answer)).toEqual([
      "ORDER_HERE",
      "MENU",
      "HOURS_LOCATION",
      "HOW_TO_ORDER",
      "ORDER_STATUS",
      "TALK_TO_STAFF",
    ]);
    expect(answer.quickReplies.every((q) => q.content_type === "text")).toBe(
      true,
    );
  });
});

describe("Messenger shop facts (FR-059, FR-086)", () => {
  it("TC-P7-009 — hours and location come from the saved content", () => {
    expect(hoursNotice(content.hours)).toBe(
      "Open 10 AM to 6 PM, Monday to Friday, and 12 PM to 5 PM on Sunday. Closed every Saturday. Changes are posted on our page.",
    );
    const answer = hoursLocationReply(content);
    expect(answer.text).toBe(
      [
        `🕒 ${hoursNotice(content.hours)}`,
        "📢 Notice: Closed on June 12 for a holiday.",
        "📍 We're at 1 Sample St, Sample Area, Sample Town, Sample Province 1000, beside the sample park.",
      ].join("\n\n"),
    );
    // The map is a button, not a pasted link (FR-104).
    expect(answer.links).toEqual([
      { title: "📍 Open map", url: "https://maps.example/shop" },
    ]);
    expect(answer.text).not.toContain("https://");
    expect(titles(answer)).toEqual(mainTitlesExcept("hours-location"));
  });

  it("TC-P7-009 — leaves out an empty notice, landmark and map link", () => {
    const answer = hoursLocationReply({
      ...content,
      notice: { text: "  " },
      address: { ...content.address, landmark: "", mapUrl: "" },
    });
    expect(answer.text).toBe(
      [
        `🕒 ${hoursNotice(content.hours)}`,
        "📍 We're at 1 Sample St, Sample Area, Sample Town, Sample Province 1000.",
      ].join("\n\n"),
    );
    expect(answer.links ?? []).toEqual([]);
  });

  it("TC-P7-010 — how to order while Place order is on", () => {
    const answer = howToOrderReply(content, ORIGIN, true);
    expect(answer.text).toBe(
      [
        "How to order from Brew ni Cat: 🐱☕",
        "",
        '1. Tap "🛒 Order here" and share your mobile number 📱',
        "2. Pick your drinks and food with photos 📸, then sizes, flavors and add-ons",
        "3. Choose how you'll pay and when you'll pick up ⏰",
        "4. Check your order and tap Place order. It goes straight to the shop 🎉",
        "5. Check its status here anytime 📦. You pay at the counter when you pick it up (Cash or Maya).",
        "",
        "🏍 For delivery, a local rider such as Rider One or Rider Two can order it for you at the shop. Brew ni Cat doesn't book riders or charge rider fees.",
      ].join("\n"),
    );
    // The website and delivery pages are buttons, never pasted links (FR-104).
    expect(answer.links).toEqual([
      { title: "🌐 Order on website", url: "https://brew.example/menu" },
      { title: "🏍 Delivery info", url: "https://brew.example/contact" },
    ]);
    expect(answer.text).not.toContain("https://");
    expect(titles(answer)).toEqual(mainTitlesExcept("how-to-order"));
  });

  it("TC-P7-010 — how to order while orders go through the chat", () => {
    const answer = howToOrderReply(content, ORIGIN, false);
    expect(answer.text).toContain(
      "\n2. At checkout, prepare your order summary.\n3. Send the summary to the shop here in this chat, and the shop confirms your order. You pay at the counter when you pick it up (Cash or Maya).\n",
    );
    expect(answer.text).not.toContain("Place order");
    expect(linkTitles(answer)).toEqual([
      "🌐 Order on website",
      "🏍 Delivery info",
    ]);
  });

  it("TC-P7-010 — leaves out empty payment methods and riders", () => {
    const answer = howToOrderReply(
      {
        ...content,
        payments: { methods: [], qrCode: null },
        riders: { partners: [] },
      },
      ORIGIN,
      true,
    );
    expect(answer.text).toContain(
      "You pay at the counter when you pick it up.",
    );
    expect(answer.text).toContain(
      "For delivery, a local rider can order it for you at the shop.",
    );
  });

  it("TC-P7-016 — Talk to staff leaves the chat to the staff, with no buttons", () => {
    expect(hoursSummary(content.hours)).toBe(
      "Open Mon–Fri 10 AM – 6 PM and Sun 12 PM – 5 PM. Closed every Saturday.",
    );
    const answer = staffReply(content);
    expect(answer.text).toBe(
      `Okay! 😊 Our staff will reply here in this chat during shop hours. ${hoursSummary(content.hours)}\n\nType your message below. Send "hi" anytime to see the buttons again.`,
    );
    expect(answer.quickReplies).toEqual([]);
    expect(typedButton("hi")).toBe("welcome");
  });
});

describe("Messenger menu (FR-060)", () => {
  it("TC-P7-011 — the menu shows each category with items as a button", () => {
    const answer = menuReply(catalog, ORIGIN);
    expect(answer.text).toBe(
      "😋 What are you craving? Tap a category to see its items, prices and menu board, or tap Order here to order in this chat.",
    );
    expect(answer.links).toEqual([
      { title: "🌐 Full menu", url: "https://brew.example/menu" },
    ]);
    expect(answer.text).not.toContain("https://");
    expect(titles(answer)).toEqual([
      "🛒 Order here",
      "🥤 Cat-Tastic Drinks",
      "🍟 Cat-Tastic Bites",
      ...mainTitlesExcept("menu", "order"),
    ]);
    expect(payloads(answer).slice(0, 3)).toEqual([
      "ORDER_HERE",
      "MENU_CATEGORY:cat_drinks",
      "MENU_CATEGORY:cat_bites",
    ]);
  });

  it("TC-P7-011 — keeps to 13 quick replies with titles of 20 characters", () => {
    const many: MenuCatalog = {
      categories: Array.from({ length: 12 }, (_, i) => ({
        id: `cat_${i}`,
        name: `Category number ${i} with a long name`,
        items: [item(`Item ${i}`, [variant("Regular", 50)])],
      })),
    };
    const answer = menuReply(many, ORIGIN);
    expect(answer.quickReplies).toHaveLength(MAX_QUICK_REPLIES);
    expect(payloads(answer).slice(0, 9)).toEqual([
      "ORDER_HERE",
      ...Array.from({ length: 8 }, (_, i) => `MENU_CATEGORY:cat_${i}`),
    ]);
    expect(titles(answer).slice(9)).toEqual(mainTitlesExcept("menu", "order"));
    expect(titles(answer)[1]).toBe("🍴 Category number…");
    for (const title of titles(answer)) {
      expect(characters(title)).toBeLessThanOrEqual(MAX_QUICK_REPLY_TITLE);
    }
  });

  it("TC-P7-011 — skips a category whose id can't be a button", () => {
    const odd: MenuCatalog = {
      categories: [
        ...catalog.categories,
        {
          id: "has space",
          name: "Odd",
          items: [item("Tea", [variant("Regular", 40)])],
        },
      ],
    };
    expect(titles(menuReply(odd, ORIGIN))).not.toContain("Odd");
  });

  it.each([
    { name: "can't be read", menu: null },
    { name: "has no categories", menu: { categories: [] } },
    {
      name: "has only empty categories",
      menu: {
        categories: [{ id: "cat_seasonal", name: "Seasonal", items: [] }],
      },
    },
  ])("TC-P7-011 — says so when the menu $name, with no price", ({ menu }) => {
    const answer = menuReply(menu, ORIGIN);
    expect(answer).toEqual(menuUnavailableReply(ORIGIN));
    expect(answer.text).toBe(
      "😿 I can't load the menu right now, so I won't guess any prices. You can see it on our website.",
    );
    expect(answer.links).toEqual([
      { title: "🌐 Menu page", url: "https://brew.example/menu" },
    ]);
    expect(answer.text).not.toContain("₱");
    expect(titles(answer)).toEqual(mainTitlesExcept("menu"));
  });

  it("TC-P7-012 — a category lists its items, prices and flavors", () => {
    const answer = categoryReply(catalog, "cat_bites", ORIGIN);
    expect(answer.text).toBe(
      [
        "🍟 Cat-Tastic Bites",
        "• Fries — from ₱45",
        "   Flavors: Cheese and Barbecue",
        `• Snack Combo — Fries + Drink ₱99 · Nachos + Drink ${formatPrice(129.5)} (temporarily unavailable)`,
        "",
        BOARD_NOTE,
        "Ready to order? Tap Order here 🛒",
      ].join("\n"),
    );
    // The shop's menu board comes as a picture, and the website as a button.
    expect(answer.images).toEqual([
      "https://brew.example/images/menu/bites.jpg",
    ]);
    expect(answer.links).toEqual([
      { title: "🌐 Full menu", url: "https://brew.example/menu" },
    ]);
    expect(titles(answer)).toEqual([
      "🛒 Order here",
      "🥤 Cat-Tastic Drinks",
      ...mainTitlesExcept("menu", "order"),
    ]);
    const drinks = categoryReply(catalog, "cat_drinks", ORIGIN);
    expect(drinks.text).toContain(
      "• Iced Latte — 16oz ₱49 · 22oz ₱59\n• Matcha — ₱65\n   Flavors: Strawberry and Mango\n",
    );
    expect(drinks.images).toEqual([
      "https://brew.example/images/menu/drinks.jpg",
      "https://brew.example/images/menu/soda.jpg",
    ]);
  });

  it.each([
    {
      name: "one fixed price",
      entry: item("Matcha", [variant("Regular", 65)]),
      text: "₱65",
    },
    {
      name: "two to four sizes",
      entry: item("Iced Latte", [variant("16oz", 49), variant("22oz", 59)]),
      text: "16oz ₱49 · 22oz ₱59",
    },
    {
      name: "five sizes",
      entry: item(
        "Tea",
        [10, 20, 30, 40, 50].map((size) => variant(`${size}`, size + 30)),
      ),
      text: "from ₱40",
    },
    {
      name: "flavor prices",
      entry: item("Fries", [
        variant("Solo", 0, [
          { flavor: "Cheese", price: 45 },
          { flavor: "Barbecue", price: 49 },
        ]),
      ]),
      text: "from ₱45",
    },
    {
      name: "a fixed size and a size priced by flavor",
      entry: item("Wings", [
        variant("6 pcs", 120),
        variant("12 pcs", null, [{ flavor: "Honey", price: 220 }]),
      ]),
      text: "from ₱120",
    },
    {
      name: "no price",
      entry: item("Seasonal", [variant("Regular", null)]),
      text: null,
    },
  ])("TC-P7-012 — prices an item with $name", ({ entry, text }) => {
    expect(priceText(entry)).toBe(text);
  });

  it("TC-P7-012 — an item without a price shows its name only", () => {
    const menu: MenuCatalog = {
      categories: [
        {
          id: "cat_new",
          name: "New",
          items: [item("Seasonal", [variant("Regular", null)])],
        },
      ],
    };
    expect(categoryReply(menu, "cat_new", ORIGIN).text).toContain(
      "New\n• Seasonal\n\n",
    );
  });

  it("TC-P7-012 — a category that's gone shows the menu again", () => {
    const answer = categoryReply(catalog, "cat_gone", ORIGIN);
    expect(answer.text).toBe(
      `That category isn't on the menu anymore.\n\n${menuReply(catalog, ORIGIN).text}`,
    );
    expect(answer.quickReplies).toEqual(
      menuReply(catalog, ORIGIN).quickReplies,
    );
    expect(categoryReply(catalog, "cat_seasonal", ORIGIN).text).toContain(
      "That category isn't on the menu anymore.",
    );
    expect(categoryReply(null, "cat_drinks", ORIGIN)).toEqual(
      menuUnavailableReply(ORIGIN),
    );
  });

  it("TC-P7-013 — a long category drops the flavor lines to fit one message", () => {
    const flavors = [
      "Cheese",
      "Barbecue",
      "Sour Cream",
      "Garlic Parmesan",
      "Salted Egg",
      "Spicy Buffalo",
      "Honey Butter",
      "Wasabi",
    ];
    const menu: MenuCatalog = {
      categories: [
        {
          id: "cat_long",
          name: "Big Category",
          items: Array.from({ length: 30 }, (_, i) =>
            item(`Item ${i + 1}`, [variant("Regular", 100 + i)], { flavors }),
          ),
        },
      ],
    };
    const answer = categoryReply(menu, "cat_long", ORIGIN);
    expect(answer.text).not.toContain("Flavors:");
    expect(answer.text).toContain("\n• Item 30 — ₱129\n\n");
    expect(answer.text.endsWith("Ready to order? Tap Order here 🛒")).toBe(
      true,
    );
    expect(characters(answer.text)).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });

  it("TC-P7-013 — a very long category is cut short but keeps the menu link", () => {
    const menu: MenuCatalog = {
      categories: [
        {
          id: "cat_huge",
          name: "Huge Category",
          items: Array.from({ length: 120 }, (_, i) =>
            item(`A long menu item name number ${i + 1}`, [
              variant("Regular", 100),
            ]),
          ),
        },
      ],
    };
    const answer = categoryReply(menu, "cat_huge", ORIGIN);
    expect(characters(answer.text)).toBe(MAX_TEXT_LENGTH);
    expect(
      answer.text.startsWith(
        "🍴 Huge Category\n• A long menu item name number 1 — ₱100\n",
      ),
    ).toBe(true);
    expect(answer.text).toContain("…\n\nReady to order? Tap Order here 🛒");
    expect(answer.text.endsWith("Ready to order? Tap Order here 🛒")).toBe(
      true,
    );
    expect(linkTitles(answer)).toEqual(["🌐 Full menu"]);
  });
});

describe("Messenger order status (FR-063)", () => {
  const tracker = readFileSync(
    path.join(process.cwd(), "src/components/orders/order-status-tracker.tsx"),
    "utf8",
  ).replace(/\s+/g, " ");

  it("TC-P7-014 — every status uses the order page's wording", () => {
    expect(Object.keys(STATUS_TEXT).sort()).toEqual([...ORDER_STATUSES].sort());
    for (const status of ORDER_STATUSES) {
      expect(tracker).toContain(`"${STATUS_TEXT[status].label}"`);
      expect(tracker).toContain(STATUS_TEXT[status].detail);
    }
  });

  it.each([
    {
      status: "preparing" as OrderStatus,
      text: "🍳 Order BNC-7K2Q9F: Preparing\nYour drinks and food are being prepared.",
    },
    {
      status: "cancelled" as OrderStatus,
      text: "🚫 Order BNC-7K2Q9F: Cancelled\nThis order has been cancelled. If this was unexpected, please contact the shop counter.",
    },
  ])("TC-P7-014 — shows the $status status", ({ status, text }) => {
    const answer = orderStatusReply(order(status), ORIGIN, TOKEN);
    expect(answer.text).toBe(text);
    // The order page is a button, and Check status asks again in the chat.
    expect(answer.links).toEqual([
      {
        title: "📍 Track order",
        url: `${ORIGIN}${buildOrderPath(REFERENCE, TOKEN)}`,
      },
    ]);
    expect(answer.text).not.toContain("#token=");
    expect(answer.quickReplies[0]).toEqual({
      content_type: "text",
      title: "🔄 Check status",
      payload: statusPayload(REFERENCE, TOKEN),
    });
  });

  it("TC-P7-014 — shows the status only, never the customer's order details", () => {
    for (const status of ORDER_STATUSES) {
      const answer = orderStatusReply(order(status), ORIGIN, TOKEN);
      expect(
        answer.text.includes(
          ` Order ${REFERENCE}: ${STATUS_TEXT[status].label}\n`,
        ),
      ).toBe(true);
      for (const detail of [
        "Test Customer",
        "No ice please",
        "Iced Latte",
        "₱",
      ]) {
        expect(answer.text).not.toContain(detail);
      }
      expect(titles(answer)).toEqual([
        "🔄 Check status",
        ...mainTitlesExcept("order-status"),
      ]);
    }
    expect(
      orderStatusReply(
        { ...order("pending"), status: "lost" as OrderStatus },
        ORIGIN,
        TOKEN,
      ),
    ).toEqual(orderUnavailableReply());
  });

  it("TC-P7-015 — order replies ask for the full link, never the reference alone", () => {
    expect(noOrdersReply().text).toBe(
      "📦 I can't see any orders from this chat yet. Tap Order here to place one 🛒\n\nOrdered on our website instead? Paste its order link here, the one that ends with #token=…",
    );
    expect(orderLinkNeededReply(REFERENCE).text).toBe(
      "🔒 For your privacy, I can only check an order from its full order link, the one that ends with #token=… Paste the link of order BNC-7K2Q9F here, tap Order status to see the orders you placed in this chat, or tap Talk to staff.",
    );
    expect(orderNotFoundReply().text).toBe(
      "🤔 I couldn't find an order for that link. Check that you pasted the whole link, or tap Talk to staff.",
    );
    expect(orderUnavailableReply().text).toBe(
      "😿 I can't check orders right now. Please try again in a few minutes, or tap Talk to staff.",
    );
    expect(orderLimitReply().text).toBe(
      "⏳ That's a lot of order checks. Please wait a few minutes, then try again.",
    );
    for (const answer of [
      noOrdersReply(),
      orderLinkNeededReply(REFERENCE),
      orderNotFoundReply(),
      orderUnavailableReply(),
      orderLimitReply(),
    ]) {
      expect(titles(answer)).toEqual(mainTitlesExcept("order-status"));
    }
  });
});

describe("Messenger notice and limits (FR-062)", () => {
  it("TC-P7-017 — the notice goes first and replies keep to Meta's limits", () => {
    const noticed = withNotice(orderNotFoundReply());
    expect(noticed.text).toBe(
      `${ASSISTANT_NOTICE}\n\n${orderNotFoundReply().text}`,
    );
    expect(noticed.quickReplies).toEqual(orderNotFoundReply().quickReplies);

    expect(clip("ab😀cd", 4)).toBe("ab😀…");
    expect(clip("abc", 3)).toBe("abc");
    expect(characters(clip("a".repeat(MAX_TEXT_LENGTH + 1)))).toBe(
      MAX_TEXT_LENGTH,
    );
    const long = withNotice({
      text: "a".repeat(MAX_TEXT_LENGTH),
      quickReplies: [],
    });
    expect(characters(long.text)).toBe(MAX_TEXT_LENGTH);
    expect(long.text.endsWith("…")).toBe(true);

    const replies = [
      welcomeReply(),
      staffReply(content),
      hoursLocationReply(content),
      howToOrderReply(content, ORIGIN, true),
      howToOrderReply(content, ORIGIN, false),
      menuReply(catalog, ORIGIN),
      menuUnavailableReply(ORIGIN),
      categoryReply(catalog, "cat_drinks", ORIGIN),
      categoryReply(catalog, "cat_bites", ORIGIN),
      orderStatusReply(order("ready"), ORIGIN, TOKEN),
      noOrdersReply(),
      orderLinkNeededReply(REFERENCE),
      orderNotFoundReply(),
      orderUnavailableReply(),
      orderLimitReply(),
    ];
    for (const answer of replies) {
      expect(characters(answer.text)).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
      expect(answer.quickReplies.length).toBeLessThanOrEqual(MAX_QUICK_REPLIES);
      for (const quick of answer.quickReplies) {
        expect(characters(quick.title)).toBeLessThanOrEqual(
          MAX_QUICK_REPLY_TITLE,
        );
        expect(readPayload(quick.payload)).not.toBeNull();
      }
    }
  });

  it("TC-P7-018 — the chat profile has Get Started, a greeting and the main buttons, with no ice breakers", () => {
    const profile = messengerProfile();
    expect(profile.get_started).toEqual({ payload: PAYLOADS.welcome });

    const [greeting] = profile.greeting;
    expect(greeting?.locale).toBe("default");
    expect(greeting?.text).toContain("automated assistant");
    expect(characters(greeting?.text ?? "")).toBeLessThanOrEqual(
      MAX_GREETING_LENGTH,
    );

    const [menu] = profile.persistent_menu;
    expect(menu?.locale).toBe("default");
    expect(menu?.composer_input_disabled).toBe(false);
    expect(menu?.call_to_actions.map((action) => action.title)).toEqual(
      MAIN_BUTTONS.map((button) => button.title),
    );
    for (const [index, action] of (menu?.call_to_actions ?? []).entries()) {
      expect(action.type).toBe("postback");
      expect(characters(action.title)).toBeLessThanOrEqual(
        MAX_MENU_TITLE_LENGTH,
      );
      expect(readPayload(action.payload)).toEqual({
        kind: "intent",
        intent: MAIN_BUTTONS[index]?.intent,
      });
    }
    expect(profile).not.toHaveProperty("ice_breakers");
  });
});

describe("Order status in the chat (FR-110)", () => {
  const placed = (reference: string, status: OrderStatus) => ({
    ...order(status),
    reference,
  });

  it("TC-P7-074 — lists each order with its number, status, items and total, and a Refresh button", () => {
    const reply = myOrdersReply([
      placed("BNC-AAAAAA", "preparing"),
      placed("BNC-BBBBBB", "completed"),
    ]);
    expect(reply.text).toBe(
      [
        "📦 Your orders from this chat",
        "🍳 Order BNC-AAAAAA: Preparing\nYour drinks and food are being prepared.\n🧾 2 × Iced Latte · ₱98",
        "✅ Order BNC-BBBBBB: Completed\nOrder picked up and completed.\n🧾 2 × Iced Latte · ₱98",
        "Tap Refresh to see the latest status. 🔄",
      ].join("\n\n"),
    );
    expect(titles(reply)).toEqual([
      "🔄 Refresh",
      "🛒 Order here",
      ...mainTitlesExcept("order", "order-status"),
    ]);
    expect(payloads(reply)[0]).toBe(PAYLOADS["order-status"]);
    // Everything is answered in the chat: no order page, number or link.
    expect(reply.links ?? []).toEqual([]);
    expect(reply.text).not.toContain("http");
    expect(reply.text).not.toContain("#token");
    expect(payloads(reply).join(" ")).not.toContain("BNC-");
  });

  it("TC-P7-074 — every status has its own wording and picture", () => {
    const text = myOrdersReply(
      ORDER_STATUSES.map((status, index) =>
        placed(`BNC-AAAAA${index + 2}`, status),
      ),
    ).text;
    for (const status of ORDER_STATUSES) {
      expect(text).toContain(STATUS_TEXT[status].label);
    }
    expect(text).toContain("Ready for Pickup");
    expect(text).toContain("Ready for pickup at the counter.");
  });

  it("TC-P7-074 — a rejected order shows the shop's reason, or the order page's usual one", () => {
    const withReason = myOrdersReply([
      {
        ...placed("BNC-AAAAAA", "rejected"),
        rejectionReason: "  We are out of\n matcha today.  ",
      },
    ]).text;
    expect(withReason).toContain(
      "💬 Reason from the shop: We are out of matcha today.",
    );
    const noReason = myOrdersReply([placed("BNC-AAAAAA", "rejected")]).text;
    expect(noReason).toContain(
      "💬 Reason from the shop: Item temporarily out of stock or store at capacity.",
    );
    const long = myOrdersReply([
      { ...placed("BNC-AAAAAA", "rejected"), rejectionReason: "x".repeat(400) },
    ]).text;
    expect(long).toContain(`${"x".repeat(199)}…`);
    // Only a rejected order has a reason.
    expect(
      myOrdersReply([
        {
          ...placed("BNC-AAAAAA", "cancelled"),
          rejectionReason: "Not this one",
        },
      ]).text,
    ).not.toContain("Reason from the shop");
  });

  it("TC-P7-074 — a long order is shortened so the reply stays within Meta's limit", () => {
    const many = {
      ...placed("BNC-AAAAAA", "pending"),
      items: Array.from({ length: 12 }, (_, index) => ({
        ...order("pending").items[0]!,
        itemName: `Specialty Drink Number ${index + 1}`,
        quantity: 3,
      })),
    };
    const reply = myOrdersReply([many, many, many]);
    const line = reply.text.split("\n").find((entry) => entry.startsWith("🧾"));
    expect(line).toMatch(/…( ·|$)/);
    expect(characters(reply.text)).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });

  it("TC-P7-074 — leaves out an order whose status it doesn't know, and says it can't check if none is left", () => {
    const reply = myOrdersReply([
      { ...placed("BNC-AAAAAA", "pending"), status: "lost" as OrderStatus },
      placed("BNC-BBBBBB", "ready"),
    ]);
    expect(reply.text).not.toContain("BNC-AAAAAA");
    expect(reply.text).toContain("BNC-BBBBBB");
    expect(
      myOrdersReply([
        { ...placed("BNC-AAAAAA", "pending"), status: "lost" as OrderStatus },
      ]),
    ).toEqual(orderUnavailableReply());
    expect(myOrdersReply([])).toEqual(orderUnavailableReply());
  });

  it("TC-P7-074 — a customer with no orders is told how to place one, and where website orders go", () => {
    const reply = noOrdersReply();
    expect(reply.text).toContain("I can't see any orders from this chat yet.");
    expect(reply.text).toContain("Tap Order here to place one");
    expect(titles(reply)[0]).toBe("🛒 Order here");
    expect(payloads(reply)).toContain(PAYLOADS.order);
    expect(titles(reply)).not.toContain("📦 Order status");
  });
});
