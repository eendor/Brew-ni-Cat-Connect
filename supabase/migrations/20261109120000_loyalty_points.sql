-- Loyalty points and rewards program (FR-050 to FR-055).
--
-- FR-050: Every signed-in customer has exactly one loyalty account made of
-- their own transactions in public.loyalty_transactions; there is no
-- separate enrollment step.
--
-- FR-051, FR-052: An AFTER UPDATE OF status trigger on public.online_orders
-- awards points when an order is completed, and takes them back if completion
-- is undone (FR-095). Guests earn nothing. If subtotal is under ₱10, 0 points
-- are awarded and no row is added. Transactions are immutable.
--
-- FR-054: public.loyalty_rewards() returns the active rewards catalog from
-- private.loyalty_settings(), the single source of truth.
--
-- FR-055 (Stretch): public.redeem_reward() allows an authenticated customer
-- to redeem points for an active reward atomically, enforcing balance and
-- weekly redemption limits.
--
-- Undo: supabase/rollbacks/20261109120000_loyalty_points.sql

-- ---------------------------------------------------------------------------
-- 1. Program settings (single source of truth)

create or replace function private.loyalty_settings()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    -- Earning rule: 1 point for every ₱10 of the order subtotal, rounded down.
    -- TODO: Confirm with Brew ni Cat owner.
    'currency_step', 10,
    'points_per_currency_unit', 1,
    -- Weekly redemption limit per customer.
    -- TODO: Confirm with Brew ni Cat owner.
    'weekly_limit', 2,
    -- Rewards catalog.
    -- TODO: Confirm with Brew ni Cat owner.
    'rewards', jsonb_build_array(
      jsonb_build_object(
        'id', 'reward-takoyaki-6',
        'name', 'Takoyaki (6 pcs)',
        'description', '6 pieces of freshly cooked savory Takoyaki.',
        'points', 50,
        'active', true
      ),
      jsonb_build_object(
        'id', 'reward-iced-latte-16',
        'name', 'Iced Latte (16 oz)',
        'description', 'A refreshing 16 oz cup of iced espresso latte.',
        'points', 80,
        'active', true
      ),
      jsonb_build_object(
        'id', 'reward-brew-special-16',
        'name', 'Brew Special Coffee (16 oz)',
        'description', 'Our signature 16 oz house blend with caramel or vanilla.',
        'points', 100,
        'active', true
      ),
      jsonb_build_object(
        'id', 'reward-snack-combo',
        'name', 'Takoyaki & Latte Combo',
        'description', '16 oz Iced Latte paired with 6 pcs Takoyaki.',
        'points', 120,
        'active', true
      ),
      jsonb_build_object(
        'id', 'reward-seasonal-pastry',
        'name', 'Seasonal Special Pastry',
        'description', 'Exclusive seasonal bakery item.',
        'points', 30,
        'active', false
      )
    )
  );
$$;

revoke all on function private.loyalty_settings() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Earning trigger on public.online_orders (FR-051, FR-052)

create or replace function private.sync_online_order_loyalty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb := private.loyalty_settings();
  v_step numeric;
  v_pts_per_step int;
  v_target_points int := 0;
  v_current_points int := 0;
  v_delta int;
  v_has_award boolean;
begin
  -- Guests don't earn points.
  if new.customer_id is null then
    return new;
  end if;

  v_step := coalesce((v_settings->>'currency_step')::numeric, 10);
  v_pts_per_step := coalesce((v_settings->>'points_per_currency_unit')::int, 1);

  if new.status = 'completed' and v_step > 0 then
    v_target_points := floor(new.subtotal / v_step)::int * v_pts_per_step;
  else
    v_target_points := 0;
  end if;

  select coalesce(sum(points), 0) into v_current_points
  from public.loyalty_transactions
  where order_id = new.id;

  v_delta := v_target_points - v_current_points;

  if v_delta = 0 then
    return new;
  end if;

  select exists(
    select 1
    from public.loyalty_transactions
    where order_id = new.id and reason = 'order-completed'
  ) into v_has_award;

  begin
    if not v_has_award and v_delta > 0 then
      insert into public.loyalty_transactions
        (customer_id, points, reason, order_id, note)
      values
        (new.customer_id, v_delta, 'order-completed', new.id, null);
    else
      insert into public.loyalty_transactions
        (customer_id, points, reason, order_id, note)
      values
        (
          new.customer_id,
          v_delta,
          'adjustment',
          new.id,
          case
            when new.status = 'completed' then 'Order completed'
            else 'Order completion undone'
          end
        );
    end if;
  exception when others then
    -- The trigger must never make a status change fail.
    null;
  end;

  return new;
end;
$$;

revoke all on function private.sync_online_order_loyalty()
from public, anon, authenticated;

drop trigger if exists online_orders_loyalty_trigger on public.online_orders;
create trigger online_orders_loyalty_trigger
  after update of status on public.online_orders
  for each row execute function private.sync_online_order_loyalty();

-- ---------------------------------------------------------------------------
-- 3. Public rewards catalog and settings (FR-054)

create or replace function public.loyalty_rewards()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', elem->>'id',
        'name', elem->>'name',
        'description', elem->>'description',
        'points', (elem->>'points')::int
      )
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(private.loyalty_settings()->'rewards') as elem
  where (elem->>'active')::boolean = true;
$$;

revoke all on function public.loyalty_rewards() from public;
grant execute on function public.loyalty_rewards() to anon, authenticated;

create or replace function public.loyalty_settings()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'currencyStep', coalesce((private.loyalty_settings()->>'currency_step')::numeric, 10),
    'pointsPerStep', coalesce((private.loyalty_settings()->>'points_per_currency_unit')::int, 1),
    'weeklyLimit', coalesce((private.loyalty_settings()->>'weekly_limit')::int, 2)
  );
$$;

revoke all on function public.loyalty_settings() from public;
grant execute on function public.loyalty_settings() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reward redemption (FR-055 stretch goal)

create or replace function public.redeem_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings jsonb := private.loyalty_settings();
  v_reward jsonb;
  v_reward_name text;
  v_cost int;
  v_is_active boolean;
  v_weekly_limit int;
  v_redeemed_this_week int;
  v_balance int;
  v_code text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_reward_id is null or btrim(p_reward_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_reward');
  end if;

  -- Advisory lock per customer for atomic concurrency control.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Locate reward in settings catalog.
  select elem into v_reward
  from jsonb_array_elements(v_settings->'rewards') as elem
  where elem->>'id' = p_reward_id
  limit 1;

  if v_reward is null then
    return jsonb_build_object('ok', false, 'error', 'reward_not_found');
  end if;

  v_is_active := coalesce((v_reward->>'active')::boolean, false);
  if not v_is_active then
    return jsonb_build_object('ok', false, 'error', 'reward_inactive');
  end if;

  v_cost := (v_reward->>'points')::int;
  v_reward_name := v_reward->>'name';
  v_weekly_limit := coalesce((v_settings->>'weekly_limit')::int, 2);

  -- Weekly limit check: reward redemptions within the last 7 days.
  select count(*) into v_redeemed_this_week
  from public.loyalty_transactions
  where customer_id = v_user_id
    and reason = 'reward-redeemed'
    and created_at >= now() - interval '7 days';

  if v_redeemed_this_week >= v_weekly_limit then
    return jsonb_build_object(
      'ok', false,
      'error', 'weekly_limit_reached',
      'weeklyLimit', v_weekly_limit,
      'redeemedThisWeek', v_redeemed_this_week
    );
  end if;

  -- Current balance check.
  select coalesce(sum(points), 0) into v_balance
  from public.loyalty_transactions
  where customer_id = v_user_id;

  if v_balance < v_cost then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_points',
      'balance', v_balance,
      'required', v_cost
    );
  end if;

  -- Generate short counter verification code.
  v_code := 'RWD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.loyalty_transactions
    (customer_id, points, reason, order_id, note)
  values
    (
      v_user_id,
      -v_cost,
      'reward-redeemed',
      null,
      'Redeemed: ' || v_reward_name || ' (' || v_code || ')'
    );

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'rewardName', v_reward_name,
    'pointsSpent', v_cost,
    'newBalance', v_balance - v_cost
  );
end;
$$;

revoke all on function public.redeem_reward(text) from public, anon;
grant execute on function public.redeem_reward(text) to authenticated;
