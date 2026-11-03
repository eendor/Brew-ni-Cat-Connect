-- Undo 20261103120000_undo_online_order_status.sql: removes the undo action.
-- Orders, their history and voided sales stay as they are. The audit log keeps
-- accepting 'online-order-undo' so the undo rows already written stay valid.

drop function if exists public.undo_online_order_status(text, text, uuid);
