-- Percentage deals are opt-in and off until a staff member activates one.
-- Rollback: supabase/rollbacks/20261120140000_menu_deals.sql

create table public.menu_deals (
  item_id text primary key references public.items(id) on delete cascade,
  percent_off integer not null check (percent_off between 1 and 99),
  active boolean not null default false
);

alter table public.menu_deals enable row level security;
revoke all on public.menu_deals from public, anon, authenticated;
grant select on public.menu_deals to anon, authenticated;
grant insert, update, delete on public.menu_deals to authenticated;

create policy read_active_deals on public.menu_deals
  for select to anon, authenticated using (active);
create policy staff_read_deals on public.menu_deals
  for select to authenticated using ((select private.is_staff()));
create policy staff_create_deals on public.menu_deals
  for insert to authenticated with check ((select private.is_staff()));
create policy staff_update_deals on public.menu_deals
  for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy staff_delete_deals on public.menu_deals
  for delete to authenticated using ((select private.is_staff()));

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
  base_flavor text;
  add_on_text text;
  add_on_labels text[];
  add_on_total double precision;
  add_on_found bigint;
  line_unit_price double precision;
  deal_percent integer;
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

    -- Add-ons ride in the flavor text like on the POS:
    -- "Spicy + Egg (Boiled), Hotdog", or "+ Egg (Boiled)" with no flavor.
    base_flavor := selected_flavor;
    add_on_text := null;
    if selected_flavor is not null then
      if left(selected_flavor, 2) = '+ ' then
        base_flavor := null;
        add_on_text := substr(selected_flavor, 3);
      elsif position(' + ' in selected_flavor) > 0 then
        base_flavor := nullif(private.js_trim(
          substr(selected_flavor, 1, position(' + ' in selected_flavor) - 1)), '');
        add_on_text := substr(selected_flavor, position(' + ' in selected_flavor) + 3);
      end if;
    end if;
    add_on_labels := coalesce(array(
      select private.js_trim(label.value)
      from unnest(string_to_array(add_on_text, ',')) as label(value)
      where private.js_trim(label.value) <> ''
    ), '{}');

    if not private.is_valid_cart_quantity(selection_quantity) then
      failure := 'invalid-quantity';
    else
      -- findCatalogItem(): the menu shows an item only when it and its
      -- category have a name.
      select
        i.id,
        private.js_trim(i.name) as name,
        i.is_available,
        i.category_id,
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
          base_flavor
        );

        if add_on_text is not null then
          select count(*), coalesce(sum(a.price), 0)
          into add_on_found, add_on_total
          from public.menu_add_ons as a
          where a.category_id = menu_item.category_id
            and a.is_available
            and private.js_trim(a.label) = any (add_on_labels);
        else
          add_on_found := 0;
          add_on_total := 0;
        end if;

        if menu_variant.variant_name is null then
          failure := 'unknown-variant';
        elsif add_on_text is not null and (
          cardinality(add_on_labels) = 0
          or cardinality(add_on_labels) <> (select count(distinct l) from unnest(add_on_labels) as l)
          or add_on_found <> cardinality(add_on_labels)
        ) then
          -- Each add-on must be one of this category's extras, once.
          failure := 'unknown-flavor';
        elsif position(' / ' in coalesce(base_flavor, '')) > 0
          and not (menu_item.id ilike '%fries%' or menu_item.name ilike '%fries%')
        then
          -- Mixing 2 flavors is offered on fries only for now.
          failure := 'unknown-flavor';
        else
          select * into resolved
          from private.resolve_unit_price(
            menu_item.flavors,
            base_flavor,
            menu_variant.base_price,
            menu_variant.flavor_price,
            menu_variant.flavor_price_count
          );

          select d.percent_off into deal_percent
          from public.menu_deals as d
          where d.item_id = menu_item.id and d.active;
          line_unit_price := case when resolved.failure is null then
            private.normalize_price(
              case when deal_percent is not null then
                round(private.js_to_centavos(resolved.unit_price)::numeric * (100 - deal_percent) / 100) / 100
              else resolved.unit_price end + add_on_total
            )
          end;
          if resolved.failure is not null then
            failure := resolved.failure;
          elsif not private.is_safe_line_quantity(line_unit_price, selection_quantity) then
            failure := 'invalid-quantity';
          else
            -- The cart first checks the line with the ids as sent.
            selection_key := (selection ->> 'itemId') || '::' || (selection ->> 'variantId')
              || '::' || coalesce(selected_flavor, '');
            existing_index := private.cart_line_index(cart, selection_key);
            if existing_index is not null then
              merged_quantity := (cart[existing_index]).quantity + selection_quantity;
              if not private.is_safe_integer(merged_quantity)
                or not private.is_safe_line_quantity(line_unit_price, merged_quantity)
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
                line_unit_price,
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
