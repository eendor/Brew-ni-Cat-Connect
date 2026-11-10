-- Order status inside Messenger (FR-110).
--
-- A customer who orders in Messenger has one tracking token for all their
-- orders. It is made from their Messenger ID with the app secret, so only the
-- assistant can make it, and place_online_order() already stores its hash
-- with each order. This function lists the newest orders for a token, shaped
-- like get_online_order(), so the chat can answer "where is my order?"
-- without an order number or an order link.
--
-- It changes no table and no existing function. The token is the
-- credential, exactly as it is for get_online_order(): 43 URL-safe
-- characters, so it can't be guessed.

create or replace function public.list_online_orders_by_token(
  p_tracking_token text,
  p_limit integer default 5
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      public.get_online_order(recent.reference, p_tracking_token)
      order by recent.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select o.reference, o.created_at
    from public.online_orders as o
    where p_tracking_token ~ '^[A-Za-z0-9_-]{43}$'
      and exists (
        select 1
        from private.online_order_tokens as t
        where t.order_id = o.id
          and t.token_hash = sha256(convert_to(p_tracking_token, 'UTF8'))
      )
    order by o.created_at desc
    limit least(greatest(coalesce(p_limit, 5), 1), 10)
  ) as recent;
$$;

revoke all on function public.list_online_orders_by_token(text, integer)
from public, anon, authenticated, service_role;

grant execute on function public.list_online_orders_by_token(text, integer)
to anon, authenticated;
