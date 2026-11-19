-- Undo 20261119130000_coins.sql: points go back to whole numbers.
--
-- This loses data: coin amounts are rounded to whole points, ledger rows that
-- round to 0 (most game coins) are deleted, and game plays that earned 0.1 to
-- 0.4 coins are recorded as 1 point.

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

  v_step := coalesce((v_settings->>'currency_step')::numeric, 50);
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
  exception when unique_violation then
    raise warning 'Loyalty transaction already exists for order %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function private.sync_online_order_loyalty()
from public, anon, authenticated;

create or replace function public.redeem_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_item public.shop_rewards%rowtype;
  v_reason text;
  v_weekly_limit int :=
    coalesce((private.loyalty_settings()->>'weekly_limit')::int, 2);
  v_redeemed_this_week int;
  v_balance int;
  v_issued jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_reward_id is null or btrim(p_reward_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_reward');
  end if;

  -- one redemption at a time per customer, so the counts below hold
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- and one at a time per reward, so stock and the daily limit hold
  select * into v_item
  from public.shop_rewards
  where id = p_reward_id and kind = 'reward'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reward_not_found');
  end if;

  if not v_item.active then
    return jsonb_build_object('ok', false, 'error', 'reward_inactive');
  end if;

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

  v_reason := private.reward_unavailable(v_item, v_today);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'error', v_reason);
  end if;

  select coalesce(sum(points), 0) into v_balance
  from public.loyalty_transactions
  where customer_id = v_user_id;

  if v_balance < v_item.points_cost then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_points',
      'balance', v_balance,
      'required', v_item.points_cost
    );
  end if;

  v_issued := private.issue_reward_code(
    v_user_id, v_item, 'points', v_item.points_cost, null, v_today
  );

  insert into public.loyalty_transactions
    (customer_id, points, reason, order_id, note)
  values
    (
      v_user_id,
      -v_item.points_cost,
      'reward-redeemed',
      null,
      'Redeemed: ' || v_item.name || ' (' || (v_issued->>'code') || ')'
    );

  return jsonb_build_object(
    'ok', true,
    'code', v_issued->>'code',
    'expiresAt', v_issued->'expiresAt',
    'rewardName', v_item.name,
    'pointsSpent', v_item.points_cost,
    'newBalance', v_balance - v_item.points_cost
  );
end;
$$;

revoke all on function public.redeem_reward(text) from public, anon;
grant execute on function public.redeem_reward(text) to authenticated;

create or replace function private.mini_game_settings()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    -- Plays per customer per day (Asia/Manila), across all games.
    -- TODO: Confirm with Brew ni Cat owner (ADR-017, ADR-034).
    'daily_plays', 3,
    'games', jsonb_build_array(
      jsonb_build_object(
        'id', 'cat-cups',
        'name', 'Cat cups',
        'description', 'Oreo hides under one of three cups. Find him!',
        'choices', 3,
        'win_points', 3,
        'try_points', 1
      ),
      jsonb_build_object(
        'id', 'lucky-paw',
        'name', 'Lucky paw',
        'description', 'Shake the treat jar and see what Latte paws out.',
        'choices', 0,
        -- the treats and their chances, out of 100
        'prizes', jsonb_build_array(
          jsonb_build_object('points', 1, 'weight', 50),
          jsonb_build_object('points', 2, 'weight', 30),
          jsonb_build_object('points', 3, 'weight', 15),
          jsonb_build_object('points', 5, 'weight', 5)
        )
      )
    )
  );
$$;

revoke all on function private.mini_game_settings()
from public, anon, authenticated;

create or replace function public.mini_game_status()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings jsonb := private.mini_game_settings();
  v_daily int := (v_settings->>'daily_plays')::int;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_played int := 0;
begin
  if v_user_id is not null then
    select count(*) into v_played
    from public.game_plays
    where customer_id = v_user_id and played_on = v_today;
  end if;

  return jsonb_build_object(
    'dailyPlays', v_daily,
    'playsToday', v_played,
    'playsLeft', greatest(v_daily - v_played, 0),
    'games', (
      select jsonb_agg(
        jsonb_build_object(
          'id', g->>'id',
          'name', g->>'name',
          'description', g->>'description',
          'choices', (g->>'choices')::int,
          'winPoints', (g->>'win_points')::int,
          'tryPoints', (g->>'try_points')::int,
          'maxPoints', coalesce(
            (g->>'win_points')::int,
            (select max((p->>'points')::int)
               from jsonb_array_elements(g->'prizes') as p)
          )
        )
      )
      from jsonb_array_elements(v_settings->'games') as g
    ),
    -- FR-088: the prizes a play can win today, as the owner set them
    'prizes', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'winChance', r.win_chance,
            'available', private.reward_unavailable(r, v_today) is null
          )
          order by r.sort_order, r.id
        ),
        '[]'::jsonb
      )
      from public.shop_rewards as r
      where r.kind = 'prize' and r.active
    )
  );
end;
$$;

revoke all on function public.mini_game_status() from public;
grant execute on function public.mini_game_status() to anon, authenticated;

create or replace function public.play_mini_game(
  p_game text,
  p_choice integer default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings jsonb := private.mini_game_settings();
  v_daily int := (v_settings->>'daily_plays')::int;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_game jsonb;
  v_played int;
  v_outcome jsonb;
  v_points int;
  v_hidden int;
  v_roll int;
  v_prize jsonb;
  v_play_id bigint;
  v_balance int;
  v_roll_prize int;
  v_item public.shop_rewards%rowtype;
  v_won jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select g into v_game
  from jsonb_array_elements(v_settings->'games') as g
  where g->>'id' = p_game;

  if v_game is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_game');
  end if;

  if (v_game->>'choices')::int > 0 then
    if p_choice is null
       or p_choice < 0
       or p_choice >= (v_game->>'choices')::int then
      return jsonb_build_object('ok', false, 'error', 'invalid_choice');
    end if;
  elsif p_choice is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid_choice');
  end if;

  -- one play at a time per customer, so the count below holds
  perform pg_advisory_xact_lock(hashtext('mini-game:' || v_user_id::text));

  select count(*) into v_played
  from public.game_plays
  where customer_id = v_user_id and played_on = v_today;

  if v_played >= v_daily then
    return jsonb_build_object(
      'ok', false,
      'error', 'daily_limit_reached',
      'dailyPlays', v_daily,
      'playsLeft', 0
    );
  end if;

  if p_game = 'cat-cups' then
    v_hidden := floor(random() * (v_game->>'choices')::int)::int;
    v_points := case
      when v_hidden = p_choice then (v_game->>'win_points')::int
      else (v_game->>'try_points')::int
    end;
    v_outcome := jsonb_build_object(
      'hiddenUnder', v_hidden,
      'won', v_hidden = p_choice
    );
  else
    v_roll := floor(random() * 100)::int;
    for v_prize in select * from jsonb_array_elements(v_game->'prizes') loop
      v_roll := v_roll - (v_prize->>'weight')::int;
      if v_roll < 0 then
        v_points := (v_prize->>'points')::int;
        exit;
      end if;
    end loop;
    v_points := coalesce(v_points, 1);
    v_outcome := jsonb_build_object('treat', v_points);
  end if;

  insert into public.game_plays
    (customer_id, game, choice, outcome, points, played_on)
  values
    (v_user_id, p_game, p_choice, v_outcome, v_points, v_today)
  returning id into v_play_id;

  insert into public.loyalty_transactions
    (customer_id, points, reason, game_play_id, note)
  values
    (v_user_id, v_points, 'mini-game', v_play_id, 'Mini-game: ' || (v_game->>'name'));

  -- FR-088, FR-091: one draw per play for the owner's prizes. Each active
  -- prize has a chance out of 1000; a prize that is sold out or has reached
  -- its daily limit uses up its chance and gives nothing, so the odds the
  -- owner set for the other prizes stay as set.
  v_roll_prize := floor(random() * 1000)::int;
  for v_item in
    select * from public.shop_rewards
    where kind = 'prize' and active
    order by sort_order, id
  loop
    v_roll_prize := v_roll_prize - v_item.win_chance;
    if v_roll_prize < 0 then
      select * into v_item
      from public.shop_rewards
      where id = v_item.id
      for update;
      if private.reward_unavailable(v_item, v_today) is null then
        v_won := private.issue_reward_code(
          v_user_id, v_item, 'mini-game', 0, v_play_id, v_today
        );
      end if;
      exit;
    end if;
  end loop;

  select coalesce(sum(points), 0) into v_balance
  from public.loyalty_transactions
  where customer_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'playId', v_play_id,
    'game', p_game,
    'outcome', v_outcome,
    'points', v_points,
    'playsLeft', v_daily - v_played - 1,
    'balance', v_balance,
    'prize', v_won
  );
end;
$$;

revoke all on function public.play_mini_game(text, integer) from public, anon;
grant execute on function public.play_mini_game(text, integer) to authenticated;

alter table public.loyalty_transactions disable trigger user;
delete from public.loyalty_transactions where round(points) = 0;
alter table public.loyalty_transactions
  alter column points type integer using round(points)::integer;
alter table public.loyalty_transactions enable trigger user;

alter table public.game_plays
  drop constraint game_plays_points_check;
alter table public.game_plays
  alter column points type integer using greatest(round(points), 1)::integer;
alter table public.game_plays
  add constraint game_plays_points_check check (points > 0);
