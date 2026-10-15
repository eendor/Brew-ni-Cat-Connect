# RLS restore draft (not applied)

Status: draft only. Do not run against production until Lead Developer review.

## Why

Publishable-key probes on 2026-10-16 (Asia/Manila) still showed public reachability for business tables while the Menu catalog kept working. Counts from Prefer count=exact with Range 0-0 (no unrelated row bodies retrieved):

| Relation | HTTP | Count |
| --- | --- | --- |
| categories | 206 | 6 |
| items | 206 | 16 |
| inventory | 206 | 13 |
| recipe_mappings | 206 | 20 |
| expenses | 206 | 108 |
| orders | 206 | 2544 |
| order_items | 206 | 5597 |
| app_release | 400 | (probe failed; review separately) |
| customers / sales / payments | 404 | ambiguous |

## Intended outcome

1. Re-enable RLS on catalog and exposed business tables.
2. Allow anonymous/authenticated `SELECT` only on `categories` and `items`.
3. Limit anonymous/authenticated column grants to the fields the website already selects.
4. Leave no public policies on inventory, orders, expenses, and similar tables so those roles are denied by default.
5. Keep `service_role` for trusted server/POS work (bypasses RLS).

## Files

- `restore-rls-catalog-only.sql` — candidate SQL for the Supabase SQL editor
- `verify-public-access.sh` — count-only recheck after apply (uses env vars; prints no secrets)

## Apply checklist

1. Confirm every staff/POS client that must still read orders or inventory uses `service_role` or a dedicated authenticated role with its own policies (not the website publishable key).
2. Run the SQL in a transaction in the Supabase SQL editor (or a staging project first).
3. Run `verify-public-access.sh` with the same publishable URL/key the site uses.
4. Confirm `/menu` still loads 6 categories / 16 items.
5. Record results in `docs/development-log.md` and close the production blocker notes in security docs only after verification.
