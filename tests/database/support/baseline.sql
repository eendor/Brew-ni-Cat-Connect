-- Test stand-in for the shared Brew ni Cat database before this repo's
-- migrations, as checked on 2026-10-24. Never run it on Supabase.
--
-- It has the Supabase roles and schemas the migrations use, and the POS tables
-- with their live columns, keys and defaults. As on the live database, RLS is
-- off and anon and authenticated have every privilege on the POS tables. The
-- tests start from this and apply supabase/migrations in order.

-- ---------------------------------------------------------------------------
-- Supabase roles and default privileges

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase gives every new object in public to these roles.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Supabase Auth: the auth.users columns the migrations read, and auth.uid()
-- exactly as Supabase defines it.

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  banned_until timestamptz,
  deleted_at timestamptz,
  is_anonymous boolean not null default false
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

-- ---------------------------------------------------------------------------
-- Extensions schema with pgcrypto, as on every Supabase project.

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create extension pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Supabase Realtime: realtime.messages and realtime.send(), with the columns
-- and behavior of the live versions. A failed send only raises a warning.

create schema realtime;
grant usage on schema realtime to anon, authenticated, service_role;

create table realtime.messages (
  id uuid not null default gen_random_uuid(),
  topic text not null,
  extension text not null,
  payload jsonb,
  event text,
  private boolean default false,
  inserted_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  primary key (id, inserted_at)
);

create function realtime.send(
  payload jsonb,
  event text,
  topic text,
  private boolean default true
)
returns void
language plpgsql
as $$
begin
  begin
    execute format('set local realtime.topic to %L', topic);
    insert into realtime.messages (payload, event, topic, private, extension)
    values (payload, event, topic, private, 'broadcast');
  exception
    when others then
      raise warning 'ErrorSendingBroadcastMessage: %', sqlerrm;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- POS tables

create table public.categories (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table public.items (
  id text primary key,
  category_id text references public.categories (id) on delete cascade,
  name text not null,
  flavors text not null default '',
  variants_json text not null default '[]',
  is_available boolean default true,
  created_at timestamptz default now()
);

create table public.orders (
  id bigint primary key,
  device_id text not null,
  "timestamp" bigint not null,
  subtotal numeric not null,
  discount_deduction numeric not null,
  discount_label text not null,
  total numeric not null,
  payment_method text not null,
  payment_reference text,
  cashier_id text,
  cashier_name text,
  table_label text,
  is_served boolean default false,
  created_at timestamptz default now(),
  status text not null default 'COMPLETED',
  void_reason text,
  is_voided boolean not null default false,
  last_synced_at timestamptz default now()
);

create table public.order_items (
  id bigint primary key,
  order_id bigint references public.orders (id) on delete cascade,
  item_id text not null,
  item_name text not null,
  variant_id text not null,
  variant_name text not null,
  flavor text,
  quantity integer not null,
  unit_price numeric not null,
  total_price numeric not null
);

create table public.inventory (
  id text primary key,
  item_name text not null,
  unit text not null,
  current_stock numeric not null default 0.0,
  reorder_threshold numeric not null default 0.0,
  created_at timestamptz default now()
);

create table public.recipe_mappings (
  id text primary key,
  menu_item_id text references public.items (id) on delete cascade,
  size_variant_name text,
  inventory_item_id text references public.inventory (id) on delete cascade,
  deduction_quantity numeric not null default 0.0,
  created_at timestamptz default now()
);

create table public.expenses (
  id text primary key,
  "timestamp" bigint not null,
  description text not null,
  amount double precision not null,
  recorded_by text,
  device_id text,
  created_at timestamptz default now(),
  is_deleted boolean not null default false
);

create table public.app_release (
  version_code bigint primary key,
  version_name text not null,
  apk_url text not null,
  notes text,
  mandatory boolean not null default false,
  updated_at timestamptz default now()
);

-- The POS's old policies. They pin one account id (a placeholder here) and do
-- nothing while RLS is off.
do $$
declare
  pos_table text;
begin
  foreach pos_table in array array[
    'categories', 'items', 'orders', 'order_items', 'inventory',
    'recipe_mappings', 'expenses'
  ]
  loop
    execute format(
      'create policy store_account_all on public.%I for all to authenticated '
      'using (auth.uid() = %L::uuid) with check (auth.uid() = %L::uuid)',
      pos_table,
      '00000000-0000-4000-8000-0000000000aa',
      '00000000-0000-4000-8000-0000000000aa'
    );
  end loop;
end
$$;

create policy anyone_can_read_releases on public.app_release
  for select to anon, authenticated
  using (true);

-- Realtime streams row changes from these tables to the POS app, as on the
-- live database.
create publication supabase_realtime for table
  public.categories,
  public.expenses,
  public.inventory,
  public.items,
  public.order_items,
  public.orders;
