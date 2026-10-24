-- Restore Row Level Security on the shared Brew ni Cat database.
--
-- The POS and this site use one Supabase database. RLS was off on the POS
-- tables, so anyone with the public key could read and change orders,
-- expenses and stock. The site must not go public like that
-- (docs/security-and-privacy.md), so this turns RLS back on:
--
-- - Everyone can read the menu (categories, items) and the POS releases
--   (app_release). The site and the POS update check read them with the
--   public key.
-- - Everything else, and every change, needs a signed-in staff account: a user
--   whose app_metadata has "role": "staff". Only SQL or the service role can
--   change app_metadata, so a customer cannot make themselves staff.
-- - app_release is still written only with SQL or the service role.
--
-- Mark the POS staff account before or with this migration, or the POS stops
-- syncing (docs/database-design.md, "Applying migrations").
--
-- Undo: supabase/rollbacks/20261024011051_restore_rls.sql

-- ---------------------------------------------------------------------------
-- Private helpers. The API only exposes the public schema, so nothing here can
-- be called over HTTP.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- True when the signed-in user is a staff account. It reads auth.users, not
-- the access token, so marking or unmarking an account works at once, without
-- a new sign-in. Banned and deleted accounts are never staff.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select (u.raw_app_meta_data ->> 'role') = 'staff'
      from auth.users as u
      where u.id = (select auth.uid())
        and u.deleted_at is null
        and (u.banned_until is null or u.banned_until <= now())
        and not coalesce(u.is_anonymous, false)
    ),
    false
  );
$$;

revoke all on function private.is_staff() from public;
grant execute on function private.is_staff() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Turn RLS on and replace the old policies.

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory enable row level security;
alter table public.recipe_mappings enable row level security;
alter table public.expenses enable row level security;
alter table public.app_release enable row level security;

-- The old policies pinned one account id. Drop every policy on these tables so
-- only the ones below apply.
do $$
declare
  old_policy record;
begin
  for old_policy in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'categories', 'items', 'orders', 'order_items', 'inventory',
        'recipe_mappings', 'expenses', 'app_release'
      )
  loop
    execute format(
      'drop policy %I on public.%I',
      old_policy.policyname,
      old_policy.tablename
    );
  end loop;
end
$$;

create policy menu_readable_by_everyone on public.categories
  for select to anon, authenticated
  using (true);

create policy menu_readable_by_everyone on public.items
  for select to anon, authenticated
  using (true);

create policy releases_readable_by_everyone on public.app_release
  for select to anon, authenticated
  using (true);

create policy staff_full_access on public.categories
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_full_access on public.items
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_full_access on public.orders
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_full_access on public.order_items
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_full_access on public.inventory
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_full_access on public.recipe_mappings
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_full_access on public.expenses
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- Table privileges. RLS decides which rows; these decide which actions.

revoke all on table
  public.categories, public.items, public.orders, public.order_items,
  public.inventory, public.recipe_mappings, public.expenses, public.app_release
from anon, authenticated;

grant select on table public.categories, public.items, public.app_release
to anon;

grant select, insert, update, delete on table
  public.categories, public.items, public.orders, public.order_items,
  public.inventory, public.recipe_mappings, public.expenses
to authenticated;

grant select on table public.app_release to authenticated;

-- ---------------------------------------------------------------------------
-- Stop here, undoing everything above, if any public table still has RLS off.

do $$
declare
  tables_without_rls text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into tables_without_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'Row Level Security is still off on: %', tables_without_rls;
  end if;
end
$$;
