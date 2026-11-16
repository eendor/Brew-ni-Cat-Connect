// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const MIGRATION = "20261117150000_google_profile_photos.sql";
const PHOTO = "https://lh3.googleusercontent.com/a/ACg8ocTestPhoto=s96-c";
const WITH_PHOTO = "55555555-5555-4555-8555-555555555555";
const PICTURE_ONLY = "66666666-6666-4666-8666-666666666666";
const BAD_PHOTO = "77777777-7777-4777-8777-777777777777";

type Row = { review: Record<string, unknown> };

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await addUser(db, {
    id: WITH_PHOTO,
    userMetadata: { avatar_url: PHOTO, picture: PHOTO },
  });
  await addUser(db, { id: PICTURE_ONLY, userMetadata: { picture: PHOTO } });
  await addUser(db, {
    id: BAD_PHOTO,
    userMetadata: { avatar_url: "https://evil.example.com/track.png" },
  });
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("Google profile photos on reviews (FR-119)", () => {
  it("TC-P9-074 — a signed-in review carries the Google photo from Auth; guests never do", async () => {
    const mine = await commitAs<Row>(
      db,
      signedIn(WITH_PHOTO),
      "select public.post_review(5, 'Great coffee') as review",
    );
    expect(mine.ok && mine.rows[0]?.review.avatar_url).toBe(PHOTO);

    const pictureOnly = await commitAs<Row>(
      db,
      signedIn(PICTURE_ONLY),
      "select public.post_review(4, 'Nice cats') as review",
    );
    expect(pictureOnly.ok && pictureOnly.rows[0]?.review.avatar_url).toBe(
      PHOTO,
    );

    const guest = await commitAs<Row>(
      db,
      ANON,
      "select public.post_review(5, 'Guest visit', true) as review",
    );
    expect(guest.ok && guest.rows[0]?.review.avatar_url).toBeNull();

    const listed = await runAs<{ avatar_url: string | null }>(
      db,
      ANON,
      "select avatar_url from public.reviews where avatar_url is not null",
    );
    expect(listed.ok && listed.rows.length).toBe(2);
  });

  it("TC-P9-075 — turning the photo off clears it, and only Google photo addresses are kept", async () => {
    const off = await commitAs<Row>(
      db,
      signedIn(WITH_PHOTO),
      "select public.post_review(5, 'Great coffee', false) as review",
    );
    expect(off.ok && off.rows[0]?.review.avatar_url).toBeNull();

    const mine = await runAs<{ review: Record<string, unknown> | null }>(
      db,
      signedIn(WITH_PHOTO),
      "select public.my_review() as review",
    );
    expect(mine.ok && mine.rows[0]?.review?.avatar_url).toBeNull();

    const bad = await commitAs<Row>(
      db,
      signedIn(BAD_PHOTO),
      "select public.post_review(3, 'Okay', true) as review",
    );
    expect(bad.ok && bad.rows[0]?.review.avatar_url).toBeNull();

    const forged = await runAs(
      db,
      { role: "service_role" },
      "update public.reviews set avatar_url = 'https://evil.example.com/x.png'",
    );
    expect(forged.ok).toBe(false);

    const direct = await runAs(
      db,
      signedIn(BAD_PHOTO),
      `update public.reviews set avatar_url = '${PHOTO}'`,
    );
    expect(direct.ok).toBe(false);
    if (!direct.ok) expect(direct.code).toBe(INSUFFICIENT_PRIVILEGE);

    const helper = await runAs(
      db,
      ANON,
      `select private.google_avatar_url('${WITH_PHOTO}')`,
    );
    expect(helper.ok).toBe(false);
  });

  it("TC-P9-076 — the rollback restores the two-argument post_review", async () => {
    await applyRollback(db, MIGRATION);
    const back = await commitAs<Row>(
      db,
      signedIn(PICTURE_ONLY),
      "select public.post_review(5, 'Back again') as review",
    );
    expect(back.ok && back.rows[0]?.review.avatar_url).toBeUndefined();
    const column = await runAs(
      db,
      ANON,
      "select avatar_url from public.reviews",
    );
    expect(column.ok).toBe(false);
  });
});
