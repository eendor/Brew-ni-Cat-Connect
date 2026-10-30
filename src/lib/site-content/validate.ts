import { type SiteContent, type SiteContentSection, WEEK_DAYS } from "./types";

/**
 * Checks one section of saved site content. The same rules run in the
 * database (`private.is_valid_site_content()` in
 * supabase/migrations/20261030120000_site_content.sql), so the POS can't
 * save what the website would refuse; the website checks again so a bad row
 * falls back instead of breaking a page. Keep the two in step:
 * tests/database/site-content.test.ts runs the same values through both.
 */

type JsonObject = Record<string, unknown>;

export const LIMITS = {
  short: 80,
  medium: 300,
  long: 1000,
  url: 500,
  image: 200,
} as const;

// The spaces JavaScript's trim() removes, written out so the database check
// can list the same ones. Control characters are refused on their own.
const SPACE =
  " \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff";
const EDGE_SPACE = new RegExp(`^[${SPACE}]|[${SPACE}]$`);
const URL_SHAPE = new RegExp(
  `^https://[^${SPACE}/?#]+\\.[^${SPACE}/?#]+([/?#][^${SPACE}]*)?$`,
);
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE = /^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const IMAGE =
  /^\/images\/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(jpg|jpeg|png|webp|svg)$/;
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const PHONE = /^\+?[0-9][0-9 ()-]*[0-9]$/;
const POSTAL_CODE = /^[0-9]{4}$/;
const CONTROL = /[\u0000-\u001f\u007f]/;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** An object with every required key and nothing unknown. */
function hasKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is JsonObject {
  if (!isObject(value)) return false;
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every(
      (key) => required.includes(key) || optional.includes(key),
    )
  );
}

/** Characters as the database counts them (code points). */
const length = (text: string) => [...text].length;

/** One line of text with no space at either end, up to `max` characters. */
export function isText(
  value: unknown,
  max: number,
  { allowEmpty = false } = {},
): value is string {
  return (
    typeof value === "string" &&
    !EDGE_SPACE.test(value) &&
    !CONTROL.test(value) &&
    length(value) <= max &&
    (allowEmpty || value.length > 0)
  );
}

const isUrl = (value: unknown): value is string =>
  isText(value, LIMITS.url) && URL_SHAPE.test(value);

/** An https link, or empty for "not set". */
const isOptionalUrl = (value: unknown): value is string =>
  value === "" || isUrl(value);

/** A picture that ships with the site, under /images/. */
const isImagePath = (value: unknown): value is string =>
  isText(value, LIMITS.image) &&
  IMAGE.test(value) &&
  !value.includes("..") &&
  !value.includes("//");

function isPhoto(value: unknown, optional: readonly string[] = []) {
  return (
    hasKeys(value, ["src", "alt"], optional) &&
    isImagePath(value.src) &&
    isText(value.alt, LIMITS.medium)
  );
}

function isList(
  value: unknown,
  min: number,
  max: number,
  check: (entry: unknown) => boolean,
): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every(check)
  );
}

function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const digitCount = (text: string) => text.replace(/[^0-9]/g, "").length;

const CHECKS: Readonly<
  Record<SiteContentSection, (value: unknown) => boolean>
> = {
  hours: (value) =>
    hasKeys(value, ["days", "note"]) &&
    hasKeys(value.days, WEEK_DAYS) &&
    WEEK_DAYS.every((day) => {
      const hours = (value.days as JsonObject)[day];
      return (
        hours === null ||
        (hasKeys(hours, ["opens", "closes"]) &&
          typeof hours.opens === "string" &&
          typeof hours.closes === "string" &&
          TIME.test(hours.opens) &&
          TIME.test(hours.closes) &&
          hours.opens < hours.closes)
      );
    }) &&
    isText(value.note, LIMITS.medium, { allowEmpty: true }),

  contact: (value) =>
    hasKeys(value, ["phone", "email"]) &&
    isText(value.phone, 20) &&
    PHONE.test(value.phone) &&
    digitCount(value.phone) >= 7 &&
    digitCount(value.phone) <= 15 &&
    isText(value.email, 254) &&
    EMAIL.test(value.email),

  address: (value) =>
    hasKeys(value, [
      "street",
      "area",
      "town",
      "province",
      "postalCode",
      "country",
      "landmark",
      "mapUrl",
    ]) &&
    ["street", "area", "town", "province", "country"].every((key) =>
      isText(value[key], LIMITS.short),
    ) &&
    typeof value.postalCode === "string" &&
    POSTAL_CODE.test(value.postalCode) &&
    isText(value.landmark, LIMITS.short * 2, { allowEmpty: true }) &&
    isUrl(value.mapUrl),

  payments: (value) =>
    hasKeys(value, ["methods", "qrCode"]) &&
    isList(value.methods, 1, 6, (method) => isText(method, 30)) &&
    new Set(value.methods).size === value.methods.length &&
    (value.qrCode === null || isPhoto(value.qrCode)),

  notice: (value) =>
    hasKeys(value, ["text"]) &&
    isText(value.text, LIMITS.medium, { allowEmpty: true }),

  social: (value) =>
    hasKeys(value, ["facebook", "facebookPhotos", "tiktok"]) &&
    isOptionalUrl(value.facebook) &&
    isOptionalUrl(value.facebookPhotos) &&
    isOptionalUrl(value.tiktok),

  riders: (value) =>
    hasKeys(value, ["partners"]) &&
    isList(
      value.partners,
      0,
      8,
      (partner) =>
        hasKeys(partner, ["name", "href", "logo"]) &&
        isText(partner.name, LIMITS.short) &&
        isUrl(partner.href) &&
        isImagePath(partner.logo),
    ),

  about: (value) =>
    hasKeys(value, [
      "openedOn",
      "heroTitle",
      "heroText",
      "homeTitle",
      "homeText",
      "homePhoto",
      "intro",
      "storyTitle",
      "story",
      "photos",
      "menuSummary",
      "footerText",
      "catRules",
    ]) &&
    isRealDate(value.openedOn) &&
    ["heroTitle", "homeTitle", "storyTitle", "menuSummary"].every((key) =>
      isText(value[key], LIMITS.short),
    ) &&
    ["heroText", "homeText", "intro", "footerText"].every((key) =>
      isText(value[key], LIMITS.medium),
    ) &&
    isPhoto(value.homePhoto) &&
    isList(value.story, 1, 6, (paragraph) => isText(paragraph, LIMITS.long)) &&
    isList(value.photos, 3, 3, (photo) => isPhoto(photo)) &&
    isList(
      value.catRules,
      0,
      6,
      (rule) =>
        hasKeys(rule, ["title", "text"]) &&
        isText(rule.title, LIMITS.short) &&
        isText(rule.text, LIMITS.medium),
    ),

  gallery: (value) =>
    hasKeys(value, ["photos"]) &&
    isList(
      value.photos,
      1,
      80,
      (photo) =>
        isPhoto(photo, ["featured", "landscape", "people"]) &&
        ["featured", "landscape", "people"].every(
          (flag) =>
            !Object.hasOwn(photo as JsonObject, flag) ||
            typeof (photo as JsonObject)[flag] === "boolean",
        ),
    ),
};

type SectionValue<S extends SiteContentSection> = SiteContent[S];

/** The section's content when it passes every rule, otherwise null. */
export function parseSection<S extends SiteContentSection>(
  section: S,
  value: unknown,
): SectionValue<S> | null {
  return CHECKS[section](value) ? (value as SectionValue<S>) : null;
}
