/**
 * "Are you open now?" with a real answer (added 2026-11-13). It was the
 * question customers asked most on the Page since it opened on 2026-06-12, in
 * about 40 chats, so the reply says whether the shop is open at this moment,
 * not just the week's hours.
 */

import { formatTime } from "@/lib/site-content/format";
import {
  WEEK_DAYS,
  type OpeningHours,
  type SiteContent,
  type WeekDay,
} from "@/lib/site-content/types";

const SHOP_TIME_ZONE = "Asia/Manila";

const DAY_NAMES: Readonly<Record<WeekDay, string>> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type ShopClock = Readonly<{ day: WeekDay; minutes: number }>;

/** The day and minute of the day at the shop. */
export function shopClock(now: number): ShopClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const day = part("weekday").toLowerCase() as WeekDay;
  return {
    day: WEEK_DAYS.includes(day) ? day : "monday",
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

const nextDay = (day: WeekDay): WeekDay =>
  WEEK_DAYS[(WEEK_DAYS.indexOf(day) + 1) % WEEK_DAYS.length] ?? "monday";

/** The next open day after `day`, within a week. */
function nextOpenDay(
  days: Readonly<Record<WeekDay, OpeningHours | null>>,
  day: WeekDay,
): Readonly<{ day: WeekDay; hours: OpeningHours; tomorrow: boolean }> | null {
  let candidate = day;
  for (let step = 1; step <= 7; step += 1) {
    candidate = nextDay(candidate);
    const hours = days[candidate];
    if (hours) return { day: candidate, hours, tomorrow: step === 1 };
  }
  return null;
}

/**
 * How long after opening a day with no sale at the counter makes the answer
 * careful. The first sale usually comes within two hours of opening.
 */
export const QUIET_COUNTER_MINUTES = 90;

/**
 * One line: open now until …, opening later today, or when it opens next.
 * Update 2026-11-17: `counterActive` is whether the POS has a sale today.
 * When it is false well into opening hours, the shop may have closed without
 * the switch, so the answer says "should be open" and offers the staff.
 */
export function openStatusText(
  content: SiteContent,
  now: number,
  counterActive: boolean | null = null,
): string {
  const { days } = content.hours;
  const clock = shopClock(now);
  const today = days[clock.day];
  const upcoming = nextOpenDay(days, clock.day);
  const next = upcoming
    ? `We open ${upcoming.tomorrow ? "tomorrow" : DAY_NAMES[upcoming.day]} at ${formatTime(upcoming.hours.opens)}.`
    : "";

  if (content.closure.closed) {
    const note = content.closure.note.trim();
    return `🚪 Sorry, we're closed today.${note ? ` ${note}` : ""}${next ? ` ${next}` : ""}`;
  }
  if (!today) {
    return `😿 We're closed today (${DAY_NAMES[clock.day]}).${next ? ` ${next}` : ""}`;
  }
  const opens = toMinutes(today.opens);
  const closes = toMinutes(today.closes);
  if (clock.minutes < opens) {
    return `⏰ We open today at ${formatTime(today.opens)} until ${formatTime(today.closes)}.`;
  }
  if (clock.minutes < closes) {
    if (
      counterActive === false &&
      clock.minutes >= opens + QUIET_COUNTER_MINUTES
    ) {
      return `🟢 We should be open now until ${formatTime(today.closes)}, but the counter hasn't had an order yet today. If you're coming over, tap Talk to staff and we'll confirm first.`;
    }
    return `🟢 Yes, we're open now until ${formatTime(today.closes)}!`;
  }
  return `🌙 We're closed for today (we close at ${formatTime(today.closes)}).${next ? ` ${next}` : ""}`;
}
