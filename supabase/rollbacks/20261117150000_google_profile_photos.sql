-- Undo 20261117150000_google_profile_photos.sql: put back the review functions of 20261112120000_reviews.sql
-- and drop the photo column.

drop function if exists public.post_review(integer, text, boolean);
drop function if exists private.google_avatar_url(uuid);

create or replace function public.post_review(
  p_rating integer,
  p_body text
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
  v_review record;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  v_trimmed_body := btrim(
    p_body,
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  );

  if char_length(coalesce(v_trimmed_body, '')) < 1 or char_length(v_trimmed_body) > 500 then
    raise exception 'Review text must be between 1 and 500 characters.';
  end if;

  v_user_id := (select auth.uid());

  if v_user_id is not null then
    -- Signed-in customer: derive first name from customer_profiles.full_name
    select p.full_name into v_full_name
    from public.customer_profiles as p
    where p.user_id = v_user_id;

    v_first_name := split_part(
      btrim(
        coalesce(v_full_name, ''),
        U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
      ),
      ' ',
      1
    );

    if v_first_name = '' then
      v_first_name := 'Customer';
    end if;

    insert into public.reviews (customer_id, display_name, rating, body)
    values (v_user_id, v_first_name, p_rating::smallint, v_trimmed_body)
    on conflict (customer_id) where customer_id is not null
    do update set
      display_name = excluded.display_name,
      rating = excluded.rating,
      body = excluded.body
    returning id, display_name, rating, body, hidden, created_at, updated_at
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
    returning id, display_name, rating, body, hidden, created_at, updated_at
    into v_review;
  end if;

  return jsonb_build_object(
    'id', v_review.id,
    'display_name', v_review.display_name,
    'rating', v_review.rating,
    'body', v_review.body,
    'hidden', v_review.hidden,
    'created_at', v_review.created_at,
    'updated_at', v_review.updated_at
  );
end;
$$;

revoke all on function public.post_review(integer, text) from public;
grant execute on function public.post_review(integer, text) to anon, authenticated;

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

  select id, display_name, rating, body, hidden, created_at, updated_at
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
    'created_at', v_review.created_at,
    'updated_at', v_review.updated_at
  );
end;
$$;

revoke all on function public.my_review() from public;
grant execute on function public.my_review() to anon, authenticated;

alter table public.reviews drop column if exists avatar_url;
