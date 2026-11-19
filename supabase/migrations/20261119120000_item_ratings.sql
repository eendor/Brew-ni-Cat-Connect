-- Ratings for each menu item (FR-121).
--
-- A signed-in customer rates an item from 1 to 5 stars after a completed
-- order that had it. One rating per customer and item; rating again replaces
-- it. The menu shows each item's average and count.
--
-- Shop-only items are never rated: the Take-out Box, Bottled Water and
-- everything in the Cat Treats category, matched however they are spelled,
-- like isShopOnlyName() on the website.
--
-- Customers read only their own ratings. Everyone reads the averages through
-- public.item_rating_summary(), which never returns who rated. Ratings are
-- written only through public.rate_item().
--
-- Undo: supabase/rollbacks/20261119120000_item_ratings.sql

create table public.item_ratings (
  customer_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_id, item_id)
);

create index item_ratings_item_idx on public.item_ratings (item_id);

create trigger item_ratings_stamp
  before insert or update on public.item_ratings
  for each row execute function private.stamp_row();

alter table public.item_ratings enable row level security;

create policy customer_reads_own_item_ratings on public.item_ratings
  for select to authenticated
  using (customer_id = (select auth.uid()));

revoke all on table public.item_ratings from public, anon, authenticated;
grant select (customer_id, item_id, rating, updated_at)
  on table public.item_ratings to authenticated;

-- ---------------------------------------------------------------------------
-- Which items can be rated

create or replace function private.is_shop_only_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(coalesce(p_name, '')), '[^a-z]', '', 'g')
    in ('takeoutbox', 'cattreats', 'bottledwater');
$$;

revoke all on function private.is_shop_only_name(text)
  from public, anon, authenticated;

create or replace function private.is_rateable_item(p_item_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.items as i
    left join public.categories as c on c.id = i.category_id
    where i.id = p_item_id
      and not private.is_shop_only_name(i.name)
      and not private.is_shop_only_name(c.name)
  );
$$;

revoke all on function private.is_rateable_item(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rate an item

create or replace function public.rate_item(p_item_id text, p_rating integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'invalid_rating');
  end if;

  if p_item_id is null or not private.is_rateable_item(p_item_id) then
    return jsonb_build_object('ok', false, 'error', 'not_rateable');
  end if;

  if not exists (
    select 1
    from public.online_orders as o
    join public.online_order_items as oi on oi.order_id = o.id
    where o.customer_id = v_user_id
      and o.status = 'completed'
      and oi.item_id = p_item_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_ordered');
  end if;

  insert into public.item_ratings (customer_id, item_id, rating)
  values (v_user_id, p_item_id, p_rating::smallint)
  on conflict (customer_id, item_id)
  do update set rating = excluded.rating;

  return jsonb_build_object('ok', true, 'itemId', p_item_id, 'rating', p_rating);
end;
$$;

revoke all on function public.rate_item(text, integer) from public, anon;
grant execute on function public.rate_item(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Averages for the menu

create or replace function public.item_rating_summary()
returns table (item_id text, average numeric, rating_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.item_id,
    round(avg(r.rating), 1) as average,
    count(*)::integer as rating_count
  from public.item_ratings as r
  where private.is_rateable_item(r.item_id)
  group by r.item_id;
$$;

revoke all on function public.item_rating_summary() from public;
grant execute on function public.item_rating_summary() to anon, authenticated;
