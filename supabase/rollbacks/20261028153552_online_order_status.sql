-- Undo supabase/migrations/20261028153552_online_order_status.sql.
--
-- Staff can no longer change online orders, and new orders stop reaching the
-- POS app through Realtime. The orders, their status history and the POS
-- sales made from completed orders stay. The audit rows and the links from
-- orders to sales are deleted with their tables; each sale still names its
-- order in table_label ("Online BNC-…").

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'online_orders'
  ) then
    alter publication supabase_realtime drop table public.online_orders;
  end if;
end;
$$;

drop function if exists public.set_online_order_status(
  text, text, text, text, uuid
);
drop function if exists private.record_online_sale(uuid, timestamptz);
drop function if exists private.is_allowed_shop_step(text, text);

drop table if exists private.online_order_sales;
drop table if exists private.staff_audit_log;
