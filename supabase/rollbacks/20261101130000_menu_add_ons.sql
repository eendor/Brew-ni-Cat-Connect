-- Undo 20261101130000_menu_add_ons.sql: puts back private.price_cart from
-- 20261024064700_online_order_functions.sql and drops public.menu_add_ons.
-- Orders already placed keep their stored flavor text.

create or replace function private.price_cart(p_lines jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  cart private.cart_line[] := '{}';
  next_cart private.cart_line[];
  cart_entry private.cart_line;
  problems jsonb := '[]';
  priced_lines jsonb := '[]';
  line_centavos double precision;
  subtotal_centavos double precision := 0;
  selection jsonb;
  selection_index bigint;
  selection_quantity double precision;
  selected_flavor text;
  selection_key text;
  existing_index integer;
  merged_quantity double precision;
  menu_item record;
  menu_variant record;
  resolved record;
  failure text;
begin
  for selection, selection_index in
    select l.value, l.ordinality - 1
    from jsonb_array_elements(
      case when jsonb_typeof(p_lines) = 'array' then p_lines else '[]'::jsonb end
    ) with ordinality as l(value, ordinality)
  loop
    failure := null;
    selection_quantity := case
      when jsonb_typeof(selection -> 'quantity') = 'number'
        then private.js_decimal(selection ->> 'quantity')
    end;
    selected_flavor := case
      when jsonb_typeof(selection -> 'flavor') = 'string'
        then nullif(private.js_trim(selection ->> 'flavor'), '')
    end;

    if not private.is_valid_cart_quantity(selection_quantity) then
      failure := 'invalid-quantity';
    else
      -- findCatalogItem(): the menu shows an item only when it and its
      -- category have a name.
      select
        i.id,
        private.js_trim(i.name) as name,
        i.is_available,
        i.flavors,
        i.variants_json
      into menu_item
      from public.items as i
      join public.categories as c on c.id = i.category_id
      where jsonb_typeof(selection -> 'itemId') = 'string'
        and i.id = selection ->> 'itemId'
        and private.js_trim(c.name) <> ''
        and private.js_trim(i.name) <> '';

      if not found then
        failure := 'unknown-item';
      elsif menu_item.is_available is false then
        failure := 'item-unavailable';
      elsif menu_item.is_available is null then
        failure := 'availability-unknown';
      else
        select * into menu_variant
        from private.find_variant(
          menu_item.id,
          menu_item.variants_json,
          case when jsonb_typeof(selection -> 'variantId') = 'string'
            then selection ->> 'variantId' end,
          selected_flavor
        );

        if menu_variant.variant_name is null then
          failure := 'unknown-variant';
        else
          select * into resolved
          from private.resolve_unit_price(
            menu_item.flavors,
            selected_flavor,
            menu_variant.base_price,
            menu_variant.flavor_price,
            menu_variant.flavor_price_count
          );

          if resolved.failure is not null then
            failure := resolved.failure;
          elsif not private.is_safe_line_quantity(resolved.unit_price, selection_quantity) then
            failure := 'invalid-quantity';
          else
            -- The cart first checks the line with the ids as sent.
            selection_key := (selection ->> 'itemId') || '::' || (selection ->> 'variantId')
              || '::' || coalesce(selected_flavor, '');
            existing_index := private.cart_line_index(cart, selection_key);
            if existing_index is not null then
              merged_quantity := (cart[existing_index]).quantity + selection_quantity;
              if not private.is_safe_integer(merged_quantity)
                or not private.is_safe_line_quantity(resolved.unit_price, merged_quantity)
              then
                failure := 'invalid-quantity';
              end if;
            end if;

            if failure is null then
              next_cart := private.add_cart_line(
                cart,
                menu_item.id,
                menu_item.name,
                menu_variant.variant_id,
                menu_variant.variant_name,
                selected_flavor,
                resolved.unit_price,
                selection_quantity
              );
              if private.is_safe_cart_subtotal(next_cart) then
                cart := next_cart;
              else
                failure := 'invalid-quantity';
              end if;
            end if;
          end if;
        end if;
      end if;
    end if;

    if failure is not null then
      problems := problems || jsonb_build_array(
        jsonb_build_object('index', selection_index, 'reason', failure)
      );
    end if;
  end loop;

  foreach cart_entry in array cart loop
    line_centavos := private.js_to_centavos(cart_entry.unit_price) * cart_entry.quantity;
    subtotal_centavos := subtotal_centavos + line_centavos;
    priced_lines := priced_lines || jsonb_build_array(jsonb_build_object(
      'itemId', cart_entry.item_id,
      'itemName', cart_entry.item_name,
      'variantId', cart_entry.variant_id,
      'variantName', cart_entry.variant_name,
      'flavor', cart_entry.flavor,
      'unitCentavos', private.js_to_centavos(cart_entry.unit_price)::bigint,
      'quantity', cart_entry.quantity::bigint,
      'lineCentavos', line_centavos::bigint
    ));
  end loop;

  return jsonb_build_object(
    'problems', problems,
    'lines', priced_lines,
    'subtotalCentavos', subtotal_centavos::bigint
  );
end;
$$;

drop table if exists public.menu_add_ons;
