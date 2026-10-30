// @vitest-environment node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * FR-086: the website shows the shop's facts from saved data, never from
 * its own code. This scan reads every source file except the two fallback
 * files (the copy shown while the saved content can't be read) and fails on
 * a price, an opening time, a phone number, an email, the address, a social
 * link or a fixed payment or hours phrase. Comments are skipped, since they
 * describe the output, and so are "e.g." examples of what a customer types
 * (a phone number format, "deliver after 3 PM").
 */

const ROOT = join(__dirname, "..", "..");
const SOURCE = join(ROOT, "src");

const FALLBACK_FILES = new Set([
  "src/lib/site-content/fallback-shop.ts",
  "src/lib/site-content/fallback-pages.ts",
]);

const RULES: readonly Readonly<{ name: string; pattern: RegExp }>[] = [
  { name: "a peso price", pattern: /₱\s?\d/ },
  {
    name: "an opening time",
    pattern: /\b(1[0-2]|[1-9])(:[0-5]\d)?\s?(AM|PM)\b/,
  },
  {
    name: "a 24-hour opening time",
    pattern: /["'`](0\d|1\d|2[0-3]):[0-5]\d["'`]/,
  },
  { name: "a phone number", pattern: /(\+63|\b0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/ },
  {
    name: "an email address",
    pattern: /[A-Za-z0-9._%+-]+@(?!example\.)[A-Za-z0-9-]+\.[A-Za-z]{2,}/,
  },
  {
    name: "the shop's address",
    pattern: /Kabacan|Cotabato|Abellera|Poblacion|Pulido|\b9407\b/,
  },
  { name: "a social link", pattern: /facebook\.com\/|tiktok\.com\// },
  {
    name: "a fixed payment list",
    pattern: /Cash (and|or|·) GCash|GCash (and|or) Cash/,
  },
  {
    name: "fixed opening days",
    pattern:
      /Mon–Fri|Monday to Friday|Closed every (Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day/,
  },
  {
    name: "a fixed opening date",
    pattern: /Est\. (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/,
  },
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Blanks out comments, keeping the line numbers. */
function withoutComments(code: string) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Blanks out "e.g. …" examples in quotes or brackets. */
const withoutExamples = (line: string) =>
  line.replace(/"e\.g\. [^"]*"|\(e\.g\. [^)]*\)/g, '""');

function findings() {
  const found: string[] = [];
  for (const path of sourceFiles(SOURCE)) {
    const file = relative(ROOT, path).split("\\").join("/");
    if (FALLBACK_FILES.has(file)) continue;
    withoutComments(readFileSync(path, "utf8"))
      .split("\n")
      .forEach((line, index) => {
        const code = withoutExamples(line);
        for (const rule of RULES) {
          // the file and line only: the match could be a contact detail
          if (rule.pattern.test(code)) {
            found.push(`${file}:${index + 1} has ${rule.name}`);
          }
        }
      });
  }
  return found;
}

describe("No shop facts in the website's code (FR-086)", () => {
  it("TC-P4-222 — prices, hours, contact details, the address, links and payment methods only come from saved data", () => {
    expect(findings()).toEqual([]);
  });

  it("TC-P4-222 — the scan catches a fact written into the code", () => {
    const samples = [
      "₱49",
      "Open 11 AM",
      '"21:00"',
      "+639000000000",
      "shop@brewnicat.ph",
      "Abellera St",
      "https://www.facebook.com/brewnicat",
      "Cash and GCash",
      "Mon–Fri",
      "Est. June 2026",
    ];
    for (const sample of samples) {
      expect(
        RULES.some((rule) => rule.pattern.test(sample)),
        sample,
      ).toBe(true);
    }
    expect(withoutComments("const a = 1; // ₱49\n/* Mon–Fri */ b")).not.toMatch(
      /₱|Mon/,
    );
    expect(withoutExamples('placeholder="e.g. deliver after 3 PM"')).toBe(
      'placeholder=""',
    );
    expect(withoutExamples('"Open 11 AM (e.g. today)"')).toMatch(/11 AM/);
  });
});
