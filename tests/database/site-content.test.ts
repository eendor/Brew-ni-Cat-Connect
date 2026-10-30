// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import {
  fallbackAbout,
  fallbackGallery,
} from "@/lib/site-content/fallback-pages";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import { loadSiteContent } from "@/lib/site-content/load";
import {
  SITE_CONTENT_SECTIONS,
  type SiteContent,
  type SiteContentRow,
  type SiteContentSection,
} from "@/lib/site-content/types";
import { parseSection } from "@/lib/site-content/validate";

import {
  addUser,
  ANON,
  type Actor,
  applyMigration,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const SITE_CONTENT = "20261030120000_site_content.sql";
const CHECK_VIOLATION = "23514";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";

const SHIPPED: SiteContent = {
  ...fallbackShop,
  about: fallbackAbout,
  gallery: fallbackGallery,
};

type Json = Record<string, unknown>;

/** A copy of the shipped section with one change made to it. */
function changed<S extends SiteContentSection>(
  section: S,
  change: (copy: Json) => void,
): Json {
  const copy = structuredClone(SHIPPED[section]) as unknown as Json;
  change(copy);
  return copy;
}

const days = (copy: Json) => copy.days as Json;
const list = (copy: Json, key: string) => copy[key] as Json[];
const photos = (copy: Json) => list(copy, "photos");

type Case = Readonly<{
  section: SiteContentSection;
  what: string;
  value: unknown;
}>;

/** Content the website can't show: the database and the website refuse it. */
const REFUSED: readonly Case[] = [
  { section: "hours", what: "not an object", value: null },
  {
    section: "hours",
    what: "a missing day",
    value: changed("hours", (c) => delete days(c).sunday),
  },
  {
    section: "hours",
    what: "an unknown day",
    value: changed("hours", (c) => (days(c).funday = null)),
  },
  {
    section: "hours",
    what: "closing before opening",
    value: changed(
      "hours",
      (c) => (days(c).monday = { opens: "21:00", closes: "11:00" }),
    ),
  },
  {
    section: "hours",
    what: "opening and closing at the same time",
    value: changed(
      "hours",
      (c) => (days(c).monday = { opens: "11:00", closes: "11:00" }),
    ),
  },
  {
    section: "hours",
    what: "a 12-hour time",
    value: changed(
      "hours",
      (c) => (days(c).monday = { opens: "11:00 AM", closes: "21:00" }),
    ),
  },
  {
    section: "hours",
    what: "24:00",
    value: changed(
      "hours",
      (c) => (days(c).monday = { opens: "11:00", closes: "24:00" }),
    ),
  },
  {
    section: "hours",
    what: "a time as a number",
    value: changed(
      "hours",
      (c) => (days(c).monday = { opens: 11, closes: "21:00" }),
    ),
  },
  {
    section: "hours",
    what: "a note on two lines",
    value: changed("hours", (c) => (c.note = "Closed\ntoday")),
  },
  {
    section: "hours",
    what: "a note over 300 characters",
    value: changed("hours", (c) => (c.note = "a".repeat(301))),
  },
  {
    section: "hours",
    what: "a note starting with a space",
    value: changed("hours", (c) => (c.note = " Check Facebook.")),
  },
  {
    section: "hours",
    what: "a note ending with a no-break space",
    value: changed("hours", (c) => (c.note = "Check Facebook. ")),
  },
  {
    section: "hours",
    what: "an unknown key",
    value: changed("hours", (c) => (c.extra = true)),
  },
  {
    section: "contact",
    what: "a phone number with letters",
    value: changed("contact", (c) => (c.phone = "CALL-US")),
  },
  {
    section: "contact",
    what: "a phone number with too few digits",
    value: changed("contact", (c) => (c.phone = "12345")),
  },
  {
    section: "contact",
    what: "a phone number with too many digits",
    value: changed("contact", (c) => (c.phone = "+1 234 567 890 123 45")),
  },
  {
    section: "contact",
    what: "an email without a domain",
    value: changed("contact", (c) => (c.email = "shop@localhost")),
  },
  {
    section: "contact",
    what: "an email with a space",
    value: changed("contact", (c) => (c.email = "shop @example.com")),
  },
  {
    section: "address",
    what: "a postal code as a number",
    value: changed("address", (c) => (c.postalCode = 9407)),
  },
  {
    section: "address",
    what: "a three-digit postal code",
    value: changed("address", (c) => (c.postalCode = "940")),
  },
  {
    section: "address",
    what: "an http map link",
    value: changed("address", (c) => (c.mapUrl = "http://maps.example.com")),
  },
  {
    section: "address",
    what: "a map link without a domain",
    value: changed("address", (c) => (c.mapUrl = "https://localhost")),
  },
  {
    section: "address",
    what: "an empty street",
    value: changed("address", (c) => (c.street = "")),
  },
  {
    section: "address",
    what: "a landmark over 160 characters",
    value: changed("address", (c) => (c.landmark = "b".repeat(161))),
  },
  {
    section: "address",
    what: "a missing country",
    value: changed("address", (c) => delete c.country),
  },
  {
    section: "payments",
    what: "no payment methods",
    value: changed("payments", (c) => (c.methods = [])),
  },
  {
    section: "payments",
    what: "the same method twice",
    value: changed("payments", (c) => (c.methods = ["Cash", "Cash"])),
  },
  {
    section: "payments",
    what: "seven methods",
    value: changed(
      "payments",
      (c) => (c.methods = ["A", "B", "C", "D", "E", "F", "G"]),
    ),
  },
  {
    section: "payments",
    what: "a method over 30 characters",
    value: changed("payments", (c) => (c.methods = ["c".repeat(31)])),
  },
  {
    section: "payments",
    what: "a QR code from another site",
    value: changed(
      "payments",
      (c) => (c.qrCode = { src: "https://example.com/qr.png", alt: "QR" }),
    ),
  },
  {
    section: "payments",
    what: "a QR code path with ..",
    value: changed(
      "payments",
      (c) => (c.qrCode = { src: "/images/../secret.png", alt: "QR" }),
    ),
  },
  {
    section: "payments",
    what: "a QR code path with //",
    value: changed(
      "payments",
      (c) => (c.qrCode = { src: "/images//qr.png", alt: "QR" }),
    ),
  },
  {
    section: "payments",
    what: "a GIF QR code",
    value: changed(
      "payments",
      (c) => (c.qrCode = { src: "/images/payment/qr.gif", alt: "QR" }),
    ),
  },
  {
    section: "notice",
    what: "a notice over 300 characters",
    value: { text: "n".repeat(301) },
  },
  {
    section: "notice",
    what: "a notice with a tab",
    value: { text: "Closed\ttoday" },
  },
  {
    section: "notice",
    what: "a notice ending with an ideographic space",
    value: { text: "Closed today　" },
  },
  { section: "notice", what: "a number", value: { text: 5 } },
  {
    section: "social",
    what: "a javascript: link",
    value: changed("social", (c) => (c.facebook = "javascript:alert(1)")),
  },
  {
    section: "social",
    what: "a link with a space",
    value: changed("social", (c) => (c.facebook = "https://exa mple.com")),
  },
  {
    section: "social",
    what: "a missing link",
    value: changed("social", (c) => delete c.tiktok),
  },
  {
    section: "riders",
    what: "nine partners",
    value: changed("riders", (c) => {
      const partners = list(c, "partners");
      c.partners = Array.from({ length: 9 }, (_, i) => partners[i % 3]);
    }),
  },
  {
    section: "riders",
    what: "a logo from another site",
    value: changed(
      "riders",
      (c) => (list(c, "partners")[0]!.logo = "https://example.com/logo.jpg"),
    ),
  },
  {
    section: "riders",
    what: "an http page link",
    value: changed(
      "riders",
      (c) => (list(c, "partners")[0]!.href = "http://facebook.com/rider"),
    ),
  },
  {
    section: "riders",
    what: "an unknown partner key",
    value: changed("riders", (c) => (list(c, "partners")[0]!.phone = "1")),
  },
  {
    section: "about",
    what: "a day that doesn't exist",
    value: changed("about", (c) => (c.openedOn = "2026-02-30")),
  },
  {
    section: "about",
    what: "a date last century",
    value: changed("about", (c) => (c.openedOn = "1999-12-31")),
  },
  {
    section: "about",
    what: "a date without zero padding",
    value: changed("about", (c) => (c.openedOn = "2026-6-12")),
  },
  {
    section: "about",
    what: "two collage photos",
    value: changed("about", (c) => (c.photos = photos(c).slice(0, 2))),
  },
  {
    section: "about",
    what: "no story",
    value: changed("about", (c) => (c.story = [])),
  },
  {
    section: "about",
    what: "a story paragraph over 1000 characters",
    value: changed("about", (c) => (c.story = ["s".repeat(1001)])),
  },
  {
    section: "about",
    what: "a hero title over 80 characters",
    value: changed("about", (c) => (c.heroTitle = "t".repeat(81))),
  },
  {
    section: "about",
    what: "seven cat rules",
    value: changed("about", (c) => {
      c.catRules = Array.from({ length: 7 }, () => ({
        title: "Rule",
        text: "Be kind.",
      }));
    }),
  },
  {
    section: "about",
    what: "a photo without alt text",
    value: changed("about", (c) => delete (c.homePhoto as Json).alt),
  },
  {
    section: "gallery",
    what: "no photos",
    value: { photos: [] },
  },
  {
    section: "gallery",
    what: "81 photos",
    value: changed("gallery", (c) => {
      const all = photos(c);
      c.photos = Array.from({ length: 81 }, (_, i) => all[i % all.length]);
    }),
  },
  {
    section: "gallery",
    what: "a flag that isn't true or false",
    value: changed("gallery", (c) => (photos(c)[0]!.featured = "yes")),
  },
  {
    section: "gallery",
    what: "an unknown flag",
    value: changed("gallery", (c) => (photos(c)[0]!.hidden = true)),
  },
  {
    section: "gallery",
    what: "a BMP photo",
    value: changed(
      "gallery",
      (c) => (photos(c)[0]!.src = "/images/gallery/photo.bmp"),
    ),
  },
];

/** Changes the owner can make: the database and the website accept them. */
const ACCEPTED: readonly Case[] = [
  {
    section: "hours",
    what: "open every day with no note",
    value: {
      days: Object.fromEntries(
        Object.keys(SHIPPED.hours.days).map((day) => [
          day,
          { opens: "07:30", closes: "23:59" },
        ]),
      ),
      note: "",
    },
  },
  {
    section: "hours",
    what: "closed every day",
    value: changed("hours", (c) => {
      for (const day of Object.keys(days(c))) days(c)[day] = null;
    }),
  },
  {
    section: "contact",
    what: "a number with a country code and brackets",
    value: { phone: "+63 (900) 000-0000", email: "hello@example.com" },
  },
  {
    section: "address",
    what: "no landmark",
    value: changed("address", (c) => (c.landmark = "")),
  },
  {
    section: "payments",
    what: "three methods and no QR code",
    value: { methods: ["Cash", "GCash", "Maya"], qrCode: null },
  },
  {
    section: "notice",
    what: "a notice with an apostrophe",
    value: { text: "Closed on Nov 1 for All Saints' Day." },
  },
  {
    section: "social",
    what: "no links",
    value: { facebook: "", facebookPhotos: "", tiktok: "" },
  },
  { section: "riders", what: "no partners", value: { partners: [] } },
  {
    section: "about",
    what: "a leap day and no cat rules",
    value: changed("about", (c) => {
      c.openedOn = "2028-02-29";
      c.catRules = [];
    }),
  },
  {
    section: "gallery",
    what: "one photo without flags",
    value: { photos: [{ src: "/images/gallery/one.webp", alt: "The bar" }] },
  },
];

let db: PGlite;

const STAFF_ACTOR = signedIn(STAFF);

const save = (actor: Actor, section: string, value: unknown) =>
  runAs(
    db,
    actor,
    "update public.site_content set content = $1::jsonb where section = $2",
    [JSON.stringify(value), section],
  );

async function contentOf(section: SiteContentSection) {
  const result = await db.query<{ content: unknown }>(
    "select content from public.site_content where section = $1",
    [section],
  );
  return result.rows[0]?.content;
}

async function auditRows() {
  const result = await db.query<{
    changed_by: string | null;
    action: string;
    section: string;
    old_content: unknown;
    new_content: unknown;
  }>(
    `select changed_by, action, section, old_content, new_content
     from private.site_content_audit
     order by id`,
  );
  return result.rows;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER });
}, 60_000);

describe("Website content table (FR-085 – FR-087)", () => {
  it("TC-P4-206 — anyone can read every section, and it starts as the content the website shipped with", async () => {
    for (const actor of [ANON, signedIn(CUSTOMER), STAFF_ACTOR]) {
      const result = await runAs<SiteContentRow>(
        db,
        actor,
        "select section, content from public.site_content",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.rows.map((row) => row.section).sort()).toEqual(
        [...SITE_CONTENT_SECTIONS].sort(),
      );
      // the website's own read of those rows uses every one of them
      const loaded = await loadSiteContent(async () => result.rows);
      expect(Object.values(loaded.sources)).not.toContain("fallback");
      expect(loaded.content).toEqual(SHIPPED);
    }
  });

  it("TC-P4-207 — staff can change a section, and the change time moves", async () => {
    const before = await db.query<{ updated_at: Date }>(
      "select updated_at from public.site_content where section = 'notice'",
    );
    const result = await runAs(
      db,
      STAFF_ACTOR,
      `update public.site_content set content = $1::jsonb
       where section = 'notice'
       returning content, updated_at`,
      [JSON.stringify({ text: "Closed on Nov 1." })],
    );
    expect(result).toMatchObject({
      ok: true,
      affectedRows: 1,
      rows: [{ content: { text: "Closed on Nov 1." } }],
    });
    if (result.ok) {
      expect(
        new Date(result.rows[0]!.updated_at as string).getTime(),
      ).toBeGreaterThan(before.rows[0]!.updated_at.getTime());
    }
  });

  it("TC-P4-208 — no one else can change it, and no one can add, remove or rename a section through the API", async () => {
    const notice = { text: "Free cake." };
    expect(await save(ANON, "notice", notice)).toMatchObject({
      ok: false,
      code: INSUFFICIENT_PRIVILEGE,
    });
    // a customer's update matches no rows
    expect(await save(signedIn(CUSTOMER), "notice", notice)).toMatchObject({
      ok: true,
      affectedRows: 0,
    });
    expect(await contentOf("notice")).toEqual(SHIPPED.notice);

    for (const actor of [ANON, signedIn(CUSTOMER), STAFF_ACTOR]) {
      for (const sql of [
        "insert into public.site_content (section, content) values ('notice', '{\"text\":\"\"}')",
        "delete from public.site_content where section = 'notice'",
        "update public.site_content set section = 'gallery' where section = 'notice'",
        "update public.site_content set updated_at = now() where section = 'notice'",
      ]) {
        expect(await runAs(db, actor, sql), sql).toMatchObject({
          ok: false,
          code: INSUFFICIENT_PRIVILEGE,
        });
      }
    }
  });

  it.each(REFUSED)(
    "TC-P4-209 — $section with $what is refused by the database and by the website",
    async ({ section, value }) => {
      expect(parseSection(section, value)).toBeNull();
      expect(await save(STAFF_ACTOR, section, value)).toMatchObject({
        ok: false,
        code: CHECK_VIOLATION,
      });
    },
  );

  it.each(ACCEPTED)(
    "TC-P4-209 — $section with $what is accepted by the database and by the website",
    async ({ section, value }) => {
      expect(parseSection(section, value)).toEqual(value);
      expect(await save(STAFF_ACTOR, section, value)).toMatchObject({
        ok: true,
        affectedRows: 1,
      });
    },
  );

  it("TC-P4-210 — each change is recorded with who made it and the old and new content", async () => {
    const start = (await auditRows()).length;
    const hours = changed("hours", (c) => (c.note = "Open late on Fridays."));

    expect(
      await commitAs(
        db,
        STAFF_ACTOR,
        "update public.site_content set content = $1::jsonb where section = 'hours'",
        [JSON.stringify(hours)],
      ),
    ).toMatchObject({ ok: true, affectedRows: 1 });
    // saving the same content again records nothing
    await commitAs(
      db,
      STAFF_ACTOR,
      "update public.site_content set content = $1::jsonb where section = 'hours'",
      [JSON.stringify(hours)],
    );
    // a refused save records nothing either
    await commitAs(
      db,
      STAFF_ACTOR,
      "update public.site_content set content = '{\"text\": 5}'::jsonb where section = 'notice'",
    );
    // a change from the dashboard has no account
    await db.query(
      "update public.site_content set content = $1::jsonb where section = 'hours'",
      [JSON.stringify(SHIPPED.hours)],
    );

    const rows = (await auditRows()).slice(start);
    expect(rows).toEqual([
      {
        changed_by: STAFF,
        action: "update",
        section: "hours",
        old_content: SHIPPED.hours,
        new_content: hours,
      },
      {
        changed_by: null,
        action: "update",
        section: "hours",
        old_content: hours,
        new_content: SHIPPED.hours,
      },
    ]);
  });

  it("TC-P4-211 — the change history and the rule checks can't be reached through the API", async () => {
    for (const actor of [ANON, signedIn(CUSTOMER), STAFF_ACTOR]) {
      for (const sql of [
        "select * from private.site_content_audit",
        "select private.is_valid_site_content('notice', '{\"text\":\"\"}'::jsonb)",
      ]) {
        expect(await runAs(db, actor, sql), sql).toMatchObject({
          ok: false,
          code: INSUFFICIENT_PRIVILEGE,
        });
      }
    }
  });

  it("TC-P4-212 — the undo script removes the table, its history and its checks, and the migration applies again", async () => {
    const fresh = await createMigratedDatabase(SITE_CONTENT);
    await applyRollback(fresh, SITE_CONTENT);
    const left = await fresh.query<{ tables: number; functions: number }>(
      `select
         (select count(*)::int from pg_class
          where relname in ('site_content', 'site_content_audit')) as tables,
         (select count(*)::int from pg_proc as p
          join pg_namespace as n on n.oid = p.pronamespace
          where n.nspname = 'private'
            and (p.proname like 'site\\_%' or p.proname like '%site_content%')
         ) as functions`,
    );
    expect(left.rows[0]).toEqual({ tables: 0, functions: 0 });

    await applyMigration(fresh, SITE_CONTENT);
    const again = await fresh.query<{ count: number }>(
      "select count(*)::int as count from public.site_content",
    );
    expect(again.rows[0]?.count).toBe(SITE_CONTENT_SECTIONS.length);
    await fresh.close();
  }, 60_000);
});
