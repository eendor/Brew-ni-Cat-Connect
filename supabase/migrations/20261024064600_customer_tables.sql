-- Tables for online pickup orders and customer accounts.
--
-- - online_orders, online_order_items and online_order_status_history hold
--   each online order, a copy of its lines as priced, and every status change.
--   Nobody writes them directly: public.place_online_order() creates orders
--   (20261024064700_online_order_functions.sql). A signed-in customer reads
--   their own orders; staff read every order.
-- - private.online_order_tokens keeps a SHA-256 hash of each order's tracking
--   token (FR-045). The token itself is never stored.
-- - customer_profiles, favorites, loyalty_transactions and data_requests each
--   belong to one signed-in customer, and RLS keeps them to that customer.
--   Loyalty rows are never changed: a correction is a new adjustment row
--   (FR-052, FR-056).
-- - Deleting an account removes its profile, favorites, loyalty rows and data
--   requests. Its orders stay, without the account link (FR-043).
--
-- Undo: supabase/rollbacks/20261024064600_customer_tables.sql

-- ---------------------------------------------------------------------------
-- Trigger helpers

-- Sets created_at on insert, keeps it on update and sets updated_at on both,
-- so a client cannot fake either.
create or replace function private.stamp_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.stamp_row() from public, anon, authenticated;

create or replace function private.reject_loyalty_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Loyalty transactions cannot be changed. Add an adjustment instead.';
end;
$$;

revoke all on function private.reject_loyalty_change()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Online orders

create table public.online_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    check (reference ~ '^BNC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'),
  status text not null default 'pending'
    check (status in (
      'pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed',
      'cancelled'
    )),
  fulfillment text not null default 'pickup' check (fulfillment = 'pickup'),
  customer_id uuid references auth.users (id) on delete set null,
  customer_name text not null
    check (
      char_length(customer_name) between 1 and 100
      and customer_name = btrim(customer_name, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    ),
  customer_phone text not null check (customer_phone ~ '^\+639[0-9]{9}$'),
  notes text not null default ''
    check (
      char_length(notes) <= 500
      and notes = btrim(notes, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    ),
  payment_preference text not null
    check (payment_preference in ('Cash', 'GCash')),
  subtotal numeric(16, 2) not null check (subtotal >= 0),
  item_count bigint not null check (item_count >= 1),
  rejection_reason text
    check (char_length(rejection_reason) between 1 and 300),
  idempotency_key uuid not null unique,
  realtime_topic text not null unique
    check (realtime_topic ~ '^order:[A-Za-z0-9_-]{22}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A rejected order always says why (FR-027); no other order has a reason.
  constraint online_orders_rejection_reason_matches_status
    check ((status = 'rejected') = (rejection_reason is not null))
);

create index online_orders_customer_id_created_at_idx
  on public.online_orders (customer_id, created_at desc);
create index online_orders_status_created_at_idx
  on public.online_orders (status, created_at);

create trigger online_orders_stamp
  before insert or update on public.online_orders
  for each row execute function private.stamp_row();

-- The lines as priced when the order was placed. They keep the names and
-- prices of that moment, so there is no link to public.items.
create table public.online_order_items (
  order_id uuid not null references public.online_orders (id) on delete cascade,
  line_number integer not null check (line_number between 1 and 200),
  item_id text not null,
  item_name text not null,
  variant_id text not null,
  variant_name text not null,
  flavor text,
  unit_price numeric(16, 2) not null check (unit_price >= 0),
  quantity bigint not null check (quantity >= 1),
  line_total numeric(16, 2) not null check (line_total >= 0),
  primary key (order_id, line_number),
  constraint online_order_items_line_total_matches
    check (line_total = unit_price * quantity)
);

-- Every status change with who made it and when (FR-028, FR-046).
create table public.online_order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.online_orders (id) on delete cascade,
  from_status text check (from_status in (
    'pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed',
    'cancelled'
  )),
  to_status text not null check (to_status in (
    'pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed',
    'cancelled'
  )),
  actor text not null check (actor in ('customer', 'shop', 'system')),
  changed_at timestamptz not null default now(),
  correlation_id uuid not null,
  check (from_status is distinct from to_status)
);

create index online_order_status_history_order_idx
  on public.online_order_status_history (order_id, changed_at, id);

-- Only the server functions read this.
create table private.online_order_tokens (
  order_id uuid primary key references public.online_orders (id) on delete cascade,
  token_hash bytea not null check (octet_length(token_hash) = 32)
);

-- ---------------------------------------------------------------------------
-- Customer accounts

create table public.customer_profiles (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  full_name text not null
    check (
      char_length(full_name) between 1 and 100
      and full_name = btrim(full_name, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    ),
  phone text check (phone ~ '^\+639[0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_profiles_stamp
  before insert or update on public.customer_profiles
  for each row execute function private.stamp_row();

create table public.favorites (
  customer_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, item_id)
);

create index favorites_item_id_idx on public.favorites (item_id);

-- Points earned and spent. Points come only from completed orders, once per
-- order (FR-051); a correction is a new adjustment row (FR-056).
create table public.loyalty_transactions (
  id bigint generated always as identity primary key,
  customer_id uuid not null references auth.users (id) on delete cascade,
  points integer not null check (points <> 0),
  reason text not null
    check (reason in ('order-completed', 'reward-redeemed', 'adjustment')),
  order_id uuid references public.online_orders (id) on delete restrict,
  note text check (char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  constraint loyalty_transactions_reason_rules check (
    case reason
      when 'order-completed' then points > 0 and order_id is not null
      when 'reward-redeemed' then points < 0
      else true
    end
  )
);

create unique index loyalty_transactions_one_award_per_order
  on public.loyalty_transactions (order_id)
  where reason = 'order-completed';
create index loyalty_transactions_customer_id_created_at_idx
  on public.loyalty_transactions (customer_id, created_at desc);

create trigger loyalty_transactions_immutable
  before update on public.loyalty_transactions
  for each row execute function private.reject_loyalty_change();

-- Correction and deletion requests (FR-042).
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  kind text not null check (kind in ('correction', 'deletion')),
  message text not null
    check (
      char_length(message) between 1 and 1000
      and message = btrim(message, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    ),
  status text not null default 'open'
    check (status in ('open', 'in-progress', 'resolved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index data_requests_customer_id_created_at_idx
  on public.data_requests (customer_id, created_at desc);
create index data_requests_status_created_at_idx
  on public.data_requests (status, created_at);

create trigger data_requests_stamp
  before insert or update on public.data_requests
  for each row execute function private.stamp_row();

-- ---------------------------------------------------------------------------
-- RLS

alter table public.online_orders enable row level security;
alter table public.online_order_items enable row level security;
alter table public.online_order_status_history enable row level security;
alter table private.online_order_tokens enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.data_requests enable row level security;

create policy readable_by_customer_or_staff on public.online_orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));

-- Lines and history are readable exactly when their order is.
create policy readable_with_the_order on public.online_order_items
  for select to authenticated
  using (exists (select 1 from public.online_orders as o where o.id = order_id));

create policy readable_with_the_order on public.online_order_status_history
  for select to authenticated
  using (exists (select 1 from public.online_orders as o where o.id = order_id));

create policy customer_reads_own on public.customer_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy customer_adds_own on public.customer_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy customer_updates_own on public.customer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy customer_reads_own on public.favorites
  for select to authenticated
  using (customer_id = (select auth.uid()));
create policy customer_adds_own on public.favorites
  for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy customer_removes_own on public.favorites
  for delete to authenticated
  using (customer_id = (select auth.uid()));

create policy customer_reads_own on public.loyalty_transactions
  for select to authenticated
  using (customer_id = (select auth.uid()));

create policy customer_or_staff_reads on public.data_requests
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));
create policy customer_adds_own on public.data_requests
  for insert to authenticated
  with check (customer_id = (select auth.uid()) and status = 'open');
create policy staff_updates on public.data_requests
  for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- Table privileges. RLS decides which rows; these decide which actions.
-- anon gets nothing: guests read their order only through
-- public.get_online_order().

revoke all on table
  public.online_orders, public.online_order_items,
  public.online_order_status_history, public.customer_profiles,
  public.favorites, public.loyalty_transactions, public.data_requests
from public, anon, authenticated;

revoke all on table private.online_order_tokens
from public, anon, authenticated, service_role;

revoke all on sequence
  public.online_order_status_history_id_seq,
  public.loyalty_transactions_id_seq
from public, anon, authenticated;

grant select on table
  public.online_orders, public.online_order_items,
  public.online_order_status_history, public.loyalty_transactions
to authenticated;

grant select on table public.customer_profiles to authenticated;
grant insert (user_id, full_name, phone), update (user_id, full_name, phone)
  on table public.customer_profiles to authenticated;

grant select, delete on table public.favorites to authenticated;
grant insert (customer_id, item_id) on table public.favorites to authenticated;

grant select on table public.data_requests to authenticated;
grant insert (customer_id, kind, message), update (status)
  on table public.data_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Stop here, undoing everything above, if any public table still has RLS off.

do $$
declare
  tables_without_rls text;
begin
  select string_agg(n.nspname || '.' || c.relname, ', ' order by c.relname)
  into tables_without_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'Row Level Security is still off on: %', tables_without_rls;
  end if;
end
$$;
