-- Google profile photos on reviews (FR-119, 2026-11-17).
--
-- Customers sign in with Google (ADR-030), and Google gives Supabase Auth the
-- address of their profile photo (user_metadata.avatar_url or .picture). The
-- website and the app show it on the customer's own account without storing
-- it. A signed-in customer may also show it next to their review: the photo
-- address is copied onto the review when they post with "Show my photo" on,
-- and cleared when they post with it off. Only addresses on Google's photo
-- server are kept, and the address is read from Auth, never from the request.
--
-- Undo: supabase/rollbacks/20261117150000_google_profile_photos.sql

alter table public.reviews
  add column if not exists avatar_url text
    constraint reviews_avatar_url_google
      check (
        char_length(avatar_url) <= 600
        and avatar_url ~ '^https://lh3\.googleusercontent\.com/[A-Za-z0-9/_=.-]+$'
      );

grant select (avatar_url) on table public.reviews to anon, authenticated;

-- The signed-in user's Google photo address, or null.
create or replace function private.google_avatar_url(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select candidate
  from auth.users as u,
    lateral (
      values
        (1, btrim(u.raw_user_meta_data ->> 'avatar_url')),
        (2, btrim(u.raw_user_meta_data ->> 'picture'))
    ) as c(rank, candidate)
  where u.id = p_user_id
    and char_length(candidate) <= 600
    and candidate ~ '^https://lh3\.googleusercontent\.com/[A-Za-z0-9/_=.-]+$'
  order by rank
  limit 1;
$$;

revoke all on function private.google_avatar_url(uuid) from public, anon, authenticated;

drop function if exists public.post_review(integer, text);

create or replace function public.post_review(
  p_rating integer,
  p_body text,
  p_show_photo boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_full_name text;
  v_first_name text;
  v_trimmed_body text;
  v_guest_count integer;
  v_avatar text;
  v_review record;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  v_trimmed_body := btrim(p_body, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');

  if char_length(coalesce(v_trimmed_body, '')) < 1 or char_length(v_trimmed_body) > 500 then
    raise exception 'Review text must be between 1 and 500 characters.';
  end if;

  v_user_id := (select auth.uid());

  if v_user_id is not null then
    select p.full_name into v_full_name
    from public.customer_profiles as p
    where p.user_id = v_user_id;

    v_first_name := split_part(btrim(coalesce(v_full_name, ''), U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), ' ', 1);

    if v_first_name = '' then
      v_first_name := 'Customer';
    end if;

    if coalesce(p_show_photo, true) then
      v_avatar := private.google_avatar_url(v_user_id);
    end if;

    insert into public.reviews (customer_id, display_name, rating, body, avatar_url)
    values (v_user_id, v_first_name, p_rating::smallint, v_trimmed_body, v_avatar)
    on conflict (customer_id) where customer_id is not null
    do update set
      display_name = excluded.display_name,
      rating = excluded.rating,
      body = excluded.body,
      avatar_url = excluded.avatar_url
    returning id, display_name, rating, body, hidden, avatar_url, created_at, updated_at
    into v_review;
  else
    -- Guest: backstop rate limit against flood (max 10 guest reviews in 10 minutes)
    select count(*) into v_guest_count
    from public.reviews
    where customer_id is null
      and created_at >= (now() - interval '10 minutes');

    if v_guest_count >= 10 then
      raise exception 'Too many guest reviews. Please wait a few minutes and try again.';
    end if;

    insert into public.reviews (customer_id, display_name, rating, body)
    values (null, 'Guest', p_rating::smallint, v_trimmed_body)
    returning id, display_name, rating, body, hidden, avatar_url, created_at, updated_at
    into v_review;
  end if;

  return jsonb_build_object(
    'id', v_review.id,
    'display_name', v_review.display_name,
    'rating', v_review.rating,
    'body', v_review.body,
    'hidden', v_review.hidden,
    'avatar_url', v_review.avatar_url,
    'created_at', v_review.created_at,
    'updated_at', v_review.updated_at
  );
end;
$$;

revoke all on function public.post_review(integer, text, boolean) from public;
grant execute on function public.post_review(integer, text, boolean) to anon, authenticated;

create or replace function public.my_review()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_review record;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    return null;
  end if;

  select id, display_name, rating, body, hidden, avatar_url, created_at, updated_at
  into v_review
  from public.reviews
  where customer_id = v_user_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_review.id,
    'display_name', v_review.display_name,
    'rating', v_review.rating,
    'body', v_review.body,
    'hidden', v_review.hidden,
    'avatar_url', v_review.avatar_url,
    'created_at', v_review.created_at,
    'updated_at', v_review.updated_at
  );
end;
$$;

revoke all on function public.my_review() from public;
grant execute on function public.my_review() to anon, authenticated;
