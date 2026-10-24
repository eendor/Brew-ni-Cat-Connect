-- Undo supabase/migrations/20261024064600_customer_tables.sql.
--
-- Run supabase/rollbacks/20261024064700_online_order_functions.sql first.
--
-- This deletes every online order, its lines and history, and every customer
-- profile, favorite, loyalty entry and data request. Export any rows the shop
-- still needs before running it. The POS tables are not touched.

drop table if exists
  public.loyalty_transactions,
  public.data_requests,
  public.favorites,
  public.customer_profiles,
  private.online_order_tokens,
  public.online_order_status_history,
  public.online_order_items,
  public.online_orders;

drop function if exists private.reject_loyalty_change();
drop function if exists private.stamp_row();
