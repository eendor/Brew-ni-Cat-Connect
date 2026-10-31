-- Product icon and optional image URL columns on public.items.
--
-- FR-093: the POS product editor (Android and web) lets the owner pick a
-- product icon key and optionally set an image URL or path on each item in
-- the shared catalog. Existing items keep null for both columns and fall back
-- to their built-in icon and photo mapping.
--
-- Undo: supabase/rollbacks/20261031120000_item_icon_and_image.sql.

alter table public.items
  add column icon text,
  add column image_url text,
  add constraint items_icon_check check (
    icon is null or icon ~ '^[a-z0-9_]{1,40}$'
  ),
  add constraint items_image_url_check check (
    image_url is null
    or (
      char_length(image_url) <= 500
      and image_url !~ '[\u0001-\u001f\u007f]'
      and (
        (
          image_url ~ '^/images/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(jpg|jpeg|png|webp|svg)$'
          and strpos(image_url, '..') = 0
          and strpos(image_url, '//') = 0
        )
        or image_url ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(:[0-9]{1,5})?(/[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=%-]*)?$'
      )
    )
  );

comment on column public.items.icon is
  'Optional POS icon key (e.g. coffee, cup_soda, leaf); null uses the default icon for the item or category.';

comment on column public.items.image_url is
  'Optional product image path under /images/ or https:// URL; null uses the website''s built-in photo mapping.';

-- Ensure Row Level Security remains enabled on every public and private table.
do $$
declare
  tables_without_rls text;
begin
  select string_agg(n.nspname || '.' || c.relname, ', ' order by n.nspname, c.relname)
  into tables_without_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'Row Level Security is off on: %', tables_without_rls;
  end if;
end
$$;
