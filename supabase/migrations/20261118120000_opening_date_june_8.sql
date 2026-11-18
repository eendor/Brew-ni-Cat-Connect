-- The owner corrected the opening date: Brew ni Cat opened on June 8, 2026,
-- not June 12 (owner's message, 2026-11-18). This changes the saved About
-- content: `openedOn` and the "opened on ..." sentence in the story.
--
-- The owner edits this content in the POS web app, so only the old date is
-- replaced; any other wording they saved stays. Nothing changes if the date
-- was already edited. The change history records this change with no account.
-- The website's own copy (src/lib/site-content/fallback-pages.ts) matches.
--
-- Undo: supabase/rollbacks/20261118120000_opening_date_june_8.sql.

update public.site_content
set content = jsonb_set(
  jsonb_set(content, '{openedOn}', '"2026-06-08"'),
  '{story}',
  (
    select coalesce(
      jsonb_agg(
        to_jsonb(replace(line #>> '{}', 'June 12, 2026', 'June 8, 2026'))
        order by n
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(content -> 'story') with ordinality as s (line, n)
  )
)
where section = 'about'
  and content ->> 'openedOn' = '2026-06-12';
