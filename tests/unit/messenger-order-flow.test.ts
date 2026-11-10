import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  answerOrderTap,
  beginOrder,
  orderIntentReply,
  PLACE_ORDER_LIMIT,
  resetOrderFlow,
  type OrderFacts,
  type OrderFlowDeps,
} from "@/lib/messenger/order-flow";
import {
  decodeOrderPayload,
  encodeOrderPayload,
  MAX_PAYLOAD_LENGTH,
  newOrder,
  type OrderState,
} from "@/lib/messenger/order-state";
import {
  expiredLead,
  FALLBACK_NAME,
  fullLead,
  orderPausedReply,
  phoneAskReply,
  phoneRetryReply,
  placeFailedReply,
  placeLimitReply,
} from "@/lib/messenger/ordering";
import { PAYLOADS } from "@/lib/messenger/intents";
import { menuUnavailableReply, type Reply } from "@/lib/messenger/replies";
import type { PlaceOrderResult } from "@/lib/orders/types";
import { encodeLineFlavor, joinFlavorMix } from "@/lib/ordering/cart-pricing";
import type { MenuCatalog } from "@/types/menu";

import {
  catalog as rawCatalog,
  content,
  CUSTOMER,
  NOW,
  ORIGIN,
  variant,
} from "./messenger-fixtures";

const PHONE = "09171234567";
const NONCE = "nonce0000000000a";
const MINUTE = 60_000;
const REFERENCE = "BNC-7K2Q9F";

// Real menu IDs are letters, digits, "_" and "-", so the shop's test menu
// gets the same.
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const tidy = (menu: MenuCatalog): MenuCatalog => ({
  categories: menu.categories.map((category) => ({
    ...category,
    items: category.items.map((entry) => ({
      ...entry,
      id: slug(entry.id),
      variants: entry.variants.map((size) => ({ ...size, id: slug(size.id) })),
    })),
  })),
});

const menu: MenuCatalog = tidy({
  categories: rawCatalog.categories.map((category) =>
    category.id === "cat_bites"
      ? {
          ...category,
          items: category.items.map((entry) =>
            entry.name === "Fries"
              ? {
                  ...entry,
                  addOns: [
                    { id: "add_egg", label: "Egg", price: 15 },
                    { id: "add_cheese", label: "Extra Cheese", price: 10 },
                  ],
                }
              : entry.name === "Snack Combo"
                ? {
                    ...entry,
                    availability: "available" as const,
                    variants: [
                      {
                        ...variant("Fries+Drink", 99),
                        description: "Fries (any flavor) and a drink",
                      },
                    ],
                  }
                : entry,
          ),
        }
      : category,
  ),
});

const succeeded: PlaceOrderResult = {
  ok: true,
  reference: REFERENCE,
  trackingToken: "t".repeat(43),
  status: "pending",
  createdAt: "2026-11-09T06:00:00.000Z",
};

const refused = (
  extra: Record<string, unknown>,
  reason = "server-error",
  message = "Please try again.",
) => ({ ok: false, reason, message, ...extra }) as unknown as PlaceOrderResult;

function setup(over: Partial<OrderFlowDeps> = {}, menuOver = menu) {
  const deps: OrderFlowDeps = {
    origin: ORIGIN,
    now: () => NOW,
    onlineOrdering: () => true,
    readCustomerName: vi.fn(async () => "Maria Santos"),
    readTakeoutBoxPrice: vi.fn(async () => 10),
    newNonce: () => NONCE,
    placeOrder: vi.fn(async () => succeeded),
    ...over,
  };
  const facts: OrderFacts = {
    content: async () => content,
    menu: async () => menuOver,
  };
  return { deps, facts };
}

/** The payload of the button, card button or link with this title. */
function payloadOf(reply: Reply, title: string): string {
  const buttons = [
    ...reply.quickReplies.map((entry) => ({
      title: entry.title,
      payload: entry.payload,
    })),
    ...(reply.cards ?? []).flatMap((card) =>
      card.buttons.flatMap((button) =>
        button.type === "postback"
          ? [
              {
                title: `${card.title} › ${button.title}`,
                payload: button.payload,
              },
            ]
          : [],
      ),
    ),
  ];
  const found = buttons.find((entry) => entry.title === title);
  if (!found) {
    throw new Error(
      `No "${title}" in: ${buttons.map((entry) => entry.title).join(", ")}`,
    );
  }
  return found.payload;
}

async function press(
  reply: Reply,
  title: string,
  ctx: ReturnType<typeof setup>,
  sender = CUSTOMER,
): Promise<Reply> {
  const tap = decodeOrderPayload(payloadOf(reply, title));
  if (!tap) throw new Error(`"${title}" is not an order button`);
  return answerOrderTap(sender, tap, ctx.deps, ctx.facts);
}

const titles = (reply: Reply) => reply.quickReplies.map((entry) => entry.title);

/** Orders one 16oz Iced Latte and stops on the summary. */
async function toSummary(ctx: ReturnType<typeof setup>) {
  const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
  const drinks = await press(
    categories,
    "🥤 Cat-Tastic Drinks › 👀 See items",
    ctx,
  );
  const sizes = await press(drinks, "Iced Latte › 🛒 Order", ctx);
  const howMany = await press(sizes, titles(sizes)[0] ?? "", ctx);
  const cart = await press(howMany, "1", ctx);
  const payment = await press(cart, "✅ Checkout", ctx);
  const when = await press(payment, "💵 Cash", ctx);
  return press(when, "⚡ ASAP", ctx);
}

beforeEach(() => {
  resetOrderFlow();
});

describe("Starting an order in Messenger (FR-100, FR-101)", () => {
  it("TC-P7-064 — Order here asks for the phone number, or says ordering is paused", () => {
    expect(orderIntentReply(setup().deps)).toEqual(phoneAskReply());
    expect(orderIntentReply(setup().deps).askPhone).toBe(true);
    expect(
      orderIntentReply(setup({ onlineOrdering: () => false }).deps),
    ).toEqual(orderPausedReply());
  });

  it("TC-P7-064 — a number we can't use asks again; a paused shop and an unreadable menu are told so", async () => {
    const ctx = setup();
    await expect(beginOrder(null, ctx.deps, ctx.facts)).resolves.toEqual(
      phoneRetryReply(),
    );
    await expect(
      beginOrder(PHONE, setup({ onlineOrdering: () => false }).deps, ctx.facts),
    ).resolves.toEqual(orderPausedReply());
    await expect(
      beginOrder(PHONE, ctx.deps, { ...ctx.facts, menu: async () => null }),
    ).resolves.toEqual(menuUnavailableReply(ORIGIN));
  });

  it("TC-P7-064 — shows each category with a picture, leaving out one with nothing to order", async () => {
    const ctx = setup();
    const reply = await beginOrder(PHONE, ctx.deps, ctx.facts);
    expect(reply.cards?.map((card) => card.title)).toEqual([
      "🥤 Cat-Tastic Drinks",
      "🍟 Cat-Tastic Bites",
    ]);
    expect(reply.cards?.[0]?.subtitle).toBe("2 items · from ₱49");
    for (const card of reply.cards ?? []) {
      expect(card.imageUrl).toMatch(/^https:\/\/brew\.example\/images\//);
    }
    expect(titles(reply)).toEqual(["❌ Cancel order"]);
    // The phone number rides in every button, so nothing is kept on a server.
    const tap = decodeOrderPayload(
      payloadOf(reply, "🥤 Cat-Tastic Drinks › 👀 See items"),
    );
    expect(tap).toMatchObject({
      op: "cat",
      state: { phone: PHONE, lines: [] },
      args: ["cat_drinks"],
    });
  });
});

describe("Browsing the menu in the chat (FR-102, FR-103, FR-105)", () => {
  it("TC-P7-065 — a category shows its items with pictures and prices, and the old-board note", async () => {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const drinks = await press(
      categories,
      "🥤 Cat-Tastic Drinks › 👀 See items",
      ctx,
    );
    expect(drinks.text).toContain("🥤 Cat-Tastic Drinks");
    expect(drinks.text).toContain(
      "The menu board pictures may show older prices. The prices in this chat are today's.",
    );
    expect(drinks.images).toEqual([
      `${ORIGIN}/images/menu/drinks.jpg`,
      `${ORIGIN}/images/menu/soda.jpg`,
    ]);
    expect(drinks.cards?.map((card) => [card.title, card.subtitle])).toEqual([
      ["Iced Latte", "16oz ₱49 · 22oz ₱59"],
      ["Matcha", "₱65"],
    ]);
    // The photo is the item's own, or a placeholder; never missing.
    for (const card of drinks.cards ?? []) expect(card.imageUrl).toBeTruthy();
    expect(titles(drinks)).toEqual(["🔙 Categories"]);
  });

  it("TC-P7-065 — an item with sizes asks which one; an item with a single size goes straight on", async () => {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const drinks = await press(
      categories,
      "🥤 Cat-Tastic Drinks › 👀 See items",
      ctx,
    );
    const sizes = await press(drinks, "Iced Latte › 🛒 Order", ctx);
    expect(sizes.text).toContain("Which one would you like?");
    expect(titles(sizes)).toEqual(["16oz ₱49", "22oz ₱59", "🔙 Back"]);

    const flavor = await press(drinks, "Matcha › 🛒 Order", ctx);
    expect(flavor.text).toContain("Pick a flavor:");
    expect(titles(flavor)).toEqual(["Strawberry", "Mango", "🔙 Back"]);
  });

  it("TC-P7-065 — numbers long flavor names instead of cutting them off, with no No flavor choice", async () => {
    const long: Record<string, string> = {
      Strawberry: "Strawberry Whiskers Swirl",
      Mango: "Mango Meow Paradise Cream",
    };
    const rename = (flavor: string) => long[flavor] ?? flavor;
    const longMenu: MenuCatalog = {
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.map((entry) =>
          entry.name === "Matcha"
            ? {
                ...entry,
                flavors: entry.flavors.map(rename),
                variants: entry.variants.map((size) => ({
                  ...size,
                  flavorPrices: size.flavorPrices.map((row) => ({
                    ...row,
                    flavor: rename(row.flavor),
                  })),
                })),
              }
            : entry,
        ),
      })),
    };
    const ctx = setup({}, longMenu);
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const drinks = await press(
      categories,
      "🥤 Cat-Tastic Drinks › 👀 See items",
      ctx,
    );
    const flavor = await press(drinks, "Matcha › 🛒 Order", ctx);
    expect(flavor.text).toContain("1. Strawberry Whiskers Swirl");
    expect(flavor.text).toContain("2. Mango Meow Paradise Cream");
    expect(flavor.text).toContain("Tap its number below.");
    expect(titles(flavor)).toEqual(["1", "2", "🔙 Back"]);
    for (const title of titles(flavor)) expect(title).not.toContain("…");

    const picked = await press(flavor, "2", ctx);
    expect(picked.text).toContain("Flavor: Mango Meow Paradise Cream");
    expect(titles(picked)).toContain("🔙 Back");
  });

  it("TC-P7-065 — spells out a combo's contents on its card, with its price", async () => {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const bites = await press(
      categories,
      "🍟 Cat-Tastic Bites › 👀 See items",
      ctx,
    );
    const combo = bites.cards?.find((card) => card.title === "Snack Combo");
    expect(combo?.subtitle).toContain("₱99");
    const cards = JSON.stringify(bites.cards);
    expect(cards).toContain("Fries");
  });

  it.each([
    ["an item that is not on the menu", ["item", "i-does-not-exist"]],
    ["an item with a bad ID", ["item", "no good id"]],
    ["a category that is not on the menu", ["cat", "cat_gone"]],
    ["a category with nothing to order", ["cat", "cat_seasonal"]],
  ] as const)(
    "TC-P7-065 — %s is answered with the categories again",
    async (_name, [op, id]) => {
      const ctx = setup();
      const payload = encodeOrderPayload(op, newOrder(PHONE), [id]);
      const reply = await answerOrderTap(
        CUSTOMER,
        decodeOrderPayload(payload)!,
        ctx.deps,
        ctx.facts,
      );
      expect(reply.text).toContain("That one isn't on the menu right now");
      expect(reply.cards).toHaveLength(2);
    },
  );

  it("TC-P7-065 — says so when the live menu can't be read, and pauses with the website's switch", async () => {
    const tap = decodeOrderPayload(
      encodeOrderPayload("cats", newOrder(PHONE)),
    )!;
    const ctx = setup();
    await expect(
      answerOrderTap(CUSTOMER, tap, ctx.deps, {
        ...ctx.facts,
        menu: async () => null,
      }),
    ).resolves.toEqual(menuUnavailableReply(ORIGIN));
    await expect(
      answerOrderTap(
        CUSTOMER,
        tap,
        setup({ onlineOrdering: () => false }).deps,
        ctx.facts,
      ),
    ).resolves.toEqual(orderPausedReply());
  });

  it("TC-P7-065 — Cancel order clears it without asking the menu or the shop", async () => {
    const tap = decodeOrderPayload(
      encodeOrderPayload("clear", newOrder(PHONE)),
    )!;
    const ctx = setup();
    const menuSpy = vi.fn(async () => null);
    const reply = await answerOrderTap(CUSTOMER, tap, ctx.deps, {
      ...ctx.facts,
      menu: menuSpy,
    });
    expect(reply.text).toContain("Nothing was sent to the shop");
    expect(menuSpy).not.toHaveBeenCalled();
    expect(ctx.deps.placeOrder).not.toHaveBeenCalled();
  });
});

describe("Choosing flavors and extras (FR-102)", () => {
  async function friesChoices() {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const bites = await press(
      categories,
      "🍟 Cat-Tastic Bites › 👀 See items",
      ctx,
    );
    const flavors = await press(bites, "Fries › 🛒 Order", ctx);
    return { ctx, flavors };
  }

  it("TC-P7-066 — fries offer up to three flavors with their prices, then extras, then how many", async () => {
    const { ctx, flavors } = await friesChoices();
    expect(flavors.text).toContain("Pick a flavor:");
    expect(titles(flavors)).toEqual(["Cheese ₱45", "Barbecue ₱49", "🔙 Back"]);

    const more = await press(flavors, "Cheese ₱45", ctx);
    expect(more.text).toContain("Flavor: Cheese");
    expect(more.text).toContain("Add another flavor (up to 3), or continue.");
    expect(titles(more)).toEqual(["Barbecue ₱49", "✅ Continue", "🔙 Back"]);

    const extras = await press(more, "✅ Continue", ctx);
    expect(extras.text).toContain("Want any extras?");
    expect(titles(extras)).toEqual([
      "Egg ₱15",
      "Extra Cheese ₱10",
      "No extras",
      "🔙 Back",
    ]);

    const withEgg = await press(extras, "Egg ₱15", ctx);
    expect(withEgg.text).toContain("Add-ons: Egg");
    expect(titles(withEgg)).toEqual(["Extra Cheese ₱10", "✅ Done", "🔙 Back"]);

    const quantity = await press(withEgg, "✅ Done", ctx);
    expect(quantity.text).toContain("Flavor: Cheese\nAdd-ons: Egg");
    expect(quantity.text).toContain("₱60 each. How many would you like?");
    expect(titles(quantity)).toEqual([
      ...Array.from({ length: 9 }, (_, index) => String(index + 1)),
      "🔙 Back",
    ]);
  });

  it("TC-P7-066 — the price of a chosen line is the live menu's, flavor and extras included", async () => {
    const { ctx, flavors } = await friesChoices();
    const mixed = await press(
      await press(flavors, "Barbecue ₱49", ctx),
      "✅ Continue",
      ctx,
    );
    const withExtras = await press(
      await press(mixed, "Extra Cheese ₱10", ctx),
      "✅ Done",
      ctx,
    );
    const cart = await press(withExtras, "2", ctx);
    expect(cart.text).toContain("✅ Added 2 × Fries to your order!");
    expect(cart.text).toContain(
      "1. 2 × Fries – Barbecue + Extra Cheese — ₱118",
    );
    expect(cart.text).toContain("Subtotal: ₱118");
  });

  it.each([
    ["a flavor the item doesn't have", [["Durian"], []]],
    ["the same flavor twice", [["Cheese", "Cheese"], []]],
    ["more than three flavors", [["Cheese", "Barbecue", "A", "B"], []]],
    ["an extra the item doesn't offer", [["Cheese"], ["Gold"]]],
    ["the same extra twice", [["Cheese"], ["Egg", "Egg"]]],
  ] as const)("TC-P7-066 — refuses %s", async (_name, [flavors, addOns]) => {
    const ctx = setup();
    const payload = encodeOrderPayload("qty", newOrder(PHONE), [
      "i-fries",
      "v-solo",
      flavors,
      addOns,
      1,
    ]);
    const reply = await answerOrderTap(
      CUSTOMER,
      decodeOrderPayload(payload)!,
      ctx.deps,
      ctx.facts,
    );
    expect(reply.text).toContain("That one isn't on the menu right now");
  });

  it("TC-P7-066 — an item that needs a flavor can't be added without one", async () => {
    const ctx = setup();
    const payload = encodeOrderPayload("qty", newOrder(PHONE), [
      "i-fries",
      "v-solo",
      [],
      [],
      1,
    ]);
    const reply = await answerOrderTap(
      CUSTOMER,
      decodeOrderPayload(payload)!,
      ctx.deps,
      ctx.facts,
    );
    expect(reply.text).toContain("That one isn't on the menu right now");
  });
});

describe("The order so far (FR-102)", () => {
  async function withLatte(quantity: string) {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const drinks = await press(
      categories,
      "🥤 Cat-Tastic Drinks › 👀 See items",
      ctx,
    );
    const sizes = await press(drinks, "Iced Latte › 🛒 Order", ctx);
    const howMany = await press(sizes, "22oz ₱59", ctx);
    return { ctx, cart: await press(howMany, quantity, ctx) };
  }

  it("TC-P7-067 — adding shows the order with its subtotal and the buttons to go on", async () => {
    const { cart } = await withLatte("3");
    expect(cart.text).toBe(
      "✅ Added 3 × Iced Latte to your order!\n\n🧺 Your order\n1. 3 × Iced Latte (22oz) — ₱177\n\nSubtotal: ₱177",
    );
    expect(titles(cart)).toEqual([
      "✅ Checkout",
      "➕ Add more",
      "❌ Remove item",
      "🧹 Clear order",
    ]);
  });

  it("TC-P7-067 — removing an item shows what is left, and the order can be emptied", async () => {
    const { ctx, cart } = await withLatte("2");
    const ask = await press(cart, "❌ Remove item", ctx);
    expect(ask.text).toContain("Iced Latte (22oz)");
    const left = await press(ask, titles(ask)[0] ?? "", ctx);
    expect(left.text).toContain("🗑 Removed from your order.");
    expect(left.text).not.toContain("Iced Latte (22oz) —");
    expect(titles(left)).not.toContain("✅ Checkout");
  });

  it("TC-P7-067 — an item the menu no longer sells is taken out, and the customer is told", async () => {
    const { cart } = await withLatte("1");
    const tap = decodeOrderPayload(payloadOf(cart, "✅ Checkout"))!;
    const soldOut: MenuCatalog = {
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.map((entry) =>
          entry.name === "Iced Latte"
            ? { ...entry, availability: "unavailable" as const }
            : entry,
        ),
      })),
    };
    const ctx = setup({}, soldOut);
    const reply = await answerOrderTap(CUSTOMER, tap, ctx.deps, ctx.facts);
    expect(reply.text).toContain(
      "Not available anymore, so I took it out of your order: Iced Latte.",
    );
    expect(titles(reply)).not.toContain("✅ Checkout");

    // An item deleted from the menu has no name left to show.
    const deleted: MenuCatalog = {
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.filter((entry) => entry.name !== "Iced Latte"),
      })),
    };
    const other = setup({}, deleted);
    const gone = await answerOrderTap(CUSTOMER, tap, other.deps, other.facts);
    expect(gone.text).toContain(
      "Not available anymore, so I took it out of your order: An item.",
    );
  });

  it("TC-P7-067 — a cart with 12 different items says to check out first, but still takes more of one it has", async () => {
    const ctx = setup();
    const fries = (flavors: string[], addOns: string[]) =>
      encodeLineFlavor(joinFlavorMix(flavors), addOns);
    const line = (
      itemId: string,
      variantId: string,
      flavor: string | null,
    ) => ({
      itemId,
      variantId,
      flavor,
      quantity: 1,
    });
    const full: OrderState = {
      ...newOrder(PHONE),
      lines: [
        line("i-iced-latte", "v-16oz", null),
        line("i-iced-latte", "v-22oz", null),
        line("i-matcha", "v-regular", "Strawberry"),
        line("i-matcha", "v-regular", "Mango"),
        line("i-matcha", "v-regular", null),
        line("i-fries", "v-solo", fries(["Cheese"], [])),
        line("i-fries", "v-solo", fries(["Barbecue"], [])),
        line("i-fries", "v-solo", fries(["Cheese", "Barbecue"], [])),
        line("i-fries", "v-solo", fries(["Cheese"], ["Egg"])),
        line("i-fries", "v-solo", fries(["Barbecue"], ["Egg"])),
        line("i-fries", "v-solo", fries(["Cheese"], ["Extra Cheese"])),
        line("i-fries", "v-solo", fries(["Barbecue"], ["Extra Cheese"])),
      ],
    };
    const add = (args: unknown[]) =>
      answerOrderTap(
        CUSTOMER,
        decodeOrderPayload(encodeOrderPayload("qty", full, args))!,
        ctx.deps,
        ctx.facts,
      );

    const refusedMore = await add([
      "i-fries",
      "v-solo",
      ["Cheese"],
      ["Egg", "Extra Cheese"],
      1,
    ]);
    expect(refusedMore.text.startsWith(fullLead)).toBe(true);
    expect(refusedMore.text).toContain("12. 1 × Fries");

    const more = await add(["i-iced-latte", "v-16oz", [], [], 2]);
    expect(more.text).toContain("✅ Added 2 × Iced Latte to your order!");
    expect(more.text).toContain("1. 3 × Iced Latte (16oz) — ₱147");
  });
});

describe("Checking the order before placing it (FR-102, FR-106, FR-108)", () => {
  it("TC-P7-068 — the summary shows the name, number, items, total, payment, pickup, hours and notice", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    expect(summary.text).toBe(
      [
        "📝 Please check your order",
        "👤 Maria Santos\n📱 09171234567",
        "1. 1 × Iced Latte (16oz) — ₱49",
        "Subtotal: ₱49\n💳 Pay ₱49 via Cash at the counter. The ₱10 takeout box is not included in that amount.\n⏰ Pickup: as soon as possible",
        "🕒 Open Mon–Fri 10 AM – 6 PM and Sun 12 PM – 5 PM. Closed every Saturday.",
        "📢 Notice: Closed on June 12 for a holiday.",
        "Tap Place order to send it to the shop. 🛍",
      ].join("\n\n"),
    );
    expect(titles(summary)).toEqual([
      "✅ Place order",
      "📝 Edit order",
      "❌ Cancel order",
    ]);
  });

  it("TC-P7-068 — the summary carries a fresh number and the minute it was shown, for Place order", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    const tap = decodeOrderPayload(payloadOf(summary, "✅ Place order"))!;
    expect(tap.op).toBe("place");
    expect(tap.state).toMatchObject({
      phone: PHONE,
      payment: "Cash",
      pickup: "asap",
      nonce: NONCE,
      reviewedAt: Math.floor(NOW / MINUTE),
    });
  });

  it("TC-P7-068 — GCash and a later pickup are carried to the summary", async () => {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const drinks = await press(
      categories,
      "🥤 Cat-Tastic Drinks › 👀 See items",
      ctx,
    );
    const sizes = await press(drinks, "Iced Latte › 🛒 Order", ctx);
    const cart = await press(await press(sizes, "22oz ₱59", ctx), "2", ctx);
    const payment = await press(cart, "✅ Checkout", ctx);
    expect(titles(payment)).toEqual(["💵 Cash", "📲 GCash", "🔙 Back"]);
    const when = await press(payment, "📲 GCash", ctx);
    expect(titles(when)).toEqual([
      "⚡ ASAP",
      "🕐 In 30 minutes",
      "🕑 In 1 hour",
    ]);
    for (const title of titles(when)) {
      expect(title.length).toBeLessThanOrEqual(20);
    }
    const summary = await press(when, "🕑 In 1 hour", ctx);
    expect(summary.text).toContain("Pay ₱118 via GCash at the counter");
    expect(summary.text).toContain("⏰ Pickup: in about 1 hour");
  });

  it("TC-P7-068 — uses the fallback name when Messenger gives none, and survives the lookups failing", async () => {
    const none = setup({ readCustomerName: vi.fn(async () => null) });
    expect((await toSummary(none)).text).toContain(`👤 ${FALLBACK_NAME}`);
    const broken = setup({
      readCustomerName: vi.fn(async () => {
        throw new Error("down");
      }),
      readTakeoutBoxPrice: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    const text = (await toSummary(broken)).text;
    expect(text).toContain(`👤 ${FALLBACK_NAME}`);
    expect(text).toContain("Tap Place order to send it to the shop.");
  });

  it('TC-P7-068 — a combo with an "Any flavor" choice tells the customer staff will ask', async () => {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const bites = await press(
      categories,
      "🍟 Cat-Tastic Bites › 👀 See items",
      ctx,
    );
    const combo = await press(bites, "Snack Combo › 🛒 Order", ctx);
    const cart = await press(combo, "1", ctx);
    const payment = await press(cart, "✅ Checkout", ctx);
    const when = await press(payment, "💵 Cash", ctx);
    const summary = await press(when, "⚡ ASAP", ctx);
    expect(summary.text).toContain(
      '💬 Staff will ask you here for the "Any flavor" choices in your combo.',
    );
  });

  it.each([
    ["Checkout with an empty cart", "pay", []],
    ["a payment with an empty cart", "paid", ["Cash"]],
    ["a pickup without a payment", "when", ["asap"]],
    ["a payment nobody offers", "paid", ["Bitcoin"]],
    ["a pickup nobody offers", "when", ["yesterday"]],
  ] as const)(
    "TC-P7-068 — %s does not reach the summary",
    async (_name, op, args) => {
      const ctx = setup();
      const reply = await answerOrderTap(
        CUSTOMER,
        decodeOrderPayload(encodeOrderPayload(op, newOrder(PHONE), args))!,
        ctx.deps,
        ctx.facts,
      );
      expect(reply.text).not.toContain("Please check your order");
      expect(ctx.deps.placeOrder).not.toHaveBeenCalled();
    },
  );
});

describe("Placing the order (FR-100, FR-107, FR-108)", () => {
  it("TC-P7-069 — sends the order to the shop's order function and confirms it in the chat", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    const placed = await press(summary, "✅ Place order", ctx);

    expect(ctx.deps.placeOrder).toHaveBeenCalledTimes(1);
    expect(ctx.deps.placeOrder).toHaveBeenCalledWith(CUSTOMER, NONCE, {
      customer: {
        name: "Maria Santos",
        phone: PHONE,
        notes: "Messenger order. Pickup: as soon as possible.",
        paymentPreference: "Cash",
      },
      lines: [
        {
          itemId: "i-iced-latte",
          variantId: "v-16oz",
          flavor: null,
          quantity: 1,
        },
      ],
      expectedSubtotal: 49,
    });
    expect(placed.text).toBe(
      [
        "🎉 Order placed! The shop got it just now.",
        `Your order number is ${REFERENCE}. 🧾`,
        "Staff will confirm it during shop hours. You pay at the counter when you pick it up. 💳",
        "Tap Order status anytime to see how it's going. 📦",
      ].join("\n\n"),
    );
    // Status is handled in the chat: no order page, link or token (FR-110).
    expect(placed.links ?? []).toEqual([]);
    expect(JSON.stringify(placed)).not.toContain("http");
    expect(JSON.stringify(placed)).not.toContain("#token");
    expect(placed.quickReplies[0]).toMatchObject({
      title: "📦 Order status",
      payload: PAYLOADS["order-status"],
    });
  });

  it("TC-P7-069 — the shop's staff read where the order came from, and the combo's open choice", async () => {
    const ctx = setup();
    const categories = await beginOrder(PHONE, ctx.deps, ctx.facts);
    const bites = await press(
      categories,
      "🍟 Cat-Tastic Bites › 👀 See items",
      ctx,
    );
    const cart = await press(
      await press(bites, "Snack Combo › 🛒 Order", ctx),
      "1",
      ctx,
    );
    const when = await press(
      await press(await press(cart, "✅ Checkout", ctx), "📲 GCash", ctx),
      "🕐 In 30 minutes",
      ctx,
    );
    const placed = await press(when, "✅ Place order", ctx);
    const [, , input] = vi.mocked(ctx.deps.placeOrder).mock.calls[0] ?? [];
    expect(input?.customer.notes).toBe(
      'Messenger order. Pickup: in about 30 minutes. Ask the customer in Messenger for the combo\'s "Any flavor" choices.',
    );
    expect(input?.customer.paymentPreference).toBe("GCash");
    expect(placed.text).toContain(
      '💬 We\'ll ask you here for your "Any flavor" choices.',
    );
  });

  it("TC-P7-069 — the price sent is the live menu's, not the one a button was carrying", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    const dearer: MenuCatalog = {
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.map((entry) =>
          entry.name === "Iced Latte"
            ? {
                ...entry,
                variants: entry.variants.map((size) => ({
                  ...size,
                  basePrice: 55,
                })),
              }
            : entry,
        ),
      })),
    };
    const later = setup({ placeOrder: ctx.deps.placeOrder }, dearer);
    await press(summary, "✅ Place order", later);
    expect(vi.mocked(ctx.deps.placeOrder).mock.calls[0]?.[2]).toMatchObject({
      expectedSubtotal: 55,
    });
  });

  it("TC-P7-070 — a summary older than an hour is shown again, not placed", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    const late = setup({
      now: () => NOW + 61 * MINUTE,
      newNonce: () => "nonce0000000000b",
      placeOrder: ctx.deps.placeOrder,
    });
    const again = await press(summary, "✅ Place order", late);
    expect(ctx.deps.placeOrder).not.toHaveBeenCalled();
    expect(again.text.startsWith(expiredLead)).toBe(true);
    const fresh = decodeOrderPayload(payloadOf(again, "✅ Place order"))!;
    expect(fresh.state.nonce).toBe("nonce0000000000b");
  });

  it("TC-P7-070 — a summary from a clock too far ahead is shown again too", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    const early = setup({
      now: () => NOW - 10 * MINUTE,
      placeOrder: ctx.deps.placeOrder,
    });
    const again = await press(summary, "✅ Place order", early);
    expect(ctx.deps.placeOrder).not.toHaveBeenCalled();
    expect(again.text.startsWith(expiredLead)).toBe(true);
  });

  it("TC-P7-070 — a few minutes of clock difference between servers is allowed", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    const slightlyEarly = setup({
      now: () => NOW - 3 * MINUTE,
      placeOrder: ctx.deps.placeOrder,
    });
    await press(summary, "✅ Place order", slightlyEarly);
    expect(ctx.deps.placeOrder).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no number", { nonce: null }],
    ["no payment", { payment: null }],
    ["no pickup", { pickup: null }],
    ["no time", { reviewedAt: null }],
    ["no items", { lines: [] }],
  ] as const)(
    "TC-P7-070 — a Place order button with %s places nothing",
    async (_name, missing) => {
      const ctx = setup();
      const summary = await toSummary(ctx);
      const state = {
        ...decodeOrderPayload(payloadOf(summary, "✅ Place order"))!.state,
        ...missing,
      };
      const tap = decodeOrderPayload(encodeOrderPayload("place", state))!;
      const reply = await answerOrderTap(CUSTOMER, tap, ctx.deps, ctx.facts);
      expect(ctx.deps.placeOrder).not.toHaveBeenCalled();
      expect(reply.text).not.toContain("Order placed");
    },
  );

  it("TC-P7-070 — a stuck button can't place more than the limit in ten minutes", async () => {
    const ctx = setup();
    const summary = await toSummary(ctx);
    for (let i = 0; i < PLACE_ORDER_LIMIT; i += 1) {
      await press(summary, "✅ Place order", ctx);
    }
    const limited = await press(summary, "✅ Place order", ctx);
    expect(limited).toEqual(placeLimitReply());
    expect(ctx.deps.placeOrder).toHaveBeenCalledTimes(PLACE_ORDER_LIMIT);
    // Another customer is not affected by it.
    await press(summary, "✅ Place order", ctx, "7100000000000002");
    expect(ctx.deps.placeOrder).toHaveBeenCalledTimes(PLACE_ORDER_LIMIT + 1);
  });

  it("TC-P7-070 — Try again after an unknown outcome sends the same number, so it can't be placed twice", async () => {
    const placeOrder = vi
      .fn<OrderFlowDeps["placeOrder"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(succeeded);
    const ctx = setup({ placeOrder });
    const summary = await toSummary(ctx);
    const failed = await press(summary, "✅ Place order", ctx);
    expect(failed.text).toBe(
      placeFailedReply(
        decodeOrderPayload(payloadOf(summary, "✅ Place order"))!.state,
      ).text,
    );
    expect(titles(failed)).toContain("🔁 Try again");
    const retried = await press(failed, "🔁 Try again", ctx);
    expect(retried.text).toContain(REFERENCE);
    expect(placeOrder.mock.calls.map((call) => call[1])).toEqual([
      NONCE,
      NONCE,
    ]);
    expect(placeOrder.mock.calls.map((call) => call[0])).toEqual([
      CUSTOMER,
      CUSTOMER,
    ]);
  });

  it("TC-P7-070 — an order function that throws is the same as an unknown outcome", async () => {
    const ctx = setup({
      placeOrder: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const failed = await press(await toSummary(ctx), "✅ Place order", ctx);
    expect(titles(failed)).toContain("🔁 Try again");
  });

  it("TC-P7-070 — a price that changed shows a new summary with the new total", async () => {
    const ctx = setup({
      placeOrder: vi.fn(async () =>
        refused({ subtotal: 55 }, "price-changed", "Prices changed."),
      ),
    });
    const again = await press(await toSummary(ctx), "✅ Place order", ctx);
    expect(again.text).toContain(
      "💸 A price changed while you were ordering, so here is your updated summary.",
    );
    expect(titles(again)).toContain("✅ Place order");
  });

  it("TC-P7-070 — an item the shop just sold out of is taken out", async () => {
    const ctx = setup({
      placeOrder: vi.fn(async () =>
        refused(
          { lines: [{ index: 0, reason: "item-unavailable" }] },
          "line-unavailable",
          "Not available.",
        ),
      ),
    });
    const reply = await press(await toSummary(ctx), "✅ Place order", ctx);
    expect(reply.text).toContain(
      "Something just became unavailable, so I took it out.",
    );
    expect(titles(reply)).not.toContain("✅ Checkout");
  });

  it("TC-P7-070 — a problem it can't fix offers Try again and Talk to staff", async () => {
    for (const result of [
      refused({}, "server-error"),
      refused({}, "invalid-request"),
      refused({}, "session-expired"),
      refused({ lines: [] }, "line-unavailable"),
      refused(
        { fieldErrors: { phone: "Use a valid number." } },
        "invalid-details",
      ),
    ]) {
      resetOrderFlow();
      const ctx = setup({ placeOrder: vi.fn(async () => result) });
      const reply = await press(await toSummary(ctx), "✅ Place order", ctx);
      expect(titles(reply)).toEqual(["🔁 Try again", "💬 Talk to staff"]);
    }
    resetOrderFlow();
    const empty = setup({
      placeOrder: vi.fn(async () => refused({}, "empty-cart")),
    });
    const cart = await press(await toSummary(empty), "✅ Place order", empty);
    expect(cart.text).toContain("Your order");
  });

  it("TC-P7-070 — a profile name the shop's form refuses is replaced, and the order still goes through", async () => {
    const placeOrder = vi
      .fn<OrderFlowDeps["placeOrder"]>()
      .mockResolvedValueOnce(
        refused(
          { fieldErrors: { name: "Check the name." } },
          "invalid-details",
        ),
      )
      .mockResolvedValueOnce(succeeded);
    const ctx = setup({ placeOrder });
    const placed = await press(await toSummary(ctx), "✅ Place order", ctx);
    expect(placed.text).toContain(REFERENCE);
    expect(placeOrder.mock.calls.map((call) => call[2].customer.name)).toEqual([
      "Maria Santos",
      FALLBACK_NAME,
    ]);
    expect(placeOrder.mock.calls.map((call) => call[1])).toEqual([
      NONCE,
      NONCE,
    ]);
  });

  it("TC-P7-070 — a refused phone number is not retried with another name", async () => {
    const placeOrder = vi.fn<OrderFlowDeps["placeOrder"]>(async () =>
      refused(
        { fieldErrors: { phone: "Use a valid number." } },
        "invalid-details",
      ),
    );
    const ctx = setup({ placeOrder });
    await press(await toSummary(ctx), "✅ Place order", ctx);
    expect(placeOrder).toHaveBeenCalledTimes(1);
  });

  it("TC-P7-070 — the longest cart still fits in the buttons Messenger allows", () => {
    const lines = Array.from({ length: 12 }, (_, index) => ({
      itemId: `item_${"x".repeat(20)}_${index}`,
      variantId: `variant_${"y".repeat(20)}_${index}`,
      flavor: null,
      quantity: 99,
    }));
    const state = {
      ...newOrder(PHONE),
      lines,
      payment: "GCash" as const,
      pickup: "1h" as const,
      nonce: NONCE,
      reviewedAt: 29_000_000,
    };
    const payload = encodeOrderPayload("place", state);
    // Too long to carry is a null, never a payload Meta would refuse.
    expect(payload === null || payload.length <= MAX_PAYLOAD_LENGTH).toBe(true);
  });
});
