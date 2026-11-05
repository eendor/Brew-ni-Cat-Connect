-- Fries mixes of up to 3 flavors (FR-027, FR-093, ADR-027).
--
-- The shop sells fries with 2 or 3 flavors, so a mix can now hold up to 3
-- different listed flavors instead of 2, stored as
-- "BBQ Scratch / Cheesy Purr / Sour Cream" like the POS. A mix still costs
-- the size price, or the dearest flavor in the mix when the size prices
-- flavors differently; private.find_variant already handles any number of
-- parts. Mixing stays limited to fries (private.price_cart). Replaces one
-- private helper with the same signature, so its grants stay as they are.
-- Undo: supabase/rollbacks/20261105120000_three_flavor_mixes.sql.

create or replace function private.resolve_unit_price(
  p_item_flavors text,
  p_selected_flavor text,
  p_base_price double precision,
  p_flavor_price double precision,
  p_flavor_price_count bigint,
  out unit_price double precision,
  out failure text
)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_selected_flavor is not null then
    -- One listed flavor, or a mix of up to 3 different listed flavors.
    if not coalesce(
      (
        select count(*) between 1 and 3
          and count(distinct part) = count(*)
          and bool_and(part = any (
            select private.js_trim(f.flavor)
            from unnest(string_to_array(coalesce(p_item_flavors, ''), '|')) as f(flavor)
          ))
        from (
          select private.js_trim(raw_part) as part
          from unnest(string_to_array(p_selected_flavor, ' / ')) as p(raw_part)
        ) as parts
      ),
      false
    ) then
      failure := 'unknown-flavor';
    elsif p_flavor_price is not null then
      unit_price := private.normalize_price(p_flavor_price);
    elsif private.has_purchasable_base_price(p_base_price) then
      unit_price := private.normalize_price(p_base_price);
    else
      failure := 'missing-price';
    end if;
  elsif p_base_price = 0 and p_flavor_price_count > 0 then
    -- A zero base price with flavor prices means "choose a flavor".
    failure := 'missing-price';
  elsif private.has_purchasable_base_price(p_base_price) then
    unit_price := private.normalize_price(p_base_price);
  else
    failure := 'missing-price';
  end if;
end;
$$;
