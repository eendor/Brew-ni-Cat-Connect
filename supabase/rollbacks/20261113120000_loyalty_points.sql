-- Rollback for loyalty points and rewards program (20261113120000_loyalty_points.sql).

drop function if exists public.redeem_reward(text);
drop function if exists public.loyalty_settings();
drop function if exists public.loyalty_rewards();
drop trigger if exists online_orders_loyalty_trigger on public.online_orders;
drop function if exists private.sync_online_order_loyalty();
drop function if exists private.loyalty_settings();
