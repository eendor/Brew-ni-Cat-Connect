-- Undo 20261119120000_item_ratings.sql: drop the item ratings and their functions.

drop function if exists public.item_rating_summary();
drop function if exists public.rate_item(text, integer);
drop function if exists private.is_rateable_item(text);
drop function if exists private.is_shop_only_name(text);
drop table if exists public.item_ratings;
