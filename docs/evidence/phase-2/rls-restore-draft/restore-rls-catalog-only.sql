-- Brew ni Cat Connect — draft RLS restore (catalog-only public read)
-- DO NOT APPLY until Lead Developer review.
-- Goal: Menu stays readable; inventory/orders/expenses and similar stay denied for anon/authenticated.
-- service_role bypasses RLS and remains the trusted path for POS/admin tooling.

BEGIN;

-- 1) Lock down known publicly reachable business tables (deny-by-default once RLS is on).
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipe_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_release ENABLE ROW LEVEL SECURITY;

-- Optional: drop any accidental public policies on those tables if they exist later.
-- (None are created here.)

-- 2) Catalog tables: enable RLS, then allow read-only public SELECT.
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read items" ON public.items;
CREATE POLICY "Public read items"
  ON public.items
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3) Column grants matching the website select list.
-- Revoke broad table SELECT first, then grant only approved columns.
REVOKE ALL ON TABLE public.categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.items FROM anon, authenticated;

GRANT SELECT (id, name) ON TABLE public.categories TO anon, authenticated;
GRANT SELECT (id, category_id, name, flavors, variants_json, is_available)
  ON TABLE public.items TO anon, authenticated;

-- 4) Ensure business tables are not selectively granted to the website roles.
REVOKE ALL ON TABLE public.inventory FROM anon, authenticated;
REVOKE ALL ON TABLE public.recipe_mappings FROM anon, authenticated;
REVOKE ALL ON TABLE public.expenses FROM anon, authenticated;
REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.order_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.app_release FROM anon, authenticated;

COMMIT;
