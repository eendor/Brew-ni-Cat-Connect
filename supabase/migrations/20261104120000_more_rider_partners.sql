-- Three more local rider services for the Contact page and the end of a
-- rider delivery checkout: GutomKa Express Kabacan, OZMO Delivery Kabacan 2.0
-- and Minute Delivery Kabacan. GutomKa Express goes first; the other two go
-- after the riders already listed.
--
-- FR-085: the owner keeps this list in the POS web app, so this adds to the
-- saved list instead of replacing it. A service that is already listed (the
-- same Facebook page) is not added again. The site content checks still apply
-- (at most 8 riders), and the change history records this change with no
-- account. The website's own copy of the list
-- (src/lib/site-content/fallback-shop.ts) has the same six riders.
--
-- Undo: supabase/rollbacks/20261104120000_more_rider_partners.sql.

with added (place, rank, partner) as (
  values
    (1, 1, '{
      "name": "GutomKa Express Kabacan",
      "href": "https://www.facebook.com/GutomKaExpressKabacan",
      "logo": "/images/riders/gutomka-express.jpg"
    }'::jsonb),
    (3, 1, '{
      "name": "OZMO Delivery Kabacan 2.0",
      "href": "https://www.facebook.com/profile.php?id=61595537931810",
      "logo": "/images/riders/ozmo-delivery.jpg"
    }'::jsonb),
    (3, 2, '{
      "name": "Minute Delivery Kabacan",
      "href": "https://www.facebook.com/MinuteDeliveryKabacan2",
      "logo": "/images/riders/minute-delivery.jpg"
    }'::jsonb)
),
saved as (
  select listed.partner, listed.rank
  from public.site_content as content_row
  cross join lateral jsonb_array_elements(content_row.content -> 'partners')
    with ordinality as listed (partner, rank)
  where content_row.section = 'riders'
),
merged as (
  select a.place, a.rank, a.partner
  from added as a
  where not exists (
    select 1 from saved as s where s.partner ->> 'href' = a.partner ->> 'href'
  )
  union all
  select 2, s.rank, s.partner
  from saved as s
)
update public.site_content
set content = jsonb_set(
  content,
  '{partners}',
  (select jsonb_agg(m.partner order by m.place, m.rank) from merged as m)
)
where section = 'riders';
