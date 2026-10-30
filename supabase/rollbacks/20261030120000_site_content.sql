-- Undo supabase/migrations/20261030120000_site_content.sql.
--
-- The website goes back to the content built into it
-- (src/lib/site-content/fallback-shop.ts and fallback-pages.ts). The saved
-- content and its change history are deleted with their tables; the triggers
-- go with public.site_content.

drop table if exists public.site_content;
drop table if exists private.site_content_audit;

drop function if exists private.audit_site_content();
drop function if exists private.check_site_content();
drop function if exists private.is_valid_site_content(text, jsonb);
drop function if exists private.site_date_ok(jsonb);
drop function if exists private.site_photo_ok(jsonb, text[]);
drop function if exists private.site_list_ok(jsonb, integer, integer);
drop function if exists private.site_keys_ok(jsonb, text[], text[]);
drop function if exists private.site_image_ok(jsonb);
drop function if exists private.site_url_ok(jsonb, boolean);
drop function if exists private.site_text_ok(jsonb, integer, boolean);
