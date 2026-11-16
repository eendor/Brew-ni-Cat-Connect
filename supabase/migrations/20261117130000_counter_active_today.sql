-- Whether the counter has rung up a sale today (FR-112 update, 2026-11-17).
--
-- The Messenger assistant answers "are you open?" from the weekly hours and
-- the Closed today switch. On days the staff close without turning the switch
-- on, it said "open". This lets it soften that answer when the POS has no sale
-- today. It returns one yes or no and nothing about the sales themselves.

create or replace function public.shop_counter_active_today()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.orders o
    where o.created_at >= (date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila')
      and coalesce(o.is_voided, false) = false
  );
end;
$$;

revoke all on function public.shop_counter_active_today() from public;
grant execute on function public.shop_counter_active_today() to anon, authenticated;
