import { formatTime } from "./format";
import type { ClosureContent, HoursContent, WeekDay } from "./types";
import { WEEK_DAYS } from "./types";

/**
 * Whether the shop takes orders right now (FR-112): the owner's Closed today
 * switch first, then the weekly hours, both in Philippine time.
 */

/** The Philippines is UTC+8 all year (no daylight saving). */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export type ManilaTime = Readonly<{
  /** "YYYY-MM-DD". */
  date: string;
  day: WeekDay;
  /** Minutes since midnight. */
  minutes: number;
}>;

export function manilaTime(now: Date = new Date()): ManilaTime {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  return {
    date: local.toISOString().slice(0, 10),
    // getUTCDay() counts from Sunday; WEEK_DAYS starts on Monday.
    day: WEEK_DAYS[(local.getUTCDay() + 6) % 7] ?? "monday",
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/**
 * The switch only lasts for the day it was turned on, so the shop opens by
 * itself the next day. `changedAt` is when the closure row was last saved.
 */
export function closureForToday(
  closure: ClosureContent,
  changedAt: string | null | undefined,
  now: Date = new Date(),
): ClosureContent {
  if (!closure.closed) return closure;
  const changed = changedAt ? new Date(changedAt) : null;
  if (!changed || Number.isNaN(changed.getTime())) return closure;
  return manilaTime(changed).date === manilaTime(now).date
    ? closure
    : { ...closure, closed: false };
}

export type ShopStatus =
  | Readonly<{ open: true; closes: string }>
  | Readonly<{
      open: false;
      reason:
        "closed-today" | "closed-day" | "before-opening" | "after-closing";
      /** Today's opening time, when the shop opens later today. */
      opens: string | null;
    }>;

const toMinutes = (time: string) => {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export function shopStatus(
  closure: ClosureContent,
  hours: HoursContent,
  now: Date = new Date(),
): ShopStatus {
  if (closure.closed)
    return { open: false, reason: "closed-today", opens: null };
  const time = manilaTime(now);
  const today = hours.days[time.day];
  if (!today) return { open: false, reason: "closed-day", opens: null };
  if (time.minutes < toMinutes(today.opens)) {
    return { open: false, reason: "before-opening", opens: today.opens };
  }
  if (time.minutes >= toMinutes(today.closes)) {
    return { open: false, reason: "after-closing", opens: null };
  }
  return { open: true, closes: today.closes };
}

export const SHOP_CLOSED_TODAY_MESSAGE =
  "We're closed today, so the shop can't take online orders. Please come back when we're open.";

/** Why an order can't be placed now, in one sentence. */
export function shopClosedMessage(status: ShopStatus): string | null {
  if (status.open) return null;
  switch (status.reason) {
    case "closed-today":
      return SHOP_CLOSED_TODAY_MESSAGE;
    case "before-opening":
      return status.opens
        ? `We're not open yet. You can order online from ${formatTime(status.opens)} today.`
        : "We're not open yet. Please order again during our opening hours.";
    default:
      return "We're closed for the day, so the shop can't take online orders. Please order again during our opening hours.";
  }
}
