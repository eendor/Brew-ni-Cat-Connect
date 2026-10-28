-- Staff move online orders through their statuses, and a completed order
-- becomes one POS sale.
--
-- FR-027, FR-028, FR-076: staff accept, reject (with a reason the customer
-- sees), prepare, finish or cancel an order only through
-- public.set_online_order_status(). It allows only the steps in
-- private.is_allowed_shop_step(), refuses a change made from an old status
-- (another device got there first), and adds a status history row for each
-- change. The broadcast trigger from 20261024064700 then updates the
-- customer's order page.
--
-- FR-079: every change, done or refused, adds a row to private.staff_audit_log
-- with the staff account id. That id stays out of the status history, which
-- customers can read. The audit log has no API grants: it is read from the
-- Supabase dashboard.
--
-- FR-075: completing an order adds one sale to the POS tables
-- (public.orders and public.order_items) in the same transaction. The POS app
-- then pulls it like a sale made on another device. private.online_order_sales
-- links each order to its sale, so an order is recorded at most once. Sale ids
-- start at 2 000 000 000 000 001, above every id the POS app makes
-- (device bucket * 1 000 000 000 + local id, below 1e15), and stay below
-- 2^53, so JavaScript reads them exactly.
--
-- FR-080: public.online_orders joins the supabase_realtime publication, so the
-- POS app hears about new orders the way it hears about POS sales. Realtime
-- applies the same RLS policy, so a customer still gets only their own orders.
--
-- Undo: supabase/rollbacks/20261028153552_online_order_status.sql.

-- ---------------------------------------------------------------------------
-- Audit log (FR-079)

create table private.staff_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (action in ('online-order-status')),
  target text not null check (char_length(target) between 1 and 40),
  result text not null check (result in ('done', 'refused')),
  details jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);

comment on table private.staff_audit_log is
  'One row per staff action, done or refused. No API access; read it from the dashboard.';

create index staff_audit_log_target_idx
  on private.staff_audit_log (target, created_at);

alter table private.staff_audit_log enable row level security;
revoke all on table private.staff_audit_log
from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Order to sale links (FR-075)

create table private.online_order_sales (
  order_id uuid primary key
    references public.online_orders (id) on delete cascade,
  sale_id bigint generated always as identity
    (start with 2000000000000001) unique,
  created_at timestamptz not null default now()
);

comment on table private.online_order_sales is
  'The POS sale made from each completed online order. One per order.';

alter table private.online_order_sales enable row level security;
revoke all on table private.online_order_sales
from public, anon, authenticated, service_role;

-- After an undo and a new apply, carry on after the online sales already in
-- the POS tables instead of reusing their ids.
select pg_catalog.setval(
  pg_catalog.pg_get_serial_sequence('private.online_order_sales', 'sale_id'),
  coalesce(
    (select max(o.id) from public.orders as o where o.device_id = 'online'),
    2000000000000000
  )
);

-- ---------------------------------------------------------------------------
-- Allowed steps (FR-028, FR-076)

-- The steps staff may take. Rejecting is only for a pending order; after
-- accepting, the shop cancels instead (for example when the customer never
-- comes). Completed, rejected and cancelled orders are final.
create function private.is_allowed_shop_step(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce((p_from, p_to) in (
    ('pending', 'accepted'),
    ('pending', 'rejected'),
    ('accepted', 'preparing'),
    ('accepted', 'cancelled'),
    ('preparing', 'ready'),
    ('preparing', 'cancelled'),
    ('ready', 'completed'),
    ('ready', 'cancelled')
  ), false);
$$;

-- ---------------------------------------------------------------------------
-- One sale per completed order (FR-075)

-- Adds the POS sale for a completed order and returns its id. If the order
-- already has a sale, returns that one and adds nothing.
create function private.record_online_sale(
  p_order_id uuid,
  p_completed_at timestamptz
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_sale_id bigint;
begin
  insert into private.online_order_sales (order_id)
  values (p_order_id)
  on conflict (order_id) do nothing
  returning sale_id into v_sale_id;

  if v_sale_id is null then
    select s.sale_id into v_sale_id
    from private.online_order_sales as s
    where s.order_id = p_order_id;
    return v_sale_id;
  end if;

  insert into public.orders (
    id, device_id, "timestamp", subtotal, discount_deduction, discount_label,
    total, payment_method, payment_reference, cashier_id, cashier_name,
    table_label, is_served, status, is_voided
  )
  select
    v_sale_id,
    'online',
    (extract(epoch from p_completed_at) * 1000)::bigint,
    o.subtotal,
    0,
    '',
    o.subtotal,
    case o.payment_preference when 'GCash' then 'GCASH' else 'CASH' end,
    null,
    null,
    'Online order',
    'Online ' || o.reference,
    true,
    'COMPLETED',
    false
  from public.online_orders as o
  where o.id = p_order_id;

  insert into public.order_items (
    id, order_id, item_id, item_name, variant_id, variant_name, flavor,
    quantity, unit_price, total_price
  )
  select
    v_sale_id * 1000 + i.line_number,
    v_sale_id,
    i.item_id,
    i.item_name,
    i.variant_id,
    i.variant_name,
    i.flavor,
    i.quantity::integer,
    i.unit_price,
    i.line_total
  from public.online_order_items as i
  where i.order_id = p_order_id
  order by i.line_number;

  return v_sale_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- The staff action (FR-027, FR-028, FR-075, FR-076, FR-077, FR-079)

-- Moves one order from p_from_status (the status the staff member saw) to
-- p_to_status. A rejection needs a reason (1 to 300 characters), which the
-- customer sees; a cancellation may have one, kept only in the audit log.
--
-- Answers {ok: true, reference, status, changedAt, replayed: false, saleId?}
-- or {ok: false, error, status?}. Errors:
--   invalid          the request itself is wrong
--   not_found        no order has this reference
--   stale            the order is no longer in p_from_status; status is the
--                    current one
--   not_allowed      this step is not allowed
--   reason_required  a rejection without a reason
-- Sending the same request again with the same p_correlation_id (a retry
-- after a lost answer) changes nothing and answers {ok: true, replayed: true}.
-- Callers who are not staff get SQLSTATE 42501.
create function public.set_online_order_status(
  p_reference text,
  p_from_status text,
  p_to_status text,
  p_reason text default null,
  p_correlation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_correlation uuid := coalesce(p_correlation_id, gen_random_uuid());
  v_reason text := nullif(btrim(p_reason), '');
  v_now timestamptz := now();
  v_order public.online_orders%rowtype;
  v_error text;
  v_sale_id bigint;
  v_statuses constant text[] := array[
    'pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed',
    'cancelled'
  ];
begin
  if v_actor is null or not private.is_staff() then
    raise exception 'Only shop staff can change online orders'
      using errcode = '42501';
  end if;

  if p_reference is null
    or p_reference !~ '^BNC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
    or p_from_status is null
    or p_to_status is null
    or not (p_from_status = any (v_statuses))
    or not (p_to_status = any (v_statuses))
    or (v_reason is not null and p_to_status not in ('rejected', 'cancelled'))
    or coalesce(char_length(v_reason), 0) > 300
  then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select o.* into v_order
  from public.online_orders as o
  where o.reference = p_reference
  for update;

  if not found then
    v_error := 'not_found';
  elsif exists (
    select 1
    from public.online_order_status_history as h
    where h.order_id = v_order.id
      and h.correlation_id = v_correlation
      and h.from_status = p_from_status
      and h.to_status = p_to_status
  ) then
    return jsonb_strip_nulls(jsonb_build_object(
      'ok', true,
      'replayed', true,
      'reference', v_order.reference,
      'status', v_order.status,
      'saleId', (
        select s.sale_id
        from private.online_order_sales as s
        where s.order_id = v_order.id
      )
    ));
  elsif v_order.status <> p_from_status then
    v_error := 'stale';
  elsif not private.is_allowed_shop_step(p_from_status, p_to_status) then
    v_error := 'not_allowed';
  elsif p_to_status = 'rejected' and v_reason is null then
    v_error := 'reason_required';
  end if;

  if v_error is not null then
    insert into private.staff_audit_log
      (actor_id, action, target, result, details, correlation_id)
    values (
      v_actor,
      'online-order-status',
      p_reference,
      'refused',
      jsonb_strip_nulls(jsonb_build_object(
        'from', p_from_status,
        'to', p_to_status,
        'error', v_error,
        'current', v_order.status
      )),
      v_correlation
    );
    return jsonb_strip_nulls(jsonb_build_object(
      'ok', false,
      'error', v_error,
      'status', v_order.status
    ));
  end if;

  update public.online_orders
  set
    status = p_to_status,
    rejection_reason = case when p_to_status = 'rejected' then v_reason end
  where id = v_order.id;

  insert into public.online_order_status_history
    (order_id, from_status, to_status, actor, changed_at, correlation_id)
  values (v_order.id, p_from_status, p_to_status, 'shop', v_now, v_correlation);

  if p_to_status = 'completed' then
    v_sale_id := private.record_online_sale(v_order.id, v_now);
  end if;

  insert into private.staff_audit_log
    (actor_id, action, target, result, details, correlation_id)
  values (
    v_actor,
    'online-order-status',
    v_order.reference,
    'done',
    jsonb_strip_nulls(jsonb_build_object(
      'from', p_from_status,
      'to', p_to_status,
      'reason', v_reason,
      'saleId', v_sale_id
    )),
    v_correlation
  );

  return jsonb_strip_nulls(jsonb_build_object(
    'ok', true,
    'replayed', false,
    'reference', v_order.reference,
    'status', p_to_status,
    'changedAt', private.iso_utc(v_now),
    'saleId', v_sale_id
  ));
end;
$$;

revoke all on function private.is_allowed_shop_step(text, text)
from public, anon, authenticated;
revoke all on function private.record_online_sale(uuid, timestamptz)
from public, anon, authenticated;

revoke all on function public.set_online_order_status(
  text, text, text, text, uuid
)
from public, anon, authenticated, service_role;
grant execute on function public.set_online_order_status(
  text, text, text, text, uuid
)
to authenticated;

-- ---------------------------------------------------------------------------
-- New orders reach the POS app through Realtime (FR-080)

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'online_orders'
  ) then
    alter publication supabase_realtime add table public.online_orders;
  end if;
end;
$$;
