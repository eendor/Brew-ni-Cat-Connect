-- Refuse to erase the order discount once redemption has recorded one.
do $$
begin
  lock table public.online_orders in access exclusive mode;
  if exists (select 1 from public.online_orders where coins_spent <> 0) then
    raise exception 'Cannot roll back while online orders have coin discounts';
  end if;
end;
$$;

create or replace function private.record_online_sale(
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

alter table public.online_orders
  drop constraint online_orders_coin_discount_check,
  drop column coin_discount,
  drop column coins_spent;
