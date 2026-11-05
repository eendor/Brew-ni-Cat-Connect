// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fallbackShop } from "@/lib/site-content/fallback-shop";
import type { RiderPartner } from "@/lib/site-content/types";

import {
  applyMigration,
  applyRollback,
  createMigratedDatabase,
} from "./support/database";

const MORE_RIDERS = "20261104120000_more_rider_partners.sql";

const GUTOMKA: RiderPartner = {
  name: "GutomKa Express Kabacan",
  href: "https://www.facebook.com/GutomKaExpressKabacan",
  logo: "/images/riders/gutomka-express.jpg",
};
const OZMO: RiderPartner = {
  name: "OZMO Delivery Kabacan 2.0",
  href: "https://www.facebook.com/profile.php?id=61595537931810",
  logo: "/images/riders/ozmo-delivery.jpg",
};
const MINUTE: RiderPartner = {
  name: "Minute Delivery Kabacan",
  href: "https://www.facebook.com/MinuteDeliveryKabacan2",
  logo: "/images/riders/minute-delivery.jpg",
};
const TOWN: RiderPartner = {
  name: "Town Riders",
  href: "https://www.facebook.com/townriders",
  logo: "/images/riders/town-riders.jpg",
};

// The riders that were listed before this change.
const EARLIER = fallbackShop.riders.partners.filter(
  (rider) =>
    ![GUTOMKA, OZMO, MINUTE].some((added) => added.href === rider.href),
);

let db: PGlite;

async function savedRiders(): Promise<RiderPartner[]> {
  const result = await db.query<{ content: { partners: RiderPartner[] } }>(
    "select content from public.site_content where section = 'riders'",
  );
  return result.rows[0]?.content.partners ?? [];
}

async function saveRiders(partners: readonly RiderPartner[]) {
  await db.query(
    "update public.site_content set content = $1::jsonb where section = 'riders'",
    [JSON.stringify({ partners })],
  );
}

beforeAll(async () => {
  db = await createMigratedDatabase();
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("More local rider services (FR-085)", () => {
  it("lists GutomKa Express first and the other two after the earlier riders, like the website (TC-P6-211)", async () => {
    expect(EARLIER.map((rider) => rider.name)).toEqual([
      "Papa's Delivery",
      "Momshie's Pamalengke and Delivery Kabacan",
      "M&S Delivery Express Kabacan",
    ]);
    const saved = await savedRiders();
    expect(saved).toEqual([GUTOMKA, ...EARLIER, OZMO, MINUTE]);
    expect(saved).toEqual(fallbackShop.riders.partners);

    // the change history keeps it, with no account since no one signed in
    const history = await db.query<{
      changed_by: string | null;
      action: string;
      before: number;
      after: number;
    }>(
      `select changed_by, action,
         jsonb_array_length(old_content -> 'partners') as before,
         jsonb_array_length(new_content -> 'partners') as after
       from private.site_content_audit
       where section = 'riders'
       order by id
       limit 1`,
    );
    expect(history.rows).toEqual([
      { changed_by: null, action: "update", before: 3, after: 6 },
    ]);
  });

  it("the undo script takes off only the three new services, and the migration applies again (TC-P6-212)", async () => {
    await applyRollback(db, MORE_RIDERS);
    expect(await savedRiders()).toEqual(EARLIER);

    await applyMigration(db, MORE_RIDERS);
    expect(await savedRiders()).toEqual(fallbackShop.riders.partners);
  });

  it("keeps the riders the owner saved and doesn't list a service twice (TC-P6-213)", async () => {
    await applyRollback(db, MORE_RIDERS);
    // the owner took the first rider off and added Minute Delivery and one more
    const ownerList = [...EARLIER.slice(1), MINUTE, TOWN];
    await saveRiders(ownerList);

    await applyMigration(db, MORE_RIDERS);
    expect(await savedRiders()).toEqual([GUTOMKA, ...ownerList, OZMO]);
  });
});
