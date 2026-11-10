-- Undo 20261110120000_messenger_order_status.sql: removes the function that
-- lists a Messenger customer's orders. Orders and tokens are not touched.

drop function if exists public.list_online_orders_by_token(text, integer);
