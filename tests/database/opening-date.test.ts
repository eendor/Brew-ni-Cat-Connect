// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fallbackAbout } from "@/lib/site-content/fallback-pages";

import {
  applyMigration,
  applyRollback,
  createMigratedDatabase,
} from "./support/database";

const OPENING_DATE = "20261118120000_opening_date_june_8.sql";

type About = { openedOn: string; story: string[]; intro: string };

let db: PGlite;

async function about(): Promise<About> {
  const result = await db.query<{ content: About }>(
    "select content from public.site_content where section = 'about'",
  );
  return result.rows[0]!.content;
}

beforeAll(async () => {
  db = await createMigratedDatabase(OPENING_DATE);
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("Opening date corrected to June 8, 2026", () => {
  it("changes the date and the story sentence, like the website's copy (TC-P9-084)", async () => {
    const saved = await about();
    expect(saved.openedOn).toBe("2026-06-08");
    expect(saved.story[0]).toContain("opened on June 8, 2026");
    expect(saved.story).toEqual(fallbackAbout.story);
    expect(saved.openedOn).toBe(fallbackAbout.openedOn);
  });

  it("undoes, and keeps the owner's own wording when re-applied (TC-P9-085)", async () => {
    await applyRollback(db, OPENING_DATE);
    let saved = await about();
    expect(saved.openedOn).toBe("2026-06-12");
    expect(saved.story[0]).toContain("opened on June 12, 2026");

    // The owner rewrote the intro in the POS: re-applying keeps it.
    await db.query(
      "update public.site_content set content = jsonb_set(content, '{intro}', '\"Our own words.\"') where section = 'about'",
    );
    await applyMigration(db, OPENING_DATE);
    saved = await about();
    expect(saved.openedOn).toBe("2026-06-08");
    expect(saved.intro).toBe("Our own words.");

    // A date the owner already changed is left alone.
    await db.query(
      "update public.site_content set content = jsonb_set(content, '{openedOn}', '\"2026-06-09\"') where section = 'about'",
    );
    await applyMigration(db, OPENING_DATE);
    expect((await about()).openedOn).toBe("2026-06-09");
  });
});
