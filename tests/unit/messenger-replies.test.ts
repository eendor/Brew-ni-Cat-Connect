import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PAYLOADS, readPayload, typedButton } from "@/lib/messenger/intents";
import {
  MAX_GREETING_LENGTH,
  MAX_MENU_TITLE_LENGTH,
  messengerProfile,
} from "@/lib/messenger/profile";
import {
  ASSISTANT_NOTICE,
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
  orderLimitReply,
  orderLinkNeededReply,
  orderNotFoundReply,
  orderStatusPromptReply,
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
  variant,
} from "./messenger-fixtures";

const titles = (answer: Reply) => answer.quickReplies.map((q) => q.title);
const payloads = (answer: Reply) => answer.quickReplies.map((q) => q.payload);
const mainTitlesExcept = (intent?: string) =>
  MAIN_BUTTONS.filter((button) => button.intent !== intent).map(
    (button) => button.title,
  );
const characters = (text: string) => Array.from(text).length;

describe("Messenger welcome (FR-059, FR-062)", () => {
  it("TC-P7-008 — the welcome says it's automated and shows the five main buttons", () => {
    const answer = welcomeReply();
    expect(ASSISTANT_NOTICE).toBe(
      "I'm Brew ni Cat's automated assistant, not a person.",
    );
    expect(answer.text).toBe(
      `Hi! ${ASSISTANT_NOTICE} Tap a button below for our menu and prices, our hours and location, how to order, or your order status.\n\nOur staff read this chat too, so you can also type your message.`,
    );
    expect(titles(answer)).toEqual([
      "Menu & prices",
      "Hours & location",
      "How to order",
      "Order status",
      "Talk to staff",
    ]);
    expect(payloads(answer)).toEqual([
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
        hoursNotice(content.hours),
        "Notice: Closed on June 12 for a holiday.",
        "We're at 1 Sample St, Sample Area, Sample Town, Sample Province 1000, beside the sample park.",
        "Map: https://maps.example/shop",
      ].join("\n\n"),
    );
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
        hoursNotice(content.hours),
        "We're at 1 Sample St, Sample Area, Sample Town, Sample Province 1000.",
      ].join("\n\n"),
    );
  });

  it("TC-P7-010 — how to order while Place order is on", () => {
    const answer = howToOrderReply(content, ORIGIN, true);
    expect(answer.text).toBe(
      [
        "How to order from Brew ni Cat:",
        "1. Pick your drinks and food on our website: https://brew.example/menu",
        "2. At checkout, tap Place order. It goes straight to the shop.",
        "3. Your order page shows its status. You pay at the counter when you pick it up (Cash or Maya).",
        "",
        "For delivery, a local rider such as Rider One or Rider Two can order it for you at the shop. Brew ni Cat doesn't book riders or charge rider fees: https://brew.example/contact",
      ].join("\n"),
    );
    expect(titles(answer)).toEqual(mainTitlesExcept("how-to-order"));
  });

  it("TC-P7-010 — how to order while orders go through the chat", () => {
    const answer = howToOrderReply(content, ORIGIN, false);
    expect(answer.text).toContain(
      "\n2. At checkout, prepare your order summary.\n3. Send the summary to the shop here in this chat, and the shop confirms your order. You pay at the counter when you pick it up (Cash or Maya).\n",
    );
    expect(answer.text).not.toContain("Place order");
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
      `Okay! Our staff will reply here in this chat during shop hours. ${hoursSummary(content.hours)}\n\nType your message below. Send "hi" anytime to see the buttons again.`,
    );
    expect(answer.quickReplies).toEqual([]);
    expect(typedButton("hi")).toBe("welcome");
  });
});

describe("Messenger menu (FR-060)", () => {
  it("TC-P7-011 — the menu shows each category with items as a button", () => {
    const answer = menuReply(catalog, ORIGIN);
    expect(answer.text).toBe(
      "What are you craving? Tap a category to see its items and prices.\n\nFull menu with flavors and add-ons: https://brew.example/menu",
    );
    expect(titles(answer)).toEqual([
      "Cat-Tastic Drinks",
      "Cat-Tastic Bites",
      ...mainTitlesExcept("menu"),
    ]);
    expect(payloads(answer).slice(0, 2)).toEqual([
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
    expect(payloads(answer).slice(0, 9)).toEqual(
      Array.from({ length: 9 }, (_, i) => `MENU_CATEGORY:cat_${i}`),
    );
    expect(titles(answer).slice(9)).toEqual(mainTitlesExcept("menu"));
    expect(titles(answer)[0]).toBe("Category number 0 w…");
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
      "I can't load the menu right now, so I won't guess any prices. See the menu on our website: https://brew.example/menu",
    );
    expect(answer.text).not.toContain("₱");
    expect(titles(answer)).toEqual(mainTitlesExcept("menu"));
  });

  it("TC-P7-012 — a category lists its items, prices and flavors", () => {
    const answer = categoryReply(catalog, "cat_bites", ORIGIN);
    expect(answer.text).toBe(
      [
        "Cat-Tastic Bites",
        "• Fries — from ₱45",
        "   Flavors: Cheese and Barbecue",
        `• Snack Combo — Fries + Drink ₱99 · Nachos + Drink ${formatPrice(129.5)} (temporarily unavailable)`,
        "",
        "Order these on our website: https://brew.example/menu",
      ].join("\n"),
    );
    expect(titles(answer)).toEqual([
      "Cat-Tastic Drinks",
      ...mainTitlesExcept("menu"),
    ]);
    expect(categoryReply(catalog, "cat_drinks", ORIGIN).text).toContain(
      "• Iced Latte — 16oz ₱49 · 22oz ₱59\n• Matcha — ₱65\n   Flavors: Strawberry and Mango\n",
    );
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
    expect(
      answer.text.endsWith(
        "Order these on our website: https://brew.example/menu",
      ),
    ).toBe(true);
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
        "Huge Category\n• A long menu item name number 1 — ₱100\n",
      ),
    ).toBe(true);
    expect(answer.text).toContain(
      "…\n\nOrder these on our website: https://brew.example/menu",
    );
    expect(
      answer.text.endsWith(
        "Order these on our website: https://brew.example/menu",
      ),
    ).toBe(true);
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
      text: "Order BNC-7K2Q9F: Preparing\nYour drinks and food are being prepared.\n\nYour order link shows live updates.",
    },
    {
      status: "cancelled" as OrderStatus,
      text: "Order BNC-7K2Q9F: Cancelled\nThis order has been cancelled. If this was unexpected, please contact the shop counter.\n\nYour order link shows live updates.",
    },
  ])("TC-P7-014 — shows the $status status", ({ status, text }) => {
    expect(orderStatusReply(order(status)).text).toBe(text);
  });

  it("TC-P7-014 — shows the status only, never the customer's order details", () => {
    for (const status of ORDER_STATUSES) {
      const answer = orderStatusReply(order(status));
      expect(
        answer.text.startsWith(
          `Order ${REFERENCE}: ${STATUS_TEXT[status].label}\n`,
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
      expect(titles(answer)).toEqual(mainTitlesExcept("order-status"));
    }
    expect(
      orderStatusReply({ ...order("pending"), status: "lost" as OrderStatus }),
    ).toEqual(orderUnavailableReply());
  });

  it("TC-P7-015 — order replies ask for the full link, never the reference alone", () => {
    expect(orderStatusPromptReply().text).toBe(
      "To check your order, paste your order link here. It's the link of your order page, the one that ends with #token=…\n\nFor your privacy, I can't look up an order from its reference alone.",
    );
    expect(orderLinkNeededReply(REFERENCE).text).toBe(
      "For your privacy, I can only check an order from its full order link, the one that ends with #token=… Paste the link of order BNC-7K2Q9F here, or tap Talk to staff.",
    );
    expect(orderNotFoundReply().text).toBe(
      "I couldn't find an order for that link. Check that you pasted the whole link, or tap Talk to staff.",
    );
    expect(orderUnavailableReply().text).toBe(
      "I can't check orders right now. Open your order link for its latest status, or tap Talk to staff.",
    );
    expect(orderLimitReply().text).toBe(
      "That's a lot of order checks. Please wait a few minutes, then try again.",
    );
    for (const answer of [
      orderStatusPromptReply(),
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
      orderStatusReply(order("ready")),
      orderStatusPromptReply(),
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
