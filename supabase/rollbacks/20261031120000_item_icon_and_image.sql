-- Undo supabase/migrations/20261031120000_item_icon_and_image.sql.
--
-- Drops the icon and image_url columns and their check constraints from
-- public.items while keeping all menu items and prices intact.

alter table public.items
  drop constraint if exists items_image_url_check,
  drop constraint if exists items_icon_check,
  drop column if exists image_url,
  drop column if exists icon;
