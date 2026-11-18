-- Undo 20261118120000_opening_date_june_8.sql: puts the About opening date
-- back to June 12, 2026, in `openedOn` and in the story sentence. Only runs
-- while the saved date is still June 8. The change history records the undo.

update public.site_content
set content = jsonb_set(
  jsonb_set(content, '{openedOn}', '"2026-06-12"'),
  '{story}',
  (
    select coalesce(
      jsonb_agg(
        to_jsonb(replace(line #>> '{}', 'June 8, 2026', 'June 12, 2026'))
        order by n
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(content -> 'story') with ordinality as s (line, n)
  )
)
where section = 'about'
  and content ->> 'openedOn' = '2026-06-08';
