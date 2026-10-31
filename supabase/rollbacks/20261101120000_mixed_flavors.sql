-- Undo 20261101120000_mixed_flavors.sql: puts back the single-flavor
-- helpers from 20261024064700_online_order_functions.sql. Orders already
-- placed keep their stored flavor text.

create or replace function private.find_variant(
  p_item_id text,
  p_variants_json text,
  p_variant_id text,
  p_flavor text,
  out variant_id text,
  out variant_name text,
  out base_price double precision,
  out flavor_price double precision,
  out flavor_price_count bigint
)
language plpgsql
stable
set search_path = ''
as $$
declare
  variants json;
  element json;
  element_position bigint;
  element_name text;
  element_id text;
begin
  if private.js_trim(coalesce(p_variants_json, '')) = '' then
    return;
  end if;

  begin
    variants := p_variants_json::json;
    if json_typeof(variants) <> 'array' then
      return;
    end if;

    for element, element_position in
      select v.value, v.ordinality
      from json_array_elements(variants) with ordinality as v(value, ordinality)
    loop
      continue when json_typeof(element) <> 'object';

      element_name := private.clean_text(element -> 'name');
      continue when element_name is null;

      element_id := coalesce(
        private.clean_text(element -> 'id'),
        p_item_id || '-variant-' || element_position
      );
      if element_id = p_variant_id then
        variant_id := element_id;
        variant_name := element_name;
        base_price := private.clean_price(element -> 'basePrice');
        select
          count(*),
          (array_agg(fp.price order by fp.entry_position)
            filter (where fp.flavor_name = p_flavor))[1]
        into flavor_price_count, flavor_price
        from private.flavor_prices(element -> 'priceByFlavor') as fp;
        return;
      end if;
    end loop;
  exception
    when invalid_text_representation
      or untranslatable_character
      or character_not_in_repertoire
      or numeric_value_out_of_range
      or statement_too_complex
    then
      variant_id := null;
      variant_name := null;
      base_price := null;
      flavor_price := null;
      flavor_price_count := null;
  end;
end;
$$;

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
    if not coalesce(
      p_selected_flavor = any (
        select private.js_trim(f.flavor)
        from unnest(string_to_array(coalesce(p_item_flavors, ''), '|')) as f(flavor)
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
