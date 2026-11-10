-- Undo 20261111120000_closed_today.sql: removes the 'closure' section and its
-- check, and puts back the section checks from before. The change history
-- records the removed row.

delete from public.site_content where section = 'closure';

drop function private.is_valid_site_content(text, jsonb);

alter function private.is_valid_site_content_before_closure(text, jsonb)
  rename to is_valid_site_content;

alter table public.site_content
  drop constraint site_content_section_check;

alter table public.site_content
  add constraint site_content_section_check check (section in (
    'hours', 'contact', 'address', 'payments', 'notice', 'social', 'riders',
    'about', 'gallery'
  ));
