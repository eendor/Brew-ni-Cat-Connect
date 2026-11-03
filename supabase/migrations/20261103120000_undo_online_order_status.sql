-- Staff can undo the last status change of an online order within five
-- minutes, for example a Complete pressed by mistake.
--
-- FR-095: public.undo_online_order_status() moves an order back one step: to
-- the status its last shop change came from. It works only when that change is
-- the order's latest one, was a step forward made by the shop (so an undo
-- can't be undone), is at most five minutes old, and was not a rejection (the customer has already seen the reason). Each
-- undo adds a status history row, so the customer's order page follows it,
-- and an audit row.
--
-- Undoing a Complete voids the POS sale it added (the row stays, marked
-- voided, so it no longer counts) and removes the order's sale link. If the
-- order is completed again, a new sale is added. The tablet puts the stock
-- back itself, because the stock is counted on the tablet (ADR-021).
--
-- Undo: supabase/rollbacks/20261103120000_undo_online_order_status.sql.

alter table private.staff_audit_log
  drop constraint staff_audit_log_action_check;
alter table private.staff_audit_log
  add constraint staff_audit_log_action_check
  check (action in ('online-order-status', 'online-order-undo'));

create function public.undo_online_order_status(
  p_reference text,
  p_from_status text,
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
  v_now timestamptz := now();
  v_order public.online_orders%rowtype;
  v_last public.online_order_status_history%rowtype;
  v_error text;
  v_sale_id bigint;
begin
  if v_actor is null or not private.is_staff() then
    raise exception 'Only shop staff can change online orders'
      using errcode = '42501';
  end if;

  if p_reference is null
    or p_reference !~ '^BNC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
    or p_from_status is null
    or not (p_from_status = any (array[
      'pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed',
      'cancelled'
    ]))
  then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select o.* into v_order
  from public.online_orders as o
  where o.reference = p_reference
  for update;

  if not found then
    v_error := 'not_found';
  else
    select h.* into v_last
    from public.online_order_status_history as h
    where h.order_id = v_order.id
    order by h.changed_at desc, h.id desc
    limit 1;

    if v_last.correlation_id = v_correlation and v_last.actor = 'shop' then
      -- A retry of an undo that already landed.
      return jsonb_build_object(
        'ok', true,
        'replayed', true,
        'reference', v_order.reference,
        'status', v_order.status
      );
    elsif v_order.status <> p_from_status then
      v_error := 'stale';
    elsif v_last.actor is distinct from 'shop'
      or v_last.from_status is null
      or v_last.to_status <> p_from_status
      -- only a step forward; an undo itself can't be undone
      or not private.is_allowed_shop_step(v_last.from_status, v_last.to_status)
      or p_from_status in ('pending', 'rejected')
    then
      v_error := 'not_allowed';
    elsif v_last.changed_at < v_now - interval '5 minutes' then
      v_error := 'too_late';
    end if;
  end if;

  if v_error is not null then
    insert into private.staff_audit_log
      (actor_id, action, target, result, details, correlation_id)
    values (
      v_actor,
      'online-order-undo',
      p_reference,
      'refused',
      jsonb_strip_nulls(jsonb_build_object(
        'from', p_from_status,
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

  if p_from_status = 'completed' then
    delete from private.online_order_sales as s
    where s.order_id = v_order.id
    returning s.sale_id into v_sale_id;

    update public.orders
    set is_voided = true,
      void_reason = 'Online order ' || v_order.reference
        || ' completed by mistake (undone)',
      last_synced_at = v_now
    where id = v_sale_id;
  end if;

  update public.online_orders
  set status = v_last.from_status
  where id = v_order.id;

  insert into public.online_order_status_history
    (order_id, from_status, to_status, actor, changed_at, correlation_id)
  values (
    v_order.id, p_from_status, v_last.from_status, 'shop', v_now, v_correlation
  );

  insert into private.staff_audit_log
    (actor_id, action, target, result, details, correlation_id)
  values (
    v_actor,
    'online-order-undo',
    v_order.reference,
    'done',
    jsonb_strip_nulls(jsonb_build_object(
      'from', p_from_status,
      'to', v_last.from_status,
      'voidedSaleId', v_sale_id
    )),
    v_correlation
  );

  return jsonb_strip_nulls(jsonb_build_object(
    'ok', true,
    'replayed', false,
    'reference', v_order.reference,
    'status', v_last.from_status,
    'changedAt', private.iso_utc(v_now),
    'voidedSaleId', v_sale_id
  ));
end;
$$;

revoke all on function public.undo_online_order_status(text, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.undo_online_order_status(text, text, uuid)
to authenticated;
