-- Loyalty mini-games (FR-089, ADR-034).
--
-- Signed-in customers play short games for loyalty points. The server
-- decides every result: the browser sends only which game and, for Cat
-- cups, which cup it picked, and public.play_mini_game() draws the result,
-- records it in public.game_plays and adds the points to the loyalty ledger
-- in the same transaction. Plays are free, every play earns at least one
-- point, and each customer has a few plays a day (Manila time), counted
-- under a per-customer lock so two tabs can't play past the limit.
--
-- Game plays, like loyalty rows, are never changed. A customer reads only
-- their own plays; nobody can write them except through the function.
--
-- Undo: supabase/rollbacks/20261113140000_mini_games.sql

-- ---------------------------------------------------------------------------
-- 1. Game settings (single source of truth)

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

-- ---------------------------------------------------------------------------
-- 2. Plays

create table public.game_plays (
  id bigint generated always as identity primary key,
  customer_id uuid not null references auth.users (id) on delete cascade,
  game text not null check (game in ('cat-cups', 'lucky-paw')),
  choice smallint check (choice between 0 and 9),
  outcome jsonb not null,
  points integer not null check (points > 0),
  played_on date not null,
  created_at timestamptz not null default now()
);

create index game_plays_customer_id_played_on_idx
  on public.game_plays (customer_id, played_on);

create or replace function private.reject_game_play_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Game plays cannot be changed.';
end;
$$;

revoke all on function private.reject_game_play_change()
from public, anon, authenticated;

create trigger game_plays_immutable
  before update on public.game_plays
  for each row execute function private.reject_game_play_change();

alter table public.game_plays enable row level security;

create policy customer_reads_own on public.game_plays
  for select to authenticated
  using (customer_id = (select auth.uid()));

revoke all on table public.game_plays from public, anon, authenticated;
grant select on table public.game_plays to authenticated;

-- ---------------------------------------------------------------------------
-- 3. The ledger learns about game points

alter table public.loyalty_transactions
  add column game_play_id bigint
    references public.game_plays (id) on delete cascade;

alter table public.loyalty_transactions
  drop constraint loyalty_transactions_reason_check;
alter table public.loyalty_transactions
  add constraint loyalty_transactions_reason_check check (
    reason in ('order-completed', 'reward-redeemed', 'adjustment', 'mini-game')
  );

alter table public.loyalty_transactions
  drop constraint loyalty_transactions_reason_rules;
alter table public.loyalty_transactions
  add constraint loyalty_transactions_reason_rules check (
    case reason
      when 'order-completed' then points > 0 and order_id is not null
      when 'reward-redeemed' then points < 0
      when 'mini-game' then points > 0 and game_play_id is not null
      else true
    end
  );

create unique index loyalty_transactions_one_award_per_play
  on public.loyalty_transactions (game_play_id)
  where game_play_id is not null;

-- ---------------------------------------------------------------------------
-- 4. What the games page shows

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

-- ---------------------------------------------------------------------------
-- 5. One play (FR-089)

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
