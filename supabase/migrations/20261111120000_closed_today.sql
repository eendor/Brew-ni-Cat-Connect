-- FR-111: the owner's "Closed today" switch. A new site content section,
-- `closure`, holds { "closed": boolean, "note": text }. The owner turns it on
-- from the POS; while it is on, the website and the Messenger assistant say
-- the shop is closed and don't take online orders.
--
-- The section list gains 'closure', and the section checks gain its rule. The
-- earlier checks stay as they are: private.is_valid_site_content() is renamed
-- to private.is_valid_site_content_before_closure() and the new function
-- checks 'closure' itself and hands every other section to it. The section
-- starts open, with no note. Staff can only update rows, so the row is added
-- here. The change history records it with no account.
--
-- Undo: supabase/rollbacks/20261111120000_closed_today.sql.

alter table public.site_content
  drop constraint site_content_section_check;

alter table public.site_content
  add constraint site_content_section_check check (section in (
    'hours', 'contact', 'address', 'payments', 'notice', 'closure', 'social',
    'riders', 'about', 'gallery'
  ));

alter function private.is_valid_site_content(text, jsonb)
  rename to is_valid_site_content_before_closure;

create function private.is_valid_site_content(
  p_section text,
  p_content jsonb
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_section = 'closure' then
    return private.site_keys_ok(p_content, array['closed', 'note'])
      and jsonb_typeof(p_content -> 'closed') = 'boolean'
      and private.site_text_ok(p_content -> 'note', 300, true);
  end if;
  return private.is_valid_site_content_before_closure(p_section, p_content);
end;
$$;

revoke all on function private.is_valid_site_content(text, jsonb)
from public, anon, authenticated;

insert into public.site_content (section, content)
values ('closure', '{"closed": false, "note": ""}');
