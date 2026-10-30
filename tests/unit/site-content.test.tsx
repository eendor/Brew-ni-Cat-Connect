import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteNotice } from "@/components/layout/site-notice";
import { loadMenuFacts } from "@/lib/menu/load-menu-facts";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import {
  closedLine,
  formatDate,
  formatTime,
  hoursNotice,
  hoursSentence,
  hoursSummary,
  joinList,
  landmarkName,
  openHoursLines,
  phoneHref,
  takeoutBoxText,
  takeoutPriceText,
} from "@/lib/site-content/format";
import { fallbackSiteContent, loadSiteContent } from "@/lib/site-content/load";
import {
  SITE_CONTENT_SECTIONS,
  WEEK_DAYS,
  type HoursContent,
  type OpeningHours,
  type SiteContentRow,
} from "@/lib/site-content/types";
import type { MenuCatalog, MenuItem } from "@/types/menu";

afterEach(() => {
  vi.restoreAllMocks();
});

const rowsOf = (content: Record<string, unknown>): SiteContentRow[] =>
  Object.entries(content).map(([section, value]) => ({
    section,
    content: value,
  }));

describe("Loading the saved content (TC-P4-218)", () => {
  it("TC-P4-218 — saved sections show; a missing, broken or unreadable one falls back on its own", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const notice = { text: "Closed on Nov 1." };

    const all = await loadSiteContent(async () =>
      rowsOf({ ...fallbackSiteContent, notice }),
    );
    expect(all.content.notice).toEqual(notice);
    expect(Object.values(all.sources).every((s) => s === "live")).toBe(true);
    expect(warn).not.toHaveBeenCalled();

    // one bad section: only it falls back, and the log names it
    const broken = await loadSiteContent(async () =>
      rowsOf({
        ...fallbackSiteContent,
        notice,
        contact: { phone: "call us", email: "nope" },
        unknown: { anything: true },
      }),
    );
    expect(broken.content.contact).toEqual(fallbackShop.contact);
    expect(broken.sources.contact).toBe("fallback");
    expect(broken.content.notice).toEqual(notice);
    expect(broken.sources.notice).toBe("live");
    expect(warn).toHaveBeenLastCalledWith(
      "Site content: showing the fallback for contact.",
    );

    // a section with no row yet shows its fallback quietly
    warn.mockClear();
    const partial = await loadSiteContent(async () => rowsOf({ notice }));
    expect(partial.content.hours).toEqual(fallbackShop.hours);
    expect(partial.sources.hours).toBe("fallback");
    expect(partial.sources.notice).toBe("live");
    expect(warn).not.toHaveBeenCalled();

    // no table, no network or no settings: every section falls back
    for (const read of [
      async () => null,
      async () => {
        throw new Error("offline");
      },
    ]) {
      const fallback = await loadSiteContent(read);
      expect(fallback.content).toEqual(fallbackSiteContent);
      expect(new Set(Object.values(fallback.sources))).toEqual(
        new Set(["fallback"]),
      );
    }
    expect(warn).toHaveBeenLastCalledWith(
      "Site content: the live content can't be read; showing the fallback.",
    );
    expect(SITE_CONTENT_SECTIONS).toHaveLength(9);
  });
});

const open = (opens: string, closes: string): OpeningHours => ({
  opens,
  closes,
});

function schedule(
  days: Partial<Record<(typeof WEEK_DAYS)[number], OpeningHours | null>>,
  fill: OpeningHours | null = null,
  note = "",
): HoursContent {
  return {
    days: Object.fromEntries(
      WEEK_DAYS.map((day) => [day, day in days ? days[day]! : fill]),
    ) as HoursContent["days"],
    note,
  };
}

describe("Turning saved content into page text (TC-P4-219)", () => {
  it("TC-P4-219 — the shipped hours read as before", () => {
    const hours = fallbackShop.hours;
    expect(hoursSentence(hours)).toBe(
      "Open 11 AM to 9 PM, Monday to Friday, and 1 PM to 9 PM on Sunday. Closed every Saturday.",
    );
    expect(hoursSentence(hours, " – ")).toBe(
      "Open 11 AM – 9 PM, Monday to Friday, and 1 PM – 9 PM on Sunday. Closed every Saturday.",
    );
    expect(hoursSummary(hours)).toBe(
      "Open Mon–Fri 11 AM – 9 PM and Sun 1 PM – 9 PM. Closed every Saturday.",
    );
    expect(openHoursLines(hours)).toEqual([
      "Mon–Fri · 11 AM – 9 PM",
      "Sun · 1 PM – 9 PM",
    ]);
    expect(closedLine(hours)).toBe("Closed every Saturday");
    expect(hoursNotice(hours)).toBe(`${hoursSentence(hours)} ${hours.note}`);
  });

  it("TC-P4-219 — other schedules read correctly", () => {
    const everyDay = schedule({}, open("07:30", "23:59"));
    expect(hoursSentence(everyDay)).toBe(
      "Open 7:30 AM to 11:59 PM, Monday to Sunday.",
    );
    expect(closedLine(everyDay)).toBe("");
    expect(hoursNotice(everyDay)).toBe(hoursSentence(everyDay));

    const closed = schedule({});
    expect(hoursSentence(closed)).toBe("Closed for now.");
    expect(hoursSummary(closed)).toBe("Closed for now.");
    expect(closedLine(closed)).toBe("Closed for now");
    expect(openHoursLines(closed)).toEqual([]);

    const split = schedule(
      {
        monday: open("09:00", "17:00"),
        tuesday: open("09:00", "17:00"),
        wednesday: open("09:00", "17:00"),
        saturday: open("10:00", "22:00"),
        sunday: open("10:00", "22:00"),
      },
      null,
      "Holiday hours are posted on Facebook.",
    );
    expect(hoursSentence(split)).toBe(
      "Open 9 AM to 5 PM, Monday to Wednesday, and 10 AM to 10 PM, Saturday and Sunday. Closed every Thursday and Friday.",
    );
    expect(hoursSummary(split)).toBe(
      "Open Mon–Wed 9 AM – 5 PM and Sat & Sun 10 AM – 10 PM. Closed every Thursday and Friday.",
    );
    expect(hoursNotice(split)).toMatch(
      /Friday\. Holiday hours are posted on Facebook\.$/,
    );
  });

  it("TC-P4-219 — times, lists, links, dates and the takeout box", () => {
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatTime("12:00")).toBe("12 PM");
    expect(formatTime("13:05")).toBe("1:05 PM");
    expect(joinList([])).toBe("");
    expect(joinList(["Cash"])).toBe("Cash");
    expect(joinList(["Cash", "GCash"], "or")).toBe("Cash or GCash");
    expect(joinList(["Cash", "GCash", "Maya"])).toBe("Cash, GCash, and Maya");
    expect(phoneHref("+63 900 000 0000")).toBe("tel:+639000000000");
    expect(phoneHref("0900-000-0000")).toBe("tel:+639000000000");
    expect(phoneHref("(083) 000 0000")).toBe("tel:+63830000000");
    expect(formatDate("2026-06-12")).toBe("June 12, 2026");
    expect(formatDate("2026-06-12", "month")).toBe("June 2026");
    expect(
      landmarkName({
        ...fallbackShop.address,
        landmark: "Across from the plaza",
      }),
    ).toBe("the plaza");
    expect(takeoutBoxText(10)).toBe("₱10 takeout box");
    expect(takeoutBoxText(null)).toBe("takeout box");
    expect(takeoutPriceText(15)).toBe("₱15");
    expect(takeoutPriceText(null)).toBe("priced by the shop");
  });
});

function item(id: string, name: string, ...prices: number[]): MenuItem {
  return {
    id,
    name,
    availability: "available",
    flavors: [],
    variants: prices.map((price, index) => ({
      id: `${id}-${index}`,
      name: `Size ${index + 1}`,
      basePrice: price,
      flavorPrices: [],
      description: null,
    })),
  };
}

describe("Menu prices outside the Menu page (TC-P4-220)", () => {
  it("TC-P4-220 — showcase and takeout box prices come from the live menu, or are left out", async () => {
    const catalog: MenuCatalog = {
      categories: [
        {
          id: "drinks",
          name: "Drinks",
          items: [
            item("matcha", "Matcha (The Lucky Green Neko)", 59, 49),
            item("coffee", "Cat-Feine (Classic Coffee)", 55),
          ],
        },
        {
          id: "extras",
          name: "Extras",
          items: [
            item("fries", "Fries (Cat Claws)", 35),
            item("box", "Take-out Box", 12),
          ],
        },
      ],
    };
    const facts = await loadMenuFacts(async () => catalog);
    expect(facts).toEqual({
      takeoutBoxPrice: 12,
      showcasePrices: {
        matcha: 49,
        catfeine: 55,
        takoyaki: null,
        fries: 35,
        buldak: null,
      },
    });

    for (const read of [
      async () => null,
      async () => {
        throw new Error("offline");
      },
    ]) {
      const unknown = await loadMenuFacts(read);
      expect(unknown.takeoutBoxPrice).toBeNull();
      expect(Object.values(unknown.showcasePrices)).toEqual([
        null,
        null,
        null,
        null,
        null,
      ]);
    }
  });
});

describe("Shop notice (TC-P4-221)", () => {
  it("TC-P4-221 — the owner's notice shows above the page, and nothing shows while it is empty", () => {
    const { rerender } = render(<SiteNotice text="Closed on Nov 1." />);
    expect(
      screen.getByRole("complementary", { name: "Shop notice" }),
    ).toHaveTextContent("Closed on Nov 1.");

    rerender(<SiteNotice text="" />);
    expect(
      screen.queryByRole("complementary", { name: "Shop notice" }),
    ).toBeNull();
  });
});
