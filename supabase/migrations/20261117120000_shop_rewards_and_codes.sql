-- Owner-managed rewards and prizes, and one-time codes (FR-088, FR-091, ADR-037).
--
-- FR-088: public.shop_rewards holds the rewards customers buy with points and
-- the prizes the mini-games can give. The owner manages them in the POS web
-- app's Rewards screen (ADR-017: owner writes stay in the POS) with a cost in
-- points (rewards), a chance out of 1000 plays (prizes), an optional stock and
-- an optional daily limit (codes issued per day, Manila time, for everyone).
-- Only staff accounts can write the table; everyone reads the active rows.
--
-- FR-091: every redeemed reward and every won prize gets a row in
-- public.reward_codes with a unique code and an expiry. Staff check the code
-- at the counter with public.verify_reward_code(); marking it used happens
-- once, under a row lock, so the same code can't be used twice. Unknown and
-- expired codes are refused. Customers read only their own codes.
--
-- The 11 owner-confirmed rewards move here from private.loyalty_settings(),
-- with no stock or daily limit, so nothing changes for customers until the
-- owner sets one. No prizes are added: the owner adds them in the POS.
--
-- Undo: supabase/rollbacks/20261117120000_shop_rewards_and_codes.sql

-- ---------------------------------------------------------------------------
-- 1. Rewards and prizes (FR-088)

create table public.shop_rewards (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  kind text not null check (kind in ('reward', 'prize')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default ''
    check (char_length(description) <= 200),
  -- rewards: what they cost in points
  points_cost integer check (points_cost between 1 and 10000),
  -- prizes: the chance a play wins it, out of 1000 plays
  win_chance integer check (win_chance between 1 and 1000),
  -- how many are left; null means no stock limit
  stock integer check (stock >= 0),
  -- how many codes a day (Manila time) for all customers; null means no limit
  daily_limit integer check (daily_limit between 1 and 1000),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint shop_rewards_kind_fields check (
    (kind = 'reward' and points_cost is not null and win_chance is null)
    or (kind = 'prize' and points_cost is null and win_chance is not null)
  )
);

create or replace function private.touch_shop_reward()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke all on function private.touch_shop_reward()
from public, anon, authenticated;

create trigger shop_rewards_touch
  before insert or update on public.shop_rewards
  for each row execute function private.touch_shop_reward();

alter table public.shop_rewards enable row level security;

create policy anyone_reads_active on public.shop_rewards
  for select to anon
  using (active);

create policy signed_in_reads_active_staff_reads_all on public.shop_rewards
  for select to authenticated
  using (active or (select private.is_staff()));

create policy staff_adds on public.shop_rewards
  for insert to authenticated
  with check ((select private.is_staff()));

create policy staff_changes on public.shop_rewards
  for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy staff_removes on public.shop_rewards
  for delete to authenticated
  using ((select private.is_staff()));

revoke all on table public.shop_rewards from public, anon, authenticated;
grant select on table public.shop_rewards to anon, authenticated;
grant insert, update, delete on table public.shop_rewards to authenticated;

insert into public.shop_rewards
  (id, kind, name, description, points_cost, active, sort_order)
select
  r.elem->>'id',
  'reward',
  r.elem->>'name',
  coalesce(r.elem->>'description', ''),
  (r.elem->>'points')::int,
  coalesce((r.elem->>'active')::boolean, true),
  r.n::int * 10
from jsonb_array_elements(private.loyalty_settings()->'rewards')
  with ordinality as r(elem, n);

-- ---------------------------------------------------------------------------
-- 2. One-time codes (FR-091)

create table public.reward_codes (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^(RWD|PRZ)-[A-Z0-9]{6,8}$'),
  customer_id uuid not null references auth.users (id) on delete cascade,
  reward_id text references public.shop_rewards (id) on delete set null,
  reward_name text not null,
  source text not null check (source in ('points', 'mini-game')),
  points_spent integer not null default 0 check (points_spent >= 0),
  -- the play that won a prize (no foreign key, so the games can be undone
  -- on their own)
  game_play_id bigint,
  issued_on date not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null,
  constraint reward_codes_redeemed_by_staff check (
    redeemed_at is not null or redeemed_by is null
  )
);

create index reward_codes_reward_id_issued_on_idx
  on public.reward_codes (reward_id, issued_on);
create index reward_codes_customer_id_idx
  on public.reward_codes (customer_id, created_at desc);

alter table public.reward_codes enable row level security;

create policy customer_reads_own_staff_reads_all on public.reward_codes
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));

revoke all on table public.reward_codes from public, anon, authenticated;
grant select on table public.reward_codes to authenticated;

-- How long codes last. Decided by the team on 2026-11-17 (the owner left the
-- rewards rules to us): a reward bought with points lasts 30 days, a prize
-- won in a game lasts 7 days.
create or replace function private.reward_code_settings()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('reward_days', 30, 'prize_days', 7);
$$;

revoke all on function private.reward_code_settings()
from public, anon, authenticated;

-- Codes the redeemed rewards already got before this migration live only in
-- the ledger note ("Redeemed: name (RWD-XXXXXX)"). They become real codes so
-- staff can still check them, valid for 30 days from when they were made.
insert into public.reward_codes
  (code, customer_id, reward_id, reward_name, source, points_spent,
   issued_on, created_at, expires_at)
select
  m.parts[2],
  t.customer_id,
  r.id,
  m.parts[1],
  'points',
  abs(t.points),
  (t.created_at at time zone 'Asia/Manila')::date,
  t.created_at,
  t.created_at + interval '30 days'
from public.loyalty_transactions as t
cross join lateral (
  select regexp_match(t.note, '^Redeemed: (.+) \(((?:RWD)-[A-Z0-9]{6})\)$') as parts
) as m
left join public.shop_rewards as r
  on r.kind = 'reward' and r.name = m.parts[1]
where t.reason = 'reward-redeemed' and m.parts is not null
on conflict (code) do nothing;

-- Why a reward or prize can't be given today, or null when it can.
create or replace function private.reward_unavailable(
  p_item public.shop_rewards,
  p_today date
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_issued int;
begin
  if not p_item.active then
    return 'reward_inactive';
  end if;
  if p_item.stock is not null and p_item.stock <= 0 then
    return 'out_of_stock';
  end if;
  if p_item.daily_limit is not null then
    select count(*) into v_issued
    from public.reward_codes
    where reward_id = p_item.id and issued_on = p_today;
    if v_issued >= p_item.daily_limit then
      return 'daily_limit_reached';
    end if;
  end if;
  return null;
end;
$$;

revoke all on function private.reward_unavailable(public.shop_rewards, date)
from public, anon, authenticated;

-- A new code that no other code has: 8 characters from strong random bytes,
-- with no 0/O or 1/I/L to misread at the counter.
create or replace function private.new_reward_code(p_prefix text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := p_prefix || '-';
    -- bytes 6 and 8 carry the uuid version and variant, so skip them
    for i in 0..15 loop
      continue when i in (6, 8);
      v_code := v_code || substr(v_alphabet, 1 + get_byte(v_bytes, i) % 31, 1);
      exit when char_length(v_code) = char_length(p_prefix) + 9;
    end loop;
    exit when not exists (select 1 from public.reward_codes where code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke all on function private.new_reward_code(text)
from public, anon, authenticated;

-- Give one reward or prize: take one from stock and record its code. The
-- caller has locked the shop_rewards row and checked it is available.
create or replace function private.issue_reward_code(
  p_customer uuid,
  p_item public.shop_rewards,
  p_source text,
  p_points int,
  p_play_id bigint,
  p_today date
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_days int := (private.reward_code_settings()->>(
    case when p_source = 'mini-game' then 'prize_days' else 'reward_days' end
  ))::int;
  v_code text := private.new_reward_code(
    case when p_source = 'mini-game' then 'PRZ' else 'RWD' end
  );
  v_expires timestamptz := now() + make_interval(days => v_days);
begin
  if p_item.stock is not null then
    update public.shop_rewards set stock = stock - 1 where id = p_item.id;
  end if;

  insert into public.reward_codes
    (code, customer_id, reward_id, reward_name, source, points_spent,
     game_play_id, issued_on, expires_at)
  values
    (v_code, p_customer, p_item.id, p_item.name, p_source, p_points,
     p_play_id, p_today, v_expires);

  return jsonb_build_object(
    'id', p_item.id,
    'name', p_item.name,
    'code', v_code,
    'expiresAt', v_expires
  );
end;
$$;

revoke all on function private.issue_reward_code(
  uuid, public.shop_rewards, text, int, bigint, date
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The rewards catalog now comes from the table (FR-054, FR-088)

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
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'points', r.points_cost,
        'stockLeft', r.stock,
        'dailyLimit', r.daily_limit,
        'unavailable', private.reward_unavailable(
          r, (now() at time zone 'Asia/Manila')::date
        )
      )
      order by r.sort_order, r.points_cost, r.id
    ),
    '[]'::jsonb
  )
  from public.shop_rewards as r
  where r.kind = 'reward' and r.active;
$$;

revoke all on function public.loyalty_rewards() from public;
grant execute on function public.loyalty_rewards() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Redeeming a reward gives a code that expires (FR-055, FR-088, FR-091)

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

-- ---------------------------------------------------------------------------
-- 5. Games show and give the owner's prizes (FR-088, FR-089)

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

-- ---------------------------------------------------------------------------
-- 6. Staff check and use a code at the counter (FR-091)
--
-- p_redeem false only looks the code up; true also marks it used. A code is
-- used once: the row is locked and must still be unused and unexpired.

create or replace function public.verify_reward_code(
  p_code text,
  p_redeem boolean default false
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v_clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_row public.reward_codes%rowtype;
begin
  if not private.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_clean !~ '^(RWD|PRZ)[A-Z0-9]{6,8}$' then
    return jsonb_build_object('ok', false, 'error', 'unknown_code');
  end if;

  select * into v_row
  from public.reward_codes
  where code = left(v_clean, 3) || '-' || substr(v_clean, 4)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_code');
  end if;

  if v_row.redeemed_at is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'already_redeemed',
      'code', v_row.code,
      'rewardName', v_row.reward_name,
      'redeemedAt', v_row.redeemed_at
    );
  end if;

  if v_row.expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'expired',
      'code', v_row.code,
      'rewardName', v_row.reward_name,
      'expiresAt', v_row.expires_at
    );
  end if;

  if p_redeem then
    update public.reward_codes
    set redeemed_at = now(), redeemed_by = auth.uid()
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_redeem then 'redeemed' else 'valid' end,
    'code', v_row.code,
    'rewardName', v_row.reward_name,
    'source', v_row.source,
    'createdAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'redeemedAt', v_row.redeemed_at
  );
end;
$$;

revoke all on function public.verify_reward_code(text, boolean) from public, anon;
grant execute on function public.verify_reward_code(text, boolean) to authenticated;
