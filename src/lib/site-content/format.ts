import { formatPrice } from "@/lib/menu/format-price";

import type {
  AddressContent,
  GalleryContent,
  GalleryPhoto,
  HoursContent,
  OpeningHours,
  WeekDay,
} from "./types";
import { WEEK_DAYS } from "./types";

/**
 * Turns saved site content into the words pages show. Pages never write a
 * shop fact themselves (FR-086); they pass the content through these.
 */

const DAY_NAMES: Readonly<Record<WeekDay, { long: string; short: string }>> = {
  monday: { long: "Monday", short: "Mon" },
  tuesday: { long: "Tuesday", short: "Tue" },
  wednesday: { long: "Wednesday", short: "Wed" },
  thursday: { long: "Thursday", short: "Thu" },
  friday: { long: "Friday", short: "Fri" },
  saturday: { long: "Saturday", short: "Sat" },
  sunday: { long: "Sunday", short: "Sun" },
};

/** "Cash", "Cash and GCash", "Cash, GCash, and Maya". */
export function joinList(items: readonly string[], conjunction = "and") {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items.at(-1)}`;
}

/** "13:00" → "1 PM", "11:30" → "11:30 AM". */
export function formatTime(time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const suffix = hour < 12 ? "AM" : "PM";
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${clock} ${suffix}`
    : `${clock}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** "11 AM – 9 PM", or "11 AM to 9 PM" in a sentence. */
export function formatRange(hours: OpeningHours, joiner = " – ") {
  return `${formatTime(hours.opens)}${joiner}${formatTime(hours.closes)}`;
}

export type DayRun = Readonly<{
  days: readonly WeekDay[];
  /** null for closed days */
  hours: OpeningHours | null;
}>;

const sameHours = (a: OpeningHours | null, b: OpeningHours | null) =>
  a === b ||
  (a !== null && b !== null && a.opens === b.opens && a.closes === b.closes);

/** Days next to each other (Monday first) that share the same hours. */
export function dayRuns(hours: HoursContent): DayRun[] {
  const runs: { days: WeekDay[]; hours: OpeningHours | null }[] = [];
  for (const day of WEEK_DAYS) {
    const today = hours.days[day];
    const last = runs.at(-1);
    if (last && sameHours(last.hours, today)) last.days.push(day);
    else runs.push({ days: [day], hours: today });
  }
  return runs;
}

/** "Sunday", "Saturday and Sunday", "Monday to Friday" ("Mon–Fri"). */
export function daysLabel(days: readonly WeekDay[], style: "long" | "short") {
  const first = DAY_NAMES[days[0] ?? "monday"][style];
  if (days.length <= 1) return first;
  const last = DAY_NAMES[days.at(-1) ?? "sunday"][style];
  if (days.length === 2) {
    return style === "long" ? `${first} and ${last}` : `${first} & ${last}`;
  }
  return style === "long" ? `${first} to ${last}` : `${first}–${last}`;
}

export type OpenRun = DayRun & Readonly<{ hours: OpeningHours }>;

/** The runs of days the shop is open. */
export const openRuns = (hours: HoursContent): OpenRun[] =>
  dayRuns(hours).filter((run): run is OpenRun => run.hours !== null);

/** The closed days, by name: "Saturday". */
export function closedDays(hours: HoursContent) {
  return WEEK_DAYS.filter((day) => hours.days[day] === null).map(
    (day) => DAY_NAMES[day].long,
  );
}

function closedSentence(hours: HoursContent) {
  const closed = closedDays(hours);
  return closed.length > 0 ? ` Closed every ${joinList(closed)}.` : "";
}

/**
 * "Open 11 AM to 9 PM, Monday to Friday, and 1 PM to 9 PM on Sunday. Closed
 * every Saturday." The contact page joins times with " – " instead.
 */
export function hoursSentence(hours: HoursContent, joiner = " to ") {
  const runs = openRuns(hours);
  if (runs.length === 0) return "Closed for now.";
  const parts = runs.map((run) => {
    const range = formatRange(run.hours, joiner);
    const days = daysLabel(run.days, "long");
    return run.days.length === 1 ? `${range} on ${days}` : `${range}, ${days}`;
  });
  const open =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
  return `Open ${open}.${closedSentence(hours)}`;
}

/** The hours sentence, then the owner's note about schedule changes. */
export function hoursNotice(hours: HoursContent) {
  return hours.note
    ? `${hoursSentence(hours)} ${hours.note}`
    : hoursSentence(hours);
}

/** "Open Mon–Fri 11 AM – 9 PM and Sun 1 PM – 9 PM. Closed every Saturday." */
export function hoursSummary(hours: HoursContent) {
  const runs = openRuns(hours);
  if (runs.length === 0) return "Closed for now.";
  const parts = runs.map(
    (run) => `${daysLabel(run.days, "short")} ${formatRange(run.hours)}`,
  );
  return `Open ${joinList(parts)}.${closedSentence(hours)}`;
}

/** ["Mon–Fri · 11 AM – 9 PM", "Sun · 1 PM – 9 PM"] */
export const openHoursLines = (hours: HoursContent) =>
  openRuns(hours).map(
    (run) => `${daysLabel(run.days, "short")} · ${formatRange(run.hours)}`,
  );

/** "Closed every Saturday", "Closed for now" or "" when open every day. */
export function closedLine(hours: HoursContent) {
  if (openRuns(hours).length === 0) return "Closed for now";
  const closed = closedDays(hours);
  return closed.length > 0 ? `Closed every ${joinList(closed)}` : "";
}

/** A tappable phone link; local numbers get the Philippine +63. */
export function phoneHref(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (phone.trim().startsWith("+") || digits.startsWith("63")) {
    return `tel:+${digits}`;
  }
  return digits.startsWith("0") ? `tel:+63${digits.slice(1)}` : `tel:${digits}`;
}

export const emailHref = (email: string) => `mailto:${email}`;

/** "Abellera St, Poblacion" */
export const streetLine = (address: AddressContent) =>
  `${address.street}, ${address.area}`;

/** "Kabacan, Cotabato 9407" */
export const localityLine = (address: AddressContent) =>
  `${address.town}, ${address.province} ${address.postalCode}`;

/** "Kabacan, Cotabato" */
export const townLine = (address: AddressContent) =>
  `${address.town}, ${address.province}`;

/** "Abellera St, Poblacion, Kabacan" */
export const shortAddress = (address: AddressContent) =>
  `${address.street}, ${address.area}, ${address.town}`;

/** "Abellera St, Poblacion, Kabacan, Cotabato 9407" */
export const fullAddress = (address: AddressContent) =>
  `${streetLine(address)}, ${localityLine(address)}`;

/** "Pulido Eatery" from "Beside Pulido Eatery", for the 3D street sign. */
export const landmarkName = (address: AddressContent) =>
  address.landmark.replace(/^(beside|near|across from|next to)\s+/i, "");

/** "June 12, 2026", or "June 2026" with `month`. */
export function formatDate(date: string, style: "day" | "month" = "day") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    ...(style === "day" ? { day: "numeric" } : {}),
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "₱10 takeout box", or "takeout box" while the menu can't be read. */
export const takeoutBoxText = (price: number | null) =>
  price === null ? "takeout box" : `${formatPrice(price)} takeout box`;

/** "₱10", or "priced by the shop" while the menu can't be read. */
export const takeoutPriceText = (price: number | null) =>
  price === null ? "priced by the shop" : formatPrice(price);

/** "takeout box" → "Takeout box", for text that starts a sentence. */
export const sentenceStart = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** "Beside Pulido Eatery" → "beside Pulido Eatery", for mid-sentence use. */
export const midSentence = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

/** Photos for the 3D ring: no one in the shot. */
export const ringPhotos = (gallery: GalleryContent): GalleryPhoto[] =>
  gallery.photos.filter((photo) => !photo.people);

/** Up to six featured photos for the home page. */
export const homePhotos = (gallery: GalleryContent): GalleryPhoto[] =>
  gallery.photos.filter((photo) => photo.featured).slice(0, 6);
