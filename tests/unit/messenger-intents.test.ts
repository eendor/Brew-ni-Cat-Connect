import { describe, expect, it } from "vitest";

import {
  categoryPayload,
  findOrderPointer,
  INTENTS,
  MAX_SHORT_MESSAGE_LENGTH,
  normalizeText,
  PAYLOADS,
  readPayload,
  typedButton,
} from "@/lib/messenger/intents";
import { MAIN_BUTTONS } from "@/lib/messenger/replies";

import {
  ORDER_LINK as LINK,
  ORIGIN,
  REFERENCE,
  TOKEN,
} from "./messenger-fixtures";

describe("Messenger button payloads (FR-059)", () => {
  it("TC-P7-004 — every button payload reads back as its button", () => {
    for (const intent of INTENTS) {
      expect(readPayload(PAYLOADS[intent])).toEqual({ kind: "intent", intent });
    }
    expect(new Set(Object.values(PAYLOADS)).size).toBe(INTENTS.length);
  });

  it("TC-P7-004 — a phone button tap without a usable number asks for it again", () => {
    expect(readPayload("")).toEqual({
      kind: "phone",
      phone: null,
      missing: true,
    });
    expect(readPayload("Phone number")).toEqual({
      kind: "phone",
      phone: null,
      missing: true,
    });
    expect(readPayload("menu")).toBeNull();
  });

  it("TC-P7-080 — a phone button number that isn't a Philippine mobile is not offered again", () => {
    for (const payload of [
      "+1 415 555 0100",
      "(082) 123 4567",
      "+63 2 8123 4567",
    ]) {
      expect(readPayload(payload)).toEqual({
        kind: "phone",
        phone: null,
        missing: true,
      });
    }
    expect(readPayload("+63 917 123 4567")).toEqual({
      kind: "phone",
      phone: "09171234567",
    });
  });

  it("TC-P7-004 — a category button carries the category id", () => {
    expect(categoryPayload("cat_drinks")).toBe("MENU_CATEGORY:cat_drinks");
    expect(readPayload("MENU_CATEGORY:cat_drinks")).toEqual({
      kind: "category",
      categoryId: "cat_drinks",
    });
    expect(categoryPayload("has space")).toBeNull();
    expect(categoryPayload("")).toBeNull();
    expect(categoryPayload("x".repeat(65))).toBeNull();
  });

  it.each([
    "UNKNOWN",
    "menu",
    "MENU_CATEGORY:",
    "MENU_CATEGORY:a b",
    `MENU_CATEGORY:${"x".repeat(65)}`,
    42,
    null,
    undefined,
    { payload: "MENU" },
  ])("TC-P7-004 — reads %j as no button", (payload) => {
    expect(readPayload(payload)).toBeNull();
  });
});

describe("Messenger typed button names (FR-059, FR-061)", () => {
  it("TC-P7-005 — every main button's title works when typed", () => {
    for (const button of MAIN_BUTTONS) {
      expect(typedButton(button.title)).toBe(button.intent);
      expect(typedButton(button.title.toUpperCase())).toBe(button.intent);
    }
  });

  it.each([
    { text: "menu po", intent: "menu" },
    { text: "Hello po, MENU!", intent: "menu" },
    { text: "price list pls", intent: "menu" },
    { text: "good morning po hours", intent: "hours-location" },
    { text: "Hours and location?", intent: "hours-location" },
    { text: "Ménu", intent: "menu" },
    { text: "hi", intent: "welcome" },
    { text: "hi admin", intent: "welcome" },
    { text: "Kumusta po", intent: "welcome" },
    { text: "hello there", intent: "welcome" },
    { text: "Get Started", intent: "welcome" },
    { text: "track my order", intent: "order-status" },
    { text: "STATUS", intent: "order-status" },
    { text: "staff po", intent: "staff" },
    { text: `menu${" ".repeat(MAX_SHORT_MESSAGE_LENGTH - 4)}`, intent: "menu" },
  ])("TC-P7-005 — reads $text as $intent", ({ text, intent }) => {
    expect(typedButton(text)).toBe(intent);
  });

  it.each([
    "pa order po 2 fries",
    "may available pa po ba na matcha?",
    "hi, can I order for pickup at 5?",
    "where's your address?",
    "menu prices for 10 people",
    "",
    "   ",
    "po",
    "👍",
    `menu${" ".repeat(MAX_SHORT_MESSAGE_LENGTH - 3)}`,
    `menu ${"x".repeat(60)}`,
  ])("TC-P7-006 — leaves %j for the staff", (text) => {
    expect(typedButton(text)).toBeNull();
  });

  it("TC-P7-006 — compares words without case, accents or punctuation", () => {
    expect(normalizeText("  Ménu & PRICES?! ")).toBe("menu prices");
  });
});

describe("Messenger order links (FR-063)", () => {
  it.each([
    { name: "the full order link", text: LINK },
    {
      name: "the link inside a message",
      text: `Hi po, ito yung order ko ${LINK} salamat`,
    },
  ])("TC-P7-007 — finds the reference and token in $name", ({ text }) => {
    expect(findOrderPointer(text)).toEqual({
      reference: REFERENCE,
      token: TOKEN,
    });
  });

  it.each([
    { name: "a bare reference", text: "bnc-7k2q9f po" },
    {
      name: "a link with a short token",
      text: `${ORIGIN}/orders/${REFERENCE}#token=${TOKEN.slice(1)}`,
    },
    {
      name: "a link with a longer token",
      text: `${LINK}x`,
    },
  ])("TC-P7-007 — finds only the reference in $name", ({ text }) => {
    expect(findOrderPointer(text)).toEqual({
      reference: REFERENCE,
      token: null,
    });
  });

  it.each([
    "BNC-0O1I2L",
    "XBNC-7K2Q9F",
    "BNC-7K2Q9FF",
    "BNC-7K2Q9",
    "my order please",
  ])("TC-P7-007 — finds no order in %j", (text) => {
    expect(findOrderPointer(text)).toBeNull();
  });
});
