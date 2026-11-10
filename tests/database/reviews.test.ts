// @vitest-environment node

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addUser,
  ANON,
  applyMigration,
  applyRollback,
  commitAs,
  createMigratedDatabase,
  INSUFFICIENT_PRIVILEGE,
  runAs,
  signedIn,
} from "./support/database";

const REVIEWS_MIGRATION = "20261109130000_reviews.sql";

const STAFF = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_WITH_PROFILE = "22222222-2222-4222-8222-222222222222";
const CUSTOMER_NO_PROFILE = "33333333-3333-4333-8333-333333333333";
const OTHER_CUSTOMER = "44444444-4444-4444-8444-444444444444";

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await addUser(db, { id: STAFF, appMetadata: { role: "staff" } });
  await addUser(db, { id: CUSTOMER_WITH_PROFILE });
  await addUser(db, { id: CUSTOMER_NO_PROFILE });
  await addUser(db, { id: OTHER_CUSTOMER });

  // Add profile for CUSTOMER_WITH_PROFILE
  await commitAs(
    db,
    signedIn(CUSTOMER_WITH_PROFILE),
    `insert into public.customer_profiles (user_id, full_name, phone)
     values ($1, 'Juan Dela Cruz', '+639123456789')`,
    [CUSTOMER_WITH_PROFILE],
  );
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("Ratings and reviews database schema & RLS (FR-098)", () => {
  it("TC-P5-170 — anon reads only visible reviews and cannot read customer_id", async () => {
    // Attempt to select customer_id as anon - must fail with 42501 (insufficient privilege)
    const selectAll = await runAs(
      db,
      ANON,
      "select customer_id from public.reviews",
    );
    expect(selectAll.ok).toBe(false);
    if (!selectAll.ok) {
      expect(selectAll.code).toBe(INSUFFICIENT_PRIVILEGE);
    }

    // Allowed columns: id, display_name, rating, body, hidden, created_at, updated_at
    const selectAllowed = await runAs(
      db,
      ANON,
      "select id, display_name, rating, body, hidden, created_at, updated_at from public.reviews",
    );
    expect(selectAllowed.ok).toBe(true);
  });

  it("TC-P5-171 — hidden reviews are invisible to the public but visible to staff", async () => {
    // Insert a visible review and a hidden review using direct owner query
    const visibleId = "aaaa1111-aaaa-1111-aaaa-111111111111";
    const hiddenId = "bbbb2222-bbbb-2222-bbbb-222222222222";

    await db.query(
      `insert into public.reviews (id, customer_id, display_name, rating, body, hidden)
       values ($1, null, 'Guest', 5, 'Great coffee!', false),
              ($2, null, 'Guest', 1, 'Hidden spam review', true)`,
      [visibleId, hiddenId],
    );

    // Anon reads
    const anonResult = await runAs<{ id: string }>(
      db,
      ANON,
      "select id from public.reviews where id in ($1, $2)",
      [visibleId, hiddenId],
    );
    expect(anonResult.ok).toBe(true);
    if (anonResult.ok) {
      expect(anonResult.rows.map((r) => r.id)).toEqual([visibleId]);
    }

    // Regular customer reads
    const customerResult = await runAs<{ id: string }>(
      db,
      signedIn(CUSTOMER_WITH_PROFILE),
      "select id from public.reviews where id in ($1, $2)",
      [visibleId, hiddenId],
    );
    expect(customerResult.ok).toBe(true);
    if (customerResult.ok) {
      expect(customerResult.rows.map((r) => r.id)).toEqual([visibleId]);
    }

    // Staff reads both
    const staffResult = await runAs<{ id: string }>(
      db,
      signedIn(STAFF),
      "select id from public.reviews where id in ($1, $2) order by id",
      [visibleId, hiddenId],
    );
    expect(staffResult.ok).toBe(true);
    if (staffResult.ok) {
      expect(staffResult.rows.map((r) => r.id).sort()).toEqual(
        [visibleId, hiddenId].sort(),
      );
    }

    // Clean up test rows
    await db.query("delete from public.reviews where id in ($1, $2)", [
      visibleId,
      hiddenId,
    ]);
  });

  it("TC-P5-172 — post_review works as a guest and as a customer", async () => {
    // Guest post
    const guestPost = await commitAs<{ post_review: Record<string, unknown> }>(
      db,
      ANON,
      "select public.post_review(5, 'Lovely place and cats!')",
    );
    expect(guestPost.ok).toBe(true);
    if (guestPost.ok) {
      const review = guestPost.rows[0]!.post_review;
      expect(review.display_name).toBe("Guest");
      expect(review.rating).toBe(5);
      expect(review.body).toBe("Lovely place and cats!");
      expect(review.hidden).toBe(false);
      expect(review.customer_id).toBeUndefined();
    }

    // Customer post
    const customerPost = await commitAs<{
      post_review: Record<string, unknown>;
    }>(
      db,
      signedIn(CUSTOMER_WITH_PROFILE),
      "select public.post_review(4, 'Friendly staff and good takoyaki')",
    );
    expect(customerPost.ok).toBe(true);
    if (customerPost.ok) {
      const review = customerPost.rows[0]!.post_review;
      // First name from 'Juan Dela Cruz'
      expect(review.display_name).toBe("Juan");
      expect(review.rating).toBe(4);
      expect(review.body).toBe("Friendly staff and good takoyaki");
    }
  });

  it("TC-P5-173 — a customer's second post edits their one review", async () => {
    // Check initial review id
    const initial = await runAs<{ id: string; rating: number; body: string }>(
      db,
      signedIn(CUSTOMER_WITH_PROFILE),
      "select id, rating, body from public.reviews where display_name = 'Juan'",
    );
    expect(initial.ok).toBe(true);
    let originalId = "";
    if (initial.ok) {
      expect(initial.rows).toHaveLength(1);
      originalId = initial.rows[0]!.id;
    }

    // Post again as the same customer
    const secondPost = await commitAs<{
      post_review: Record<string, unknown>;
    }>(
      db,
      signedIn(CUSTOMER_WITH_PROFILE),
      "select public.post_review(5, 'Updated: Takoyaki is amazing!')",
    );
    expect(secondPost.ok).toBe(true);
    if (secondPost.ok) {
      const review = secondPost.rows[0]!.post_review;
      expect(review.id).toBe(originalId);
      expect(review.rating).toBe(5);
      expect(review.body).toBe("Updated: Takoyaki is amazing!");
    }

    // Verify in database: still only 1 review for this customer
    const total = await db.query<{ count: string }>(
      "select count(*) from public.reviews where customer_id = $1",
      [CUSTOMER_WITH_PROFILE],
    );
    expect(Number(total.rows[0]!.count)).toBe(1);
  });

  it("TC-P5-174 — a guest cannot edit", async () => {
    // Anon cannot update public.reviews directly
    const directUpdate = await runAs(
      db,
      ANON,
      "update public.reviews set body = 'Hacked by guest'",
    );
    expect(directUpdate.ok).toBe(false);
    if (!directUpdate.ok) {
      expect(directUpdate.code).toBe(INSUFFICIENT_PRIVILEGE);
    }

    // Calling post_review as anon always creates a new review, never edits
    const countBefore = await db.query<{ count: string }>(
      "select count(*) from public.reviews where customer_id is null",
    );
    const beforeVal = Number(countBefore.rows[0]!.count);

    const guestPost2 = await commitAs(
      db,
      ANON,
      "select public.post_review(4, 'Second guest review')",
    );
    expect(guestPost2.ok).toBe(true);

    const countAfter = await db.query<{ count: string }>(
      "select count(*) from public.reviews where customer_id is null",
    );
    expect(Number(countAfter.rows[0]!.count)).toBe(beforeVal + 1);
  });

  it("TC-P5-175 — display_name comes from customer_profiles.full_name or 'Customer', not user input", async () => {
    // CUSTOMER_NO_PROFILE has no customer_profiles row -> display_name must be 'Customer'
    const postNoProfile = await commitAs<{
      post_review: Record<string, unknown>;
    }>(
      db,
      signedIn(CUSTOMER_NO_PROFILE),
      "select public.post_review(5, 'Coffee was great!')",
    );
    expect(postNoProfile.ok).toBe(true);
    if (postNoProfile.ok) {
      expect(postNoProfile.rows[0]!.post_review.display_name).toBe("Customer");
    }

    // OTHER_CUSTOMER with multi-word name
    await commitAs(
      db,
      signedIn(OTHER_CUSTOMER),
      `insert into public.customer_profiles (user_id, full_name, phone)
       values ($1, 'Maria Lourdes Santos', '+639123456788')`,
      [OTHER_CUSTOMER],
    );

    const postWithProfile = await commitAs<{
      post_review: Record<string, unknown>;
    }>(
      db,
      signedIn(OTHER_CUSTOMER),
      "select public.post_review(5, 'Matcha latte is best')",
    );
    expect(postWithProfile.ok).toBe(true);
    if (postWithProfile.ok) {
      expect(postWithProfile.rows[0]!.post_review.display_name).toBe("Maria");
    }
  });

  it("TC-P5-176 — checks rating and length bounds", async () => {
    // Invalid rating (0, 6, null)
    for (const badRating of [0, 6, -1, 10]) {
      const result = await runAs(
        db,
        ANON,
        `select public.post_review(${badRating}, 'Good coffee')`,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/Rating must be between 1 and 5/);
      }
    }

    // Empty or whitespace-only body
    for (const badBody of ["", "   ", "\t\n  "]) {
      const result = await runAs(db, ANON, "select public.post_review(5, $1)", [
        badBody,
      ]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(
          /Review text must be between 1 and 500 characters/,
        );
      }
    }

    // Body exceeding 500 characters
    const longBody = "A".repeat(501);
    const longResult = await runAs(
      db,
      ANON,
      "select public.post_review(5, $1)",
      [longBody],
    );
    expect(longResult.ok).toBe(false);
    if (!longResult.ok) {
      expect(longResult.message).toMatch(
        /Review text must be between 1 and 500 characters/,
      );
    }

    // Body exactly 500 characters succeeds
    const exact500 = "B".repeat(500);
    const validResult = await runAs(
      db,
      ANON,
      "select public.post_review(5, $1)",
      [exact500],
    );
    expect(validResult.ok).toBe(true);
  });

  it("TC-P5-177 — database-wide guest limit enforces max 10 guest reviews in 10 minutes", async () => {
    // Clear all guest reviews to start clean for this test
    await db.query("delete from public.reviews where customer_id is null");

    // Post 10 guest reviews (should all succeed)
    for (let i = 1; i <= 10; i++) {
      const res = await commitAs(db, ANON, "select public.post_review(5, $1)", [
        `Guest review number ${i}`,
      ]);
      expect(res.ok).toBe(true);
    }

    // 11th guest review must be rejected
    const floodRes = await runAs(
      db,
      ANON,
      "select public.post_review(5, '11th guest review')",
    );
    expect(floodRes.ok).toBe(false);
    if (!floodRes.ok) {
      expect(floodRes.message).toMatch(/Too many guest reviews/);
    }

    // A signed-in customer is NOT blocked by guest limit
    const customerRes = await runAs(
      db,
      signedIn(CUSTOMER_WITH_PROFILE),
      "select public.post_review(5, 'Customer review still works')",
    );
    expect(customerRes.ok).toBe(true);
  });

  it("TC-P5-178 — non-staff cannot hide reviews", async () => {
    const reviewId = "cccc3333-cccc-3333-cccc-333333333333";
    await db.query(
      `insert into public.reviews (id, customer_id, display_name, rating, body, hidden)
       values ($1, null, 'Guest', 5, 'Review to test hiding', false)`,
      [reviewId],
    );

    // Anon tries to hide
    const anonHide = await runAs(
      db,
      ANON,
      "update public.reviews set hidden = true where id = $1",
      [reviewId],
    );
    expect(anonHide.ok).toBe(false);
    if (!anonHide.ok) {
      expect(anonHide.code).toBe(INSUFFICIENT_PRIVILEGE);
    }

    // Non-staff customer tries to hide
    const customerHide = await runAs(
      db,
      signedIn(CUSTOMER_WITH_PROFILE),
      "update public.reviews set hidden = true where id = $1",
      [reviewId],
    );
    // Since customer has update (hidden) grant, but RLS policy restricts to staff:
    // With RLS, 0 rows are updated
    expect(customerHide.ok ? customerHide.affectedRows : 0).toBe(0);

    // Verify row is still not hidden
    const check = await db.query<{ hidden: boolean }>(
      "select hidden from public.reviews where id = $1",
      [reviewId],
    );
    expect(check.rows[0]!.hidden).toBe(false);

    await db.query("delete from public.reviews where id = $1", [reviewId]);
  });

  it("TC-P5-179 — staff can hide reviews, but cannot modify text or rating", async () => {
    const reviewId = "dddd4444-dddd-4444-dddd-444444444444";
    await db.query(
      `insert into public.reviews (id, customer_id, display_name, rating, body, hidden)
       values ($1, null, 'Guest', 5, 'Genuine review', false)`,
      [reviewId],
    );

    // Staff hides review
    const staffHide = await commitAs(
      db,
      signedIn(STAFF),
      "update public.reviews set hidden = true where id = $1",
      [reviewId],
    );
    expect(staffHide.ok).toBe(true);
    if (staffHide.ok) {
      expect(staffHide.affectedRows).toBe(1);
    }

    const check = await db.query<{ hidden: boolean }>(
      "select hidden from public.reviews where id = $1",
      [reviewId],
    );
    expect(check.rows[0]!.hidden).toBe(true);

    // Staff tries to alter review text (permission denied because update grant is hidden only)
    const staffEditBody = await runAs(
      db,
      signedIn(STAFF),
      "update public.reviews set body = 'Tampered text' where id = $1",
      [reviewId],
    );
    expect(staffEditBody.ok).toBe(false);
    if (!staffEditBody.ok) {
      expect(staffEditBody.code).toBe(INSUFFICIENT_PRIVILEGE);
    }

    // Staff tries to alter rating
    const staffEditRating = await runAs(
      db,
      signedIn(STAFF),
      "update public.reviews set rating = 1 where id = $1",
      [reviewId],
    );
    expect(staffEditRating.ok).toBe(false);
    if (!staffEditRating.ok) {
      expect(staffEditRating.code).toBe(INSUFFICIENT_PRIVILEGE);
    }

    await db.query("delete from public.reviews where id = $1", [reviewId]);
  });

  it("TC-P5-180 — my_review() returns the customer's review or null", async () => {
    // Anon returns null
    const anonMyReview = await runAs<{ my_review: unknown }>(
      db,
      ANON,
      "select public.my_review()",
    );
    expect(anonMyReview.ok).toBe(true);
    if (anonMyReview.ok) {
      expect(anonMyReview.rows[0]!.my_review).toBeNull();
    }

    // Customer with existing review returns their review
    const customerMyReview = await runAs<{
      my_review: Record<string, unknown>;
    }>(db, signedIn(CUSTOMER_WITH_PROFILE), "select public.my_review()");
    expect(customerMyReview.ok).toBe(true);
    if (customerMyReview.ok) {
      const rev = customerMyReview.rows[0]!.my_review;
      expect(rev).not.toBeNull();
      expect(rev.display_name).toBe("Juan");
      expect(rev.customer_id).toBeUndefined(); // never exposes customer_id
    }

    // Customer without review returns null
    const freshUser = "55555555-5555-5555-8555-555555555555";
    await addUser(db, { id: freshUser });
    const freshReview = await runAs<{ my_review: unknown }>(
      db,
      signedIn(freshUser),
      "select public.my_review()",
    );
    expect(freshReview.ok).toBe(true);
    if (freshReview.ok) {
      expect(freshReview.rows[0]!.my_review).toBeNull();
    }
  });

  it("TC-P5-181 — rollback script removes table and functions cleanly, and migration reapplies", async () => {
    // Apply rollback
    await applyRollback(db, REVIEWS_MIGRATION);

    // Verify table does not exist
    const checkTable = await db.query<{ exists: boolean }>(
      "select exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'reviews')",
    );
    expect(checkTable.rows[0]!.exists).toBe(false);

    // Verify functions do not exist
    const checkPostFn = await db.query<{ exists: boolean }>(
      "select exists (select 1 from pg_proc where proname = 'post_review')",
    );
    expect(checkPostFn.rows[0]!.exists).toBe(false);

    const checkMyReviewFn = await db.query<{ exists: boolean }>(
      "select exists (select 1 from pg_proc where proname = 'my_review')",
    );
    expect(checkMyReviewFn.rows[0]!.exists).toBe(false);

    // Reapply migration to confirm idempotency/clean state
    await applyMigration(db, REVIEWS_MIGRATION);

    const recheckTable = await db.query<{ exists: boolean }>(
      "select exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'reviews')",
    );
    expect(recheckTable.rows[0]!.exists).toBe(true);
  });
});
