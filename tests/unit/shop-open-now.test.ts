import { describe, expect, it, vi } from "vitest";

import { fallbackSiteContent, loadSiteContent } from "@/lib/site-content/load";
import {
  closureForToday,
  manilaTime,
  shopClosedMessage,
  shopStatus,
} from "@/lib/site-content/open-now";
import type { HoursContent } from "@/lib/site-content/types";

const weekday = { opens: "11:00", closes: "21:00" };
const hours: HoursContent = {
  days: {
    monday: weekday,
    tuesday: weekday,
    wednesday: weekday,
    thursday: weekday,
    friday: weekday,
    saturday: null,
    sunday: { opens: "13:00", closes: "21:00" },
  },
  note: "",
};
const open = { closed: false, note: "" };
const closedToday = { closed: true, note: "Back tomorrow." };
/** A time in Manila (UTC+8) on 9 to 15 November 2026 (Monday to Sunday). */
const manila = (day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 10, day, hour - 8, minute));

describe("The shop follows its opening hours (FR-112)", () => {
  it("TC-P7-082 — open inside the hours, closed before, after and on a closed day, in Manila time", () => {
    expect(shopStatus(open, hours, manila(9, 14))).toEqual({
      open: true,
      closes: "21:00",
    });
    expect(shopStatus(open, hours, manila(9, 10, 59))).toEqual({
      open: false,
      reason: "before-opening",
      opens: "11:00",
    });
    expect(shopStatus(open, hours, manila(9, 21))).toMatchObject({
      open: false,
      reason: "after-closing",
    });
    expect(shopStatus(open, hours, manila(14, 14))).toMatchObject({
      open: false,
      reason: "closed-day",
    });
    expect(shopStatus(open, hours, manila(15, 12))).toMatchObject({
      reason: "before-opening",
      opens: "13:00",
    });
    // 00:30 on Tuesday in Manila is still Monday in UTC.
    expect(manilaTime(manila(10, 0, 30))).toEqual({
      date: "2026-11-10",
      day: "tuesday",
      minutes: 30,
    });
    expect(shopStatus(closedToday, hours, manila(9, 14))).toMatchObject({
      reason: "closed-today",
    });
    expect(shopClosedMessage(shopStatus(open, hours, manila(9, 9)))).toBe(
      "We're not open yet. You can order online from 11 AM today.",
    );
    expect(
      shopClosedMessage(shopStatus(open, hours, manila(14, 14))),
    ).toContain("We're closed for the day");
    expect(
      shopClosedMessage(shopStatus(open, hours, manila(9, 14))),
    ).toBeNull();
  });

  it("TC-P7-083 — Closed today lasts only for the day it was turned on, so the shop opens by itself", () => {
    const setAt = manila(9, 23, 30).toISOString();
    expect(closureForToday(closedToday, setAt, manila(9, 23, 45))).toEqual(
      closedToday,
    );
    expect(closureForToday(closedToday, setAt, manila(10, 0, 5))).toEqual({
      ...closedToday,
      closed: false,
    });
    expect(closureForToday(closedToday, null, manila(10, 9))).toEqual(
      closedToday,
    );
    expect(closureForToday(open, setAt, manila(10, 9))).toEqual(open);
  });

  it("TC-P7-083 — the loader turns yesterday's switch off and keeps today's", async () => {
    vi.setSystemTime(manila(10, 12));
    try {
      const rows = (updatedAt: string) => async () => [
        { section: "closure", content: closedToday, updated_at: updatedAt },
        { section: "hours", content: fallbackSiteContent.hours },
      ];
      const yesterday = await loadSiteContent(
        rows(manila(9, 18).toISOString()),
      );
      expect(yesterday.content.closure.closed).toBe(false);
      const today = await loadSiteContent(rows(manila(10, 8).toISOString()));
      expect(today.content.closure).toEqual(closedToday);
    } finally {
      vi.useRealTimers();
    }
  });
});
