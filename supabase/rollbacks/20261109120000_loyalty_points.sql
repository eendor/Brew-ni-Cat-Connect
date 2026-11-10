-- Undo 20261109120000_loyalty_points.sql: removes loyalty trigger, functions, and grants.
-- Existing transactions stay intact.

drop trigger if exists online_orders_loyalty_trigger on public.online_orders;
drop function if exists private.sync_online_order_loyalty();
drop function if exists public.redeem_reward(text);
drop function if exists public.loyalty_settings();
drop function if exists public.loyalty_rewards();
drop function if exists private.loyalty_settings();
