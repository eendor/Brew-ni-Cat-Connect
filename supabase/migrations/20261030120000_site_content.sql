-- The shop's website content: hours, contact, address, payments, a notice,
-- social links, rider partners and the text and photos of the pages.
--
-- FR-085: one row per section in public.site_content. Everyone can read it
-- (the website uses the publishable key); only staff can change it, and only
-- by updating a section's content. The website rebuilds its pages from it
-- within a minute, with no redeploy.
--
-- FR-085: private.check_site_content() refuses content the website can't show
-- before it's saved. The website checks the same rules again
-- (src/lib/site-content/validate.ts) and shows its built-in copy for a section
-- it can't use, so a bad row never breaks a page.
--
-- FR-087: every change adds a row to private.site_content_audit with the
-- account, the time, and the old and new content. The audit table has no API
-- grants: it is read from the Supabase dashboard.
--
-- The rows start as the content the website shipped with
-- (src/lib/site-content/fallback-shop.ts and fallback-pages.ts).
--
-- Undo: supabase/rollbacks/20261030120000_site_content.sql.

-- ---------------------------------------------------------------------------
-- Content (FR-085)

create table public.site_content (
  section text primary key check (section in (
    'hours', 'contact', 'address', 'payments', 'notice', 'social', 'riders',
    'about', 'gallery'
  )),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.site_content is
  'One row per website section. Staff edit the content; everyone can read it.';

alter table public.site_content enable row level security;

create policy site_content_readable_by_everyone on public.site_content
  for select to anon, authenticated
  using (true);

create policy staff_edit_site_content on public.site_content
  for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

revoke all on table public.site_content from public, anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant update (content) on table public.site_content to authenticated;

-- ---------------------------------------------------------------------------
-- Audit (FR-087)

create table private.site_content_audit (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  -- the signed-in account; null for changes made from the dashboard
  changed_by uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  section text not null,
  old_content jsonb,
  new_content jsonb
);

comment on table private.site_content_audit is
  'One row per change to public.site_content. No API access; read it from the dashboard.';

create index site_content_audit_section_idx
  on private.site_content_audit (section, changed_at);

alter table private.site_content_audit enable row level security;
revoke all on table private.site_content_audit
from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The rules for each section (FR-085)
--
-- The same rules as src/lib/site-content/validate.ts. Text is one line with
-- no space at either end: no control characters, and none of the spaces
-- JavaScript's trim() removes
-- ([    -     　﻿]).
-- Each helper checks a value's type before using it, so any JSON gives true
-- or false, never an error.

create function private.site_text_ok(
  p_value jsonb,
  p_max integer,
  p_allow_empty boolean default false
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'string' then
    return false;
  end if;
  v_text := p_value #>> '{}';
  return v_text !~ '[\u0001-\u001f\u007f]'
    and v_text !~ '^[    -     　﻿]|[    -     　﻿]$'
    and char_length(v_text) <= p_max
    and (p_allow_empty or v_text <> '');
end;
$$;

-- An https link, or "" for "not set" when p_allow_empty.
create function private.site_url_ok(
  p_value jsonb,
  p_allow_empty boolean default false
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_allow_empty and p_value is not null and p_value = '""'::jsonb then
    return true;
  end if;
  if not private.site_text_ok(p_value, 500) then
    return false;
  end if;
  return (p_value #>> '{}') ~ '^https://[^    -     　﻿/?#]+\.[^    -     　﻿/?#]+([/?#][^    -     　﻿]*)?$';
end;
$$;

-- A picture that ships with the website, under /images/.
create function private.site_image_ok(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_path text;
begin
  if not private.site_text_ok(p_value, 200) then
    return false;
  end if;
  v_path := p_value #>> '{}';
  return v_path ~ '^/images/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(jpg|jpeg|png|webp|svg)$'
    and strpos(v_path, '..') = 0
    and strpos(v_path, '//') = 0;
end;
$$;

-- An object with every required key and nothing unknown.
create function private.site_keys_ok(
  p_value jsonb,
  p_required text[],
  p_optional text[] default '{}'
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or jsonb_typeof(p_value) <> 'object' then
    return false;
  end if;
  return p_value ?& p_required
    and not exists (
      select 1
      from jsonb_object_keys(p_value) as k (key)
      where not (k.key = any (p_required || p_optional))
    );
end;
$$;

-- A list with p_min to p_max entries.
create function private.site_list_ok(
  p_value jsonb,
  p_min integer,
  p_max integer
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or jsonb_typeof(p_value) <> 'array' then
    return false;
  end if;
  return jsonb_array_length(p_value) between p_min and p_max;
end;
$$;

create function private.site_photo_ok(
  p_value jsonb,
  p_optional text[] default '{}'
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if not private.site_keys_ok(p_value, array['src', 'alt'], p_optional) then
    return false;
  end if;
  return private.site_image_ok(p_value -> 'src')
    and private.site_text_ok(p_value -> 'alt', 300);
end;
$$;

-- A real "YYYY-MM-DD" day this century.
create function private.site_date_ok(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_text text;
  v_month_start date;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'string' then
    return false;
  end if;
  v_text := p_value #>> '{}';
  if v_text !~ '^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then
    return false;
  end if;
  v_month_start := make_date(
    substr(v_text, 1, 4)::integer,
    substr(v_text, 6, 2)::integer,
    1
  );
  return substr(v_text, 9, 2)::integer
    <= extract(day from v_month_start + interval '1 month' - interval '1 day');
end;
$$;

create function private.is_valid_site_content(
  p_section text,
  p_content jsonb
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_day text;
  v_hours jsonb;
  v_item jsonb;
  v_key text;
  v_phone text;
  v_digits integer;
begin
  case p_section
  when 'hours' then
    if not private.site_keys_ok(p_content, array['days', 'note'])
      or not private.site_keys_ok(
        p_content -> 'days',
        array[
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
          'sunday'
        ]
      ) then
      return false;
    end if;
    for v_day in select jsonb_object_keys(p_content -> 'days') loop
      v_hours := p_content -> 'days' -> v_day;
      continue when jsonb_typeof(v_hours) = 'null';
      if not private.site_keys_ok(v_hours, array['opens', 'closes']) then
        return false;
      end if;
      if not coalesce(
        jsonb_typeof(v_hours -> 'opens') = 'string'
          and jsonb_typeof(v_hours -> 'closes') = 'string'
          and (v_hours ->> 'opens') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          and (v_hours ->> 'closes') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          and (v_hours ->> 'opens') collate "C" < (v_hours ->> 'closes'),
        false
      ) then
        return false;
      end if;
    end loop;
    return private.site_text_ok(p_content -> 'note', 300, true);

  when 'contact' then
    if not private.site_keys_ok(p_content, array['phone', 'email'])
      or not private.site_text_ok(p_content -> 'phone', 20)
      or not private.site_text_ok(p_content -> 'email', 254) then
      return false;
    end if;
    v_phone := p_content ->> 'phone';
    v_digits := char_length(regexp_replace(v_phone, '[^0-9]', '', 'g'));
    return v_phone ~ '^\+?[0-9][0-9 ()-]*[0-9]$'
      and v_digits between 7 and 15
      and (p_content ->> 'email')
        ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$';

  when 'address' then
    if not private.site_keys_ok(
      p_content,
      array[
        'street', 'area', 'town', 'province', 'postalCode', 'country',
        'landmark', 'mapUrl'
      ]
    ) then
      return false;
    end if;
    foreach v_key in array array['street', 'area', 'town', 'province', 'country']
    loop
      if not private.site_text_ok(p_content -> v_key, 80) then
        return false;
      end if;
    end loop;
    return jsonb_typeof(p_content -> 'postalCode') = 'string'
      and (p_content ->> 'postalCode') ~ '^[0-9]{4}$'
      and private.site_text_ok(p_content -> 'landmark', 160, true)
      and private.site_url_ok(p_content -> 'mapUrl');

  when 'payments' then
    if not private.site_keys_ok(p_content, array['methods', 'qrCode'])
      or not private.site_list_ok(p_content -> 'methods', 1, 6) then
      return false;
    end if;
    for v_item in
      select a.value from jsonb_array_elements(p_content -> 'methods') as a
    loop
      if not private.site_text_ok(v_item, 30) then
        return false;
      end if;
    end loop;
    if (
      select count(distinct a.value)
      from jsonb_array_elements(p_content -> 'methods') as a
    ) <> jsonb_array_length(p_content -> 'methods') then
      return false;
    end if;
    return jsonb_typeof(p_content -> 'qrCode') = 'null'
      or private.site_photo_ok(p_content -> 'qrCode');

  when 'notice' then
    return private.site_keys_ok(p_content, array['text'])
      and private.site_text_ok(p_content -> 'text', 300, true);

  when 'social' then
    return private.site_keys_ok(
        p_content,
        array['facebook', 'facebookPhotos', 'tiktok']
      )
      and private.site_url_ok(p_content -> 'facebook', true)
      and private.site_url_ok(p_content -> 'facebookPhotos', true)
      and private.site_url_ok(p_content -> 'tiktok', true);

  when 'riders' then
    if not private.site_keys_ok(p_content, array['partners'])
      or not private.site_list_ok(p_content -> 'partners', 0, 8) then
      return false;
    end if;
    for v_item in
      select a.value from jsonb_array_elements(p_content -> 'partners') as a
    loop
      if not (
        private.site_keys_ok(v_item, array['name', 'href', 'logo'])
        and private.site_text_ok(v_item -> 'name', 80)
        and private.site_url_ok(v_item -> 'href')
        and private.site_image_ok(v_item -> 'logo')
      ) then
        return false;
      end if;
    end loop;
    return true;

  when 'about' then
    if not private.site_keys_ok(
        p_content,
        array[
          'openedOn', 'heroTitle', 'heroText', 'homeTitle', 'homeText',
          'homePhoto', 'intro', 'storyTitle', 'story', 'photos', 'menuSummary',
          'footerText', 'catRules'
        ]
      )
      or not private.site_date_ok(p_content -> 'openedOn')
      or not private.site_photo_ok(p_content -> 'homePhoto')
      or not private.site_list_ok(p_content -> 'story', 1, 6)
      or not private.site_list_ok(p_content -> 'photos', 3, 3)
      or not private.site_list_ok(p_content -> 'catRules', 0, 6) then
      return false;
    end if;
    foreach v_key in array
      array['heroTitle', 'homeTitle', 'storyTitle', 'menuSummary']
    loop
      if not private.site_text_ok(p_content -> v_key, 80) then
        return false;
      end if;
    end loop;
    foreach v_key in array array['heroText', 'homeText', 'intro', 'footerText']
    loop
      if not private.site_text_ok(p_content -> v_key, 300) then
        return false;
      end if;
    end loop;
    for v_item in
      select a.value from jsonb_array_elements(p_content -> 'story') as a
    loop
      if not private.site_text_ok(v_item, 1000) then
        return false;
      end if;
    end loop;
    for v_item in
      select a.value from jsonb_array_elements(p_content -> 'photos') as a
    loop
      if not private.site_photo_ok(v_item) then
        return false;
      end if;
    end loop;
    for v_item in
      select a.value from jsonb_array_elements(p_content -> 'catRules') as a
    loop
      if not (
        private.site_keys_ok(v_item, array['title', 'text'])
        and private.site_text_ok(v_item -> 'title', 80)
        and private.site_text_ok(v_item -> 'text', 300)
      ) then
        return false;
      end if;
    end loop;
    return true;

  when 'gallery' then
    if not private.site_keys_ok(p_content, array['photos'])
      or not private.site_list_ok(p_content -> 'photos', 1, 80) then
      return false;
    end if;
    for v_item in
      select a.value from jsonb_array_elements(p_content -> 'photos') as a
    loop
      if not private.site_photo_ok(
        v_item,
        array['featured', 'landscape', 'people']
      ) then
        return false;
      end if;
      foreach v_key in array array['featured', 'landscape', 'people'] loop
        if v_item ? v_key and jsonb_typeof(v_item -> v_key) <> 'boolean' then
          return false;
        end if;
      end loop;
    end loop;
    return true;

  else
    return false;
  end case;
end;
$$;

-- Runs before each insert and update: refuses content the website can't
-- show and stamps the time. Security definer so the rule helpers need no
-- grants.
create function private.check_site_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(
    private.is_valid_site_content(new.section, new.content),
    false
  ) then
    raise exception 'Invalid site content for %', new.section
      using errcode = '23514',
        hint = 'The website can''t show it: a value is missing, too long or the wrong kind.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Runs after each change and records it (FR-087).
create function private.audit_site_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into private.site_content_audit
      (changed_by, action, section, old_content, new_content)
    values (auth.uid(), 'insert', new.section, null, new.content);
  elsif tg_op = 'UPDATE' then
    insert into private.site_content_audit
      (changed_by, action, section, old_content, new_content)
    values (auth.uid(), 'update', new.section, old.content, new.content);
  else
    insert into private.site_content_audit
      (changed_by, action, section, old_content, new_content)
    values (auth.uid(), 'delete', old.section, old.content, null);
  end if;
  return null;
end;
$$;

revoke all on function private.site_text_ok(jsonb, integer, boolean)
from public, anon, authenticated;
revoke all on function private.site_url_ok(jsonb, boolean)
from public, anon, authenticated;
revoke all on function private.site_image_ok(jsonb)
from public, anon, authenticated;
revoke all on function private.site_keys_ok(jsonb, text[], text[])
from public, anon, authenticated;
revoke all on function private.site_list_ok(jsonb, integer, integer)
from public, anon, authenticated;
revoke all on function private.site_photo_ok(jsonb, text[])
from public, anon, authenticated;
revoke all on function private.site_date_ok(jsonb)
from public, anon, authenticated;
revoke all on function private.is_valid_site_content(text, jsonb)
from public, anon, authenticated;
revoke all on function private.check_site_content()
from public, anon, authenticated;
revoke all on function private.audit_site_content()
from public, anon, authenticated;

create trigger check_site_content
  before insert or update on public.site_content
  for each row execute function private.check_site_content();

-- ---------------------------------------------------------------------------
-- The content the website shipped with. It goes through the check above.

insert into public.site_content (section, content) values
  ('hours', '{
    "days": {
      "monday": {
        "opens": "11:00",
        "closes": "21:00"
      },
      "tuesday": {
        "opens": "11:00",
        "closes": "21:00"
      },
      "wednesday": {
        "opens": "11:00",
        "closes": "21:00"
      },
      "thursday": {
        "opens": "11:00",
        "closes": "21:00"
      },
      "friday": {
        "opens": "11:00",
        "closes": "21:00"
      },
      "saturday": null,
      "sunday": {
        "opens": "13:00",
        "closes": "21:00"
      }
    },
    "note": "Check our Facebook page or contact us for any schedule changes."
  }'),
  ('contact', '{
    "phone": "0976 630 4785",
    "email": "popotpulido06@gmail.com"
  }'),
  ('address', '{
    "street": "Abellera St",
    "area": "Poblacion",
    "town": "Kabacan",
    "province": "Cotabato",
    "postalCode": "9407",
    "country": "Philippines",
    "landmark": "Beside Pulido Eatery",
    "mapUrl": "https://www.google.com/maps/search/?api=1&query=7.1134444%2C124.826155"
  }'),
  ('payments', '{
    "methods": [
      "Cash",
      "GCash"
    ],
    "qrCode": {
      "src": "/images/payment/gcash-qr.svg",
      "alt": "Brew ni Cat GCash and InstaPay QR code"
    }
  }'),
  ('notice', '{
    "text": ""
  }'),
  ('social', '{
    "facebook": "https://www.facebook.com/profile.php?id=100084186931413",
    "facebookPhotos": "https://www.facebook.com/profile.php?id=100084186931413&sk=photos",
    "tiktok": "https://www.tiktok.com/@potelco/video/7649246393923570965?_r=1&_t=ZS-977tdEv9JjR"
  }'),
  ('riders', '{
    "partners": [
      {
        "name": "Papa''s Delivery",
        "href": "https://www.facebook.com/papa.s.delivery.2025",
        "logo": "/images/riders/papas-delivery.jpg"
      },
      {
        "name": "Momshie''s Pamalengke and Delivery Kabacan",
        "href": "https://www.facebook.com/profile.php?id=100072119632881",
        "logo": "/images/riders/momshies-pamalengke-delivery.jpg"
      },
      {
        "name": "M&S Delivery Express Kabacan",
        "href": "https://www.facebook.com/profile.php?id=100065168154381",
        "logo": "/images/riders/ms-delivery-express.jpg"
      }
    ]
  }'),
  ('about', '{
    "openedOn": "2026-06-12",
    "heroTitle": "Coffee, comfort, and a little cat energy.",
    "heroText": "Settle in at Brew ni Cat for drinks, snacks, noodles, combos, and cozy community moments in the heart of Kabacan.",
    "homeTitle": "A local café with a playful cat-inspired spirit.",
    "homeText": "Brew ni Cat Coffee Shop welcomes the Kabacan community for drinks, bites, noodles, combos, and time spent together. The shop’s warm spaces and cat-themed personality make every visit distinctly Brew ni Cat.",
    "homePhoto": {
      "src": "/images/shop/photo_124.jpg",
      "alt": "Brew ni Cat seating area with a cat resting near the window"
    },
    "intro": "Brew ni Cat Coffee Shop is a local Kabacan café with warm spaces, a playful cat-inspired personality, and a menu made for everyday catch-ups and snack breaks.",
    "storyTitle": "Rooted in Kabacan, shaped by its community.",
    "story": [
      "Brew ni Cat opened on June 12, 2026 in Poblacion, Kabacan. The shop serves drinks, snacks, noodles, combos, and cat-themed menu choices in a relaxed local café setting.",
      "Its public website supports the business’s digitalization by making current menu and visit information easier to find. The café experience itself remains simple: come by, choose something from the menu, and enjoy the shop’s cozy character."
    ],
    "photos": [
      {
        "src": "/images/shop/photo_145.jpg",
        "alt": "Two people wearing Brew ni Cat aprons at the service counter"
      },
      {
        "src": "/images/shop/photo_009.jpg",
        "alt": "Siamese cat in front of the café’s leafy interior wall"
      },
      {
        "src": "/images/shop/photo_063.jpg",
        "alt": "Customer holding a green drink beside Brew ni Cat’s wall logo"
      }
    ],
    "menuSummary": "Drinks, snacks, noodles, and combos",
    "footerText": "A local coffee shop in Kabacan serving drinks, snacks, noodles, and combos with a little cat personality.",
    "catRules": [
      {
        "title": "No entrance fee",
        "text": "Cats roam freely; enjoy with any food or drink."
      },
      {
        "title": "Gentle paws welcome",
        "text": "Approach resting cats calmly, and pet with care."
      },
      {
        "title": "Clean cuddles",
        "text": "Please use our sanitizing stations before and after petting."
      }
    ]
  }'),
  ('gallery', '{
    "photos": [
      {
        "src": "/images/shop/photo_148.jpg",
        "alt": "Gray cat beside a salted caramel matcha inside Brew ni Cat",
        "featured": true
      },
      {
        "src": "/images/shop/photo_153.jpg",
        "alt": "Customers holding cats around a table inside Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_157.jpg",
        "alt": "Customer with a drink and two cats at a Brew ni Cat table",
        "people": true
      },
      {
        "src": "/images/shop/photo_158.jpg",
        "alt": "Customers holding cats beside drinks inside Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_152.jpg",
        "alt": "White cat beside a caramel Oreo drink by the café window",
        "featured": true
      },
      {
        "src": "/images/shop/photo_149.jpg",
        "alt": "Gray and black-and-white cats on a wooden cat shelf at Brew ni Cat"
      },
      {
        "src": "/images/shop/photo_150.jpg",
        "alt": "Gray cat sitting behind a small wooden fence in the cat area"
      },
      {
        "src": "/images/shop/photo_151.jpg",
        "alt": "White and gray cats relaxing together on the café floor"
      },
      {
        "src": "/images/shop/photo_155.jpg",
        "alt": "Customers enjoying drinks on the Brew ni Cat patio",
        "people": true
      },
      {
        "src": "/images/shop/photo_154.jpg",
        "alt": "Four customers with drinks and desserts at a Brew ni Cat table",
        "people": true
      },
      {
        "src": "/images/shop/photo_156.jpg",
        "alt": "Group of customers with drinks and a cat inside Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_159.jpg",
        "alt": "Customers beside a cat resting on the Brew ni Cat counter",
        "people": true
      },
      {
        "src": "/images/shop/photo_004.jpg",
        "alt": "Cats resting on a café table beneath blue evening lights at Brew ni Cat",
        "featured": true
      },
      {
        "src": "/images/shop/photo_006.jpg",
        "alt": "Fluffy white cat resting beside greenery inside Brew ni Cat",
        "featured": true
      },
      {
        "src": "/images/shop/photo_007.jpg",
        "alt": "Black-and-white cat sitting near a wooden cat tower at Brew ni Cat"
      },
      {
        "src": "/images/shop/photo_009.jpg",
        "alt": "Siamese cat in front of the café’s leafy interior wall"
      },
      {
        "src": "/images/shop/photo_012.jpg",
        "alt": "Three iced drinks with cat stickers lined up behind the syrup pumps",
        "featured": true
      },
      {
        "src": "/images/shop/photo_030.jpg",
        "alt": "Customers gathered around drinks and snacks inside Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_041.jpg",
        "alt": "Group enjoying colorful drinks and snacks at Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_045.jpg",
        "alt": "Customers seated in Brew ni Cat’s outdoor area",
        "people": true
      },
      {
        "src": "/images/shop/photo_060.jpg",
        "alt": "Customers sharing drinks beside a cat at the window counter",
        "people": true
      },
      {
        "src": "/images/shop/photo_063.jpg",
        "alt": "Customer holding a green drink beside Brew ni Cat’s wall logo",
        "people": true
      },
      {
        "src": "/images/shop/photo_064.jpg",
        "alt": "Customers seated outdoors under warm string lights at Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_074.jpg",
        "alt": "Customers seated with cats, drinks, and snacks inside Brew ni Cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_092.jpg",
        "alt": "Group gathered around a café table with two cats",
        "people": true
      },
      {
        "src": "/images/shop/photo_119.jpg",
        "alt": "Siamese cat sitting on wooden cat furniture inside the shop"
      },
      {
        "src": "/images/shop/photo_124.jpg",
        "alt": "Brew ni Cat seating area with a cat resting near the window"
      },
      {
        "src": "/images/shop/photo_126.jpg",
        "alt": "Fluffy white cat in a blue shirt resting by the café window",
        "featured": true
      },
      {
        "src": "/images/shop/photo_145.jpg",
        "alt": "Two people wearing Brew ni Cat aprons at the service counter",
        "people": true
      },
      {
        "src": "/images/shop/photo_146.jpg",
        "alt": "Group gathered with cats inside Brew ni Cat Coffee Shop",
        "people": true
      },
      {
        "src": "/images/shop/photo_160.jpg",
        "alt": "Two guests at a small table with fries and drinks beside the green leaf wall",
        "people": true
      },
      {
        "src": "/images/shop/photo_161.jpg",
        "alt": "Four friends sharing fries and matcha drinks around a round table",
        "people": true
      },
      {
        "src": "/images/shop/photo_162.jpg",
        "alt": "Three guests at a table of fries and drinks by the café window",
        "people": true
      },
      {
        "src": "/images/shop/photo_163.jpg",
        "alt": "Two guests at a table with a white cat and a black-and-white cat on their laps",
        "people": true
      },
      {
        "src": "/images/shop/photo_164.jpg",
        "alt": "Two guests at a small table with drinks beside the photo wall",
        "people": true
      },
      {
        "src": "/images/shop/photo_165.jpg",
        "alt": "Two guests with a tray of fries and food at a round table",
        "people": true
      },
      {
        "src": "/images/shop/photo_166.jpg",
        "alt": "Three students holding drinks over a basket of fries",
        "people": true
      },
      {
        "src": "/images/shop/photo_167.jpg",
        "alt": "Four young guests at a table with fries and iced drinks",
        "people": true
      },
      {
        "src": "/images/shop/photo_168.jpg",
        "alt": "Four friends seated together under the cloud ceiling",
        "people": true
      },
      {
        "src": "/images/shop/photo_169.jpg",
        "alt": "Three friends at a table with fries and a black-and-white cat",
        "people": true
      },
      {
        "src": "/images/shop/photo_170.jpg",
        "alt": "Guest at a table with fries, an iced drink and a fluffy white cat under the shop logo",
        "people": true
      },
      {
        "src": "/images/shop/photo_171.jpg",
        "alt": "Four teenagers at a table with matcha drinks and fries",
        "people": true
      },
      {
        "src": "/images/shop/photo_172.jpg",
        "alt": "Two guests with a cat and a basket of fries at a round table",
        "people": true
      },
      {
        "src": "/images/shop/photo_173.jpg",
        "alt": "Two guests with iced matcha and berry drinks at a table",
        "people": true
      },
      {
        "src": "/images/shop/photo_174.jpg",
        "alt": "Students with cats and a plate of fries at a corner table",
        "people": true
      },
      {
        "src": "/images/shop/photo_175.jpg",
        "alt": "Two guests with a matcha drink and fries beneath the photo wall",
        "people": true
      },
      {
        "src": "/images/shop/photo_176.jpg",
        "alt": "Two guests each holding a cat with a basket of fries on the table",
        "people": true
      },
      {
        "src": "/images/shop/photo_177.jpg",
        "alt": "Three guests with fries and drinks at a table under the Brew ni Cat sign",
        "people": true
      }
    ]
  }');

-- ---------------------------------------------------------------------------
-- From here on, every change is recorded (FR-087). A save that changes
-- nothing adds no row.

create trigger audit_site_content_insert_or_delete
  after insert or delete on public.site_content
  for each row execute function private.audit_site_content();

create trigger audit_site_content_update
  after update on public.site_content
  for each row
  when (old.content is distinct from new.content)
  execute function private.audit_site_content();

-- ---------------------------------------------------------------------------
-- Stop here, undoing everything above, if any table still has RLS off.

do $$
declare
  tables_without_rls text;
begin
  select string_agg(n.nspname || '.' || c.relname, ', ' order by c.relname)
  into tables_without_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'Row Level Security is still off on: %', tables_without_rls;
  end if;
end
$$;
