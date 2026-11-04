-- Undo 20261104120000_more_rider_partners.sql: takes GutomKa Express Kabacan,
-- OZMO Delivery Kabacan 2.0 and Minute Delivery Kabacan off the saved rider
-- list (matched by Facebook page). Every other rider stays, in its order. The
-- change history records the undo too.

update public.site_content
set content = jsonb_set(
  content,
  '{partners}',
  coalesce(
    (
      select jsonb_agg(listed.partner order by listed.rank)
      from jsonb_array_elements(content -> 'partners')
        with ordinality as listed (partner, rank)
      where listed.partner ->> 'href' not in (
        'https://www.facebook.com/GutomKaExpressKabacan',
        'https://www.facebook.com/profile.php?id=61595537931810',
        'https://www.facebook.com/MinuteDeliveryKabacan2'
      )
    ),
    '[]'::jsonb
  )
)
where section = 'riders';
