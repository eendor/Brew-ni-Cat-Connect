-- Undo 20261117120000_shop_rewards_and_codes.sql: the rewards catalog goes back to
-- private.loyalty_settings(), the games stop giving prizes, and the codes
-- table goes away. Points already spent stay spent; their codes stay in the
-- ledger notes.

drop function public.verify_reward_code(text, boolean);

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
    'balance', v_balance
  );
end;
$$;

revoke all on function public.play_mini_game(text, integer) from public, anon;
grant execute on function public.play_mini_game(text, integer) to authenticated;

drop function private.issue_reward_code(
  uuid, public.shop_rewards, text, int, bigint, date
);
drop function private.new_reward_code(text);
drop function private.reward_unavailable(public.shop_rewards, date);
drop function private.reward_code_settings();

drop table public.reward_codes;
drop table public.shop_rewards;
drop function private.touch_shop_reward();
