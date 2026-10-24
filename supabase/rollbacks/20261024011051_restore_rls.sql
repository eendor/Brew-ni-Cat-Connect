-- Undo supabase/migrations/20261024011051_restore_rls.sql.
--
-- Use it only if the POS cannot sync after that migration. It turns RLS off on
-- the POS tables and gives anon and authenticated every privilege again, as
-- before. Anyone with the public key can then read and change the POS data,
-- so fix the cause and apply the migration again before the site stays public.
--
-- The new policies and private.is_staff() stay. They do nothing while RLS is
-- off.

alter table public.categories disable row level security;
alter table public.items disable row level security;
alter table public.orders disable row level security;
alter table public.order_items disable row level security;
alter table public.inventory disable row level security;
alter table public.recipe_mappings disable row level security;
alter table public.expenses disable row level security;
alter table public.app_release disable row level security;

grant all on table
  public.categories, public.items, public.orders, public.order_items,
  public.inventory, public.recipe_mappings, public.expenses, public.app_release
to anon, authenticated;
