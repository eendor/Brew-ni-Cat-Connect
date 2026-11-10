-- Undo supabase/migrations/20261112120000_reviews.sql.
--
-- Drops the reviews table, its functions and triggers.

drop function if exists public.my_review();
drop function if exists public.post_review(integer, text);
drop trigger if exists reviews_stamp on public.reviews;
drop table if exists public.reviews;
