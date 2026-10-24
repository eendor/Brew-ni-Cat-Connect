-- Server functions for online pickup orders.
--
-- - public.place_online_order() prices every line from the live menu with the
--   cart's rules (src/lib/menu/map-menu-catalog.ts,
--   src/lib/ordering/cart-pricing.ts and cart-reducer.ts), then saves the
--   order, its lines, its tracking token hash and its first status in one
--   transaction (FR-021, FR-022, FR-024, FR-025, FR-028). A retry with the
--   same idempotency key returns the same order and saves nothing new.
-- - public.get_online_order() returns one order for the order page. A guest
--   needs the reference and the tracking token. A signed-in customer reads
--   their own orders and staff read every order (FR-044, FR-045, FR-046).
-- - Every status change broadcasts a status-changed message on the order's
--   random Realtime topic (FR-047).
--
-- Both public functions run as their owner, so the tables stay closed to the
-- API: callers get only what these functions return (FR-037).
--
-- Needs pgcrypto in the extensions schema and Supabase Realtime's
-- realtime.send(), as on every Supabase project.
--
-- Undo: supabase/rollbacks/20261024064700_online_order_functions.sql

do $$
begin
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null then
    raise exception 'pgcrypto must be installed in the extensions schema.';
  end if;
  if to_regprocedure('realtime.send(jsonb, text, text, boolean)') is null then
    raise exception 'Supabase Realtime''s realtime.send() is missing.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- JavaScript rules in SQL. The cart runs in the browser, so these copy what
-- JavaScript does with strings and numbers. Then the server's price always
-- matches the price the customer saw.

-- String.prototype.trim(): removes the characters JavaScript counts as white
-- space or line ends.
create or replace function private.js_trim(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select btrim(p_value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;

-- A decimal number, as JavaScript reads it. Postgres refuses a decimal only
-- when it is too small or too large for double precision, and JavaScript then
-- gives 0 or Infinity, so the size of the number decides which.
create or replace function private.js_decimal(p_value text)
returns double precision
language plpgsql
stable
strict
set search_path = ''
as $$
declare
  is_negative boolean;
  body text;
  mantissa text;
  whole_digits text;
  fraction_digits text;
  magnitude numeric;
begin
  if pg_input_is_valid(p_value, 'double precision') then
    return p_value::double precision;
  end if;

  is_negative := left(p_value, 1) = '-';
  body := lower(ltrim(p_value, '+-'));
  mantissa := split_part(body, 'e', 1);
  whole_digits := ltrim(split_part(mantissa, '.', 1), '0');
  fraction_digits := split_part(mantissa, '.', 2);

  -- The number is about 10 ^ (magnitude - 1 + exponent).
  if whole_digits <> '' then
    magnitude := char_length(whole_digits);
  elsif ltrim(fraction_digits, '0') <> '' then
    magnitude := char_length(ltrim(fraction_digits, '0')) - char_length(fraction_digits);
  end if;

  if magnitude is not null
    and magnitude + coalesce(nullif(split_part(body, 'e', 2), '')::numeric, 0) > 0
  then
    return case when is_negative then '-Infinity' else 'Infinity' end::double precision;
  end if;
  return case when is_negative then '-0' else '0' end::double precision;
end;
$$;

-- Number(string): blank is 0, then decimals, Infinity, and 0x, 0o and 0b
-- integers. Anything else is NaN.
create or replace function private.js_string_to_number(p_value text)
returns double precision
language plpgsql
stable
strict
set search_path = ''
as $$
declare
  trimmed text := private.js_trim(p_value);
begin
  if trimmed = '' then
    return 0;
  elsif trimmed ~ '^[+-]?Infinity$' then
    return case when left(trimmed, 1) = '-' then '-Infinity' else 'Infinity' end::double precision;
  elsif trimmed ~ '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then
    return private.js_decimal(trimmed);
  elsif trimmed ~ '^0([xX][0-9a-fA-F]+|[oO][0-7]+|[bB][01]+)$' then
    begin
      return trimmed::numeric::double precision;
    exception
      when numeric_value_out_of_range then
        return 'Infinity'::double precision;
    end;
  end if;
  return 'NaN'::double precision;
end;
$$;

-- Math.round(): the nearest integer, halves up. Only used for prices, which are
-- never negative.
create or replace function private.js_round(p_value double precision)
returns double precision
language sql
immutable
strict
set search_path = ''
as $$
  select floor(p_value)
    + case when p_value - floor(p_value) >= 0.5 then 1 else 0 end;
$$;

-- Number.isSafeInteger().
create or replace function private.is_safe_integer(p_value double precision)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_value <> 'NaN'::double precision
      and p_value not in ('Infinity'::double precision, '-Infinity'::double precision)
      and floor(p_value) = p_value
      and abs(p_value) <= 9007199254740991::double precision,
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Menu rules from map-menu-catalog.ts

-- cleanText(): a trimmed, non-empty string, or null.
create or replace function private.clean_text(p_value json)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when json_typeof(p_value) = 'string' then nullif(private.js_trim(p_value #>> '{}'), '')
  end;
$$;

-- cleanPrice(): a number, or a string read with Number(), when it is finite and
-- not negative. Otherwise null.
create or replace function private.clean_price(p_value json)
returns double precision
language plpgsql
stable
strict
set search_path = ''
as $$
declare
  price double precision;
begin
  case json_typeof(p_value)
    when 'string' then
      price := private.js_string_to_number(p_value #>> '{}');
    when 'number' then
      price := private.js_decimal(p_value #>> '{}');
    else
      return null;
  end case;

  if price = 'NaN'::double precision
    or price in ('Infinity'::double precision, '-Infinity'::double precision)
    or price < 0
  then
    return null;
  end if;
  return price;
end;
$$;

-- mapFlavorPrices(): each flavor with a clean name and price, in the order
-- Object.entries() gives them. That is integer keys first, smallest first, then
-- the other keys as written. A repeated key keeps its first place and its last
-- value, as JSON.parse() does.
create or replace function private.flavor_prices(p_value json)
returns table (flavor_name text, price double precision, entry_position bigint)
language sql
stable
set search_path = ''
as $$
  with entries as (
    select
      e.key,
      min(e.ordinality) as first_position,
      (array_agg(e.value order by e.ordinality desc))[1] as last_value
    from json_each(
      case when json_typeof(p_value) = 'object' then p_value else '{}'::json end
    ) with ordinality as e(key, value, ordinality)
    group by e.key
  ),
  cleaned as (
    select
      private.js_trim(entries.key) as flavor_name,
      private.clean_price(entries.last_value) as price,
      case
        when entries.key ~ '^(0|[1-9][0-9]{0,9})$' then
          case when entries.key::bigint <= 4294967294 then entries.key::bigint end
      end as array_index,
      entries.first_position
    from entries
  )
  select
    cleaned.flavor_name,
    cleaned.price,
    row_number() over (order by cleaned.array_index nulls last, cleaned.first_position)
  from cleaned
  where cleaned.flavor_name <> '' and cleaned.price is not null;
$$;

-- mapVariants() and findCatalogVariant(): the first variant of an item with
-- this id. A variant without a clean name is skipped, and one without an id
-- gets "<item id>-variant-<position>". Returns nulls when there is no such
-- variant. For the found variant it also returns its base price, how many
-- flavor prices it has, and the price for p_flavor.
--
-- Text that JSON.parse() refuses means no variants, as in the browser. Postgres
-- also refuses JSON text with \u0000 or a lone surrogate, or nested very
-- deeply. The browser accepts those, but no real menu has them, so such an
-- item has no variants here.
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

-- ---------------------------------------------------------------------------
-- Cart rules from cart-pricing.ts

-- toCentavos(): Math.round(pesos * 100). JavaScript gives a huge number or
-- Infinity past 1e300 pesos, and Postgres would raise an error, so this gives
-- Infinity. Both mean far beyond any safe price.
create or replace function private.js_to_centavos(p_pesos double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select case
    when p_pesos is null then null
    when p_pesos = 'NaN'::double precision then 'NaN'::double precision
    when p_pesos > 1e300::double precision then 'Infinity'::double precision
    when p_pesos < -1e300::double precision then '-Infinity'::double precision
    else private.js_round(p_pesos * 100)
  end;
$$;

-- normalizePrice(): the price rounded to whole centavos.
create or replace function private.normalize_price(p_price double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select private.js_to_centavos(p_price) / 100;
$$;

-- isValidCartQuantity(): a safe integer of at least 1.
create or replace function private.is_valid_cart_quantity(p_quantity double precision)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(private.is_safe_integer(p_quantity) and p_quantity >= 1, false);
$$;

-- isSafeLineQuantity(): the line total stays a safe number of centavos.
create or replace function private.is_safe_line_quantity(
  p_unit_price double precision,
  p_quantity double precision
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  price_centavos double precision;
begin
  if not private.is_valid_cart_quantity(p_quantity) then
    return false;
  end if;

  if p_unit_price is null
    or p_unit_price = 'NaN'::double precision
    or p_unit_price in ('Infinity'::double precision, '-Infinity'::double precision)
    or p_unit_price < 0
  then
    return false;
  end if;

  price_centavos := private.js_to_centavos(p_unit_price);
  if not private.is_safe_integer(price_centavos) or price_centavos < 0 then
    return false;
  end if;

  if price_centavos = 0 then
    return true;
  end if;

  return p_quantity <= floor(9007199254740991::double precision / price_centavos);
end;
$$;

-- hasPurchasableBasePrice(): at least one centavo.
create or replace function private.has_purchasable_base_price(p_base_price double precision)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_base_price <> 'NaN'::double precision
      and p_base_price not in ('Infinity'::double precision, '-Infinity'::double precision)
      and p_base_price >= 0
      and private.js_to_centavos(p_base_price) > 0,
    false
  );
$$;

-- resolveVariantUnitPrice(): the unit price, or why there is none
-- (unknown-flavor or missing-price). p_selected_flavor is already trimmed.
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

-- ---------------------------------------------------------------------------
-- Cart rules from cart-reducer.ts

create type private.cart_line as (
  line_key text,
  item_id text,
  item_name text,
  variant_id text,
  variant_name text,
  flavor text,
  unit_price double precision,
  quantity double precision
);

-- The position of the first line with this key, or null.
create or replace function private.cart_line_index(
  p_cart private.cart_line[],
  p_line_key text
)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  for position_in_cart in 1 .. coalesce(array_length(p_cart, 1), 0) loop
    if (p_cart[position_in_cart]).line_key = p_line_key then
      return position_in_cart;
    end if;
  end loop;
  return null;
end;
$$;

-- toCartItem() and appendResolvedLine(): adds the line, or adds its quantity
-- to the line with the same key, which then takes the new names and price.
-- Leaves the cart unchanged when the line is invalid or the total quantity
-- would not be safe.
create or replace function private.add_cart_line(
  p_cart private.cart_line[],
  p_item_id text,
  p_item_name text,
  p_variant_id text,
  p_variant_name text,
  p_flavor text,
  p_unit_price double precision,
  p_quantity double precision
)
returns private.cart_line[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  cart private.cart_line[] := p_cart;
  candidate private.cart_line;
  existing_index integer;
  merged_quantity double precision;
begin
  candidate.item_id := private.js_trim(p_item_id);
  candidate.variant_id := private.js_trim(p_variant_id);
  candidate.item_name := private.js_trim(p_item_name);
  candidate.variant_name := private.js_trim(p_variant_name);

  if candidate.item_id = ''
    or candidate.variant_id = ''
    or candidate.item_name = ''
    or candidate.variant_name = ''
    or not private.is_safe_line_quantity(p_unit_price, p_quantity)
  then
    return cart;
  end if;

  candidate.flavor := nullif(private.js_trim(p_flavor), '');
  candidate.line_key := candidate.item_id || '::' || candidate.variant_id || '::'
    || coalesce(candidate.flavor, '');
  candidate.unit_price := p_unit_price;
  candidate.quantity := p_quantity;

  existing_index := private.cart_line_index(cart, candidate.line_key);
  if existing_index is null then
    return array_append(cart, candidate);
  end if;

  merged_quantity := (cart[existing_index]).quantity + p_quantity;
  if not private.is_safe_integer(merged_quantity)
    or not private.is_safe_line_quantity(p_unit_price, merged_quantity)
  then
    return cart;
  end if;

  candidate.quantity := merged_quantity;
  cart[existing_index] := candidate;
  return cart;
end;
$$;

-- isSafeCartSubtotal(): the cart total stays a safe number of centavos.
create or replace function private.is_safe_cart_subtotal(p_cart private.cart_line[])
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  cart_entry private.cart_line;
  line_centavos double precision;
  total_centavos double precision := 0;
begin
  foreach cart_entry in array p_cart loop
    if not private.is_safe_line_quantity(cart_entry.unit_price, cart_entry.quantity) then
      return false;
    end if;

    line_centavos := private.js_to_centavos(cart_entry.unit_price) * cart_entry.quantity;
    if not private.is_safe_integer(line_centavos)
      or line_centavos > 9007199254740991::double precision - total_centavos
    then
      return false;
    end if;

    total_centavos := total_centavos + line_centavos;
  end loop;

  return private.is_safe_integer(total_centavos);
end;
$$;

-- Adds each requested line to an empty cart, exactly as addCatalogSelection()
-- does in the browser, with the live menu. Returns
--   { problems: [{ index, reason }], lines: [...], subtotalCentavos }
-- where each line has itemId, itemName, variantId, variantName, flavor,
-- unitCentavos, quantity and lineCentavos. A problem's index is the line's
-- position in p_lines, from 0, and its reason is one of the cart's
-- AddCartItemFailureReason values.
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

-- ---------------------------------------------------------------------------
-- Order helpers

-- True when the request has the shape of PlaceOrderRequest
-- (src/lib/orders/types.ts). The details and lines are checked later.
create or replace function private.is_valid_order_request(p_request jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  order_line jsonb;
begin
  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'idempotencyKey') is distinct from 'string'
    or jsonb_typeof(p_request -> 'trackingToken') is distinct from 'string'
    or (p_request -> 'fulfillment') is distinct from '"pickup"'::jsonb
    or jsonb_typeof(p_request -> 'customer') is distinct from 'object'
    or jsonb_typeof(p_request #> '{customer,name}') is distinct from 'string'
    or jsonb_typeof(p_request #> '{customer,phone}') is distinct from 'string'
    or jsonb_typeof(p_request #> '{customer,notes}') is distinct from 'string'
    or jsonb_typeof(p_request #> '{customer,paymentPreference}') is distinct from 'string'
    or jsonb_typeof(p_request -> 'lines') is distinct from 'array'
    or jsonb_typeof(p_request -> 'expectedSubtotal') is distinct from 'number'
  then
    return false;
  end if;

  if (p_request ->> 'idempotencyKey')
      !~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$'
    or (p_request ->> 'trackingToken') !~ '^[A-Za-z0-9_-]{43}$'
    or (p_request #>> '{customer,paymentPreference}') not in ('Cash', 'GCash')
    or jsonb_array_length(p_request -> 'lines') > 200
    or (p_request -> 'expectedSubtotal')::numeric < 0
  then
    return false;
  end if;

  for order_line in select jsonb_array_elements(p_request -> 'lines') loop
    if jsonb_typeof(order_line) is distinct from 'object'
      or jsonb_typeof(order_line -> 'itemId') is distinct from 'string'
      or jsonb_typeof(order_line -> 'variantId') is distinct from 'string'
      or coalesce(jsonb_typeof(order_line -> 'flavor'), 'null') not in ('null', 'string')
      or jsonb_typeof(order_line -> 'quantity') is distinct from 'number'
    then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- A Philippine mobile number as +639XXXXXXXXX, or null. Accepts what
-- validatePhoneNumber() in src/lib/ordering/validation.ts accepts: spaces,
-- hyphens and parentheses are ignored.
create or replace function private.normalize_phone(p_phone text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when phone.digits ~ '^09[0-9]{9}$' then '+63' || substr(phone.digits, 2)
    when phone.digits ~ '^\+639[0-9]{9}$' then phone.digits
  end
  from (
    select translate(
      p_phone,
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF-()',
      ''
    ) as digits
  ) as phone;
$$;

-- A time as JavaScript's toISOString() writes it, in UTC.
create or replace function private.iso_utc(p_time timestamptz)
returns text
language sql
stable
strict
set search_path = ''
as $$
  select to_char(p_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- A new random reference: BNC- and 6 characters without 0, 1, I, L or O, so it
-- is easy to read out at the counter (FR-025).
create or replace function private.new_order_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  reference text := 'BNC-';
  random_byte integer;
begin
  while char_length(reference) < 10 loop
    random_byte := get_byte(extensions.gen_random_bytes(1), 0);
    -- 248 is 8 times the 31 characters, so each one is equally likely.
    if random_byte < 248 then
      reference := reference || substr(alphabet, random_byte % 31 + 1, 1);
    end if;
  end loop;
  return reference;
end;
$$;

-- A new random Realtime topic: order: and 22 base64url characters (128 bits).
create or replace function private.new_realtime_topic()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'order:' || translate(
    encode(extensions.gen_random_bytes(16), 'base64'),
    E'+/=\n',
    '-_'
  );
$$;

-- ---------------------------------------------------------------------------
-- Place order

create or replace function public.place_online_order(
  p_request jsonb,
  p_correlation_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_idempotency_key uuid;
  v_token_hash bytea;
  v_existing record;
  v_name text;
  v_phone text;
  v_notes text;
  v_field_errors jsonb := '{}';
  v_priced jsonb;
  v_subtotal_centavos bigint;
  v_customer_id uuid;
  v_order_id uuid;
  v_reference text;
  v_created_at timestamptz;
begin
  if not private.is_valid_order_request(p_request) then
    return jsonb_build_object('ok', false, 'reason', 'invalid-request');
  end if;

  v_idempotency_key := (p_request ->> 'idempotencyKey')::uuid;
  v_token_hash := sha256(convert_to(p_request ->> 'trackingToken', 'UTF8'));

  -- A retry of a placed order gets that order back (FR-024).
  select o.reference, o.status, o.created_at, t.token_hash
  into v_existing
  from public.online_orders as o
  join private.online_order_tokens as t on t.order_id = o.id
  where o.idempotency_key = v_idempotency_key;

  if found then
    if v_existing.token_hash = v_token_hash then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'reference', v_existing.reference,
        'status', v_existing.status,
        'createdAt', private.iso_utc(v_existing.created_at)
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'invalid-request');
  end if;

  if jsonb_array_length(p_request -> 'lines') = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty-cart');
  end if;

  -- Checkout details, with the rules of validateDetails() (FR-022).
  v_name := private.js_trim(p_request #>> '{customer,name}');
  v_phone := private.js_trim(p_request #>> '{customer,phone}');
  v_notes := private.js_trim(p_request #>> '{customer,notes}');

  if v_name = '' then
    v_field_errors := v_field_errors || '{"name": "required"}';
  elsif char_length(v_name) > 100 then
    v_field_errors := v_field_errors || '{"name": "too-long"}';
  end if;

  if v_phone = '' then
    v_field_errors := v_field_errors || '{"phone": "required"}';
  else
    v_phone := private.normalize_phone(v_phone);
    if v_phone is null then
      v_field_errors := v_field_errors || '{"phone": "invalid"}';
    end if;
  end if;

  if char_length(v_notes) > 500 then
    v_field_errors := v_field_errors || '{"notes": "too-long"}';
  end if;

  if v_field_errors <> '{}'::jsonb then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid-details',
      'fieldErrors', v_field_errors
    );
  end if;

  -- Price every line from the live menu (FR-021).
  v_priced := private.price_cart(p_request -> 'lines');

  if jsonb_array_length(v_priced -> 'problems') > 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'line-unavailable',
      'lines', v_priced -> 'problems'
    );
  end if;

  if jsonb_array_length(v_priced -> 'lines') = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty-cart');
  end if;

  -- The customer confirms a new subtotal before ordering. Both sides compare
  -- the subtotal as a JavaScript number.
  v_subtotal_centavos := (v_priced ->> 'subtotalCentavos')::bigint;
  if private.js_decimal(p_request ->> 'expectedSubtotal')
    <> v_subtotal_centavos::double precision / 100
  then
    return jsonb_build_object(
      'ok', false,
      'reason', 'price-changed',
      'subtotal', round(v_subtotal_centavos::numeric / 100, 2)
    );
  end if;

  -- Link the order to the signed-in customer, if any (FR-044).
  select u.id
  into v_customer_id
  from auth.users as u
  where u.id = (select auth.uid())
    and u.deleted_at is null;

  -- A new reference or topic can repeat one in use; then try another. If a
  -- request with the same key saves first, insert nothing and return that
  -- order below.
  for attempt in 1 .. 5 loop
    begin
      insert into public.online_orders (
        reference,
        customer_id,
        customer_name,
        customer_phone,
        notes,
        payment_preference,
        subtotal,
        item_count,
        idempotency_key,
        realtime_topic
      )
      values (
        private.new_order_reference(),
        v_customer_id,
        v_name,
        v_phone,
        v_notes,
        p_request #>> '{customer,paymentPreference}',
        round(v_subtotal_centavos::numeric / 100, 2),
        (
          select sum((priced.line ->> 'quantity')::bigint)
          from jsonb_array_elements(v_priced -> 'lines') as priced(line)
        ),
        v_idempotency_key,
        private.new_realtime_topic()
      )
      on conflict (idempotency_key) do nothing
      returning id, reference, created_at
      into v_order_id, v_reference, v_created_at;
      exit;
    exception
      when unique_violation then
        if attempt = 5 then
          raise;
        end if;
    end;
  end loop;

  if v_order_id is null then
    select o.reference, o.status, o.created_at, t.token_hash
    into strict v_existing
    from public.online_orders as o
    join private.online_order_tokens as t on t.order_id = o.id
    where o.idempotency_key = v_idempotency_key;

    if v_existing.token_hash = v_token_hash then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'reference', v_existing.reference,
        'status', v_existing.status,
        'createdAt', private.iso_utc(v_existing.created_at)
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'invalid-request');
  end if;

  insert into public.online_order_items (
    order_id,
    line_number,
    item_id,
    item_name,
    variant_id,
    variant_name,
    flavor,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order_id,
    priced.line_number,
    priced.line ->> 'itemId',
    priced.line ->> 'itemName',
    priced.line ->> 'variantId',
    priced.line ->> 'variantName',
    priced.line ->> 'flavor',
    round((priced.line ->> 'unitCentavos')::numeric / 100, 2),
    (priced.line ->> 'quantity')::bigint,
    round((priced.line ->> 'lineCentavos')::numeric / 100, 2)
  from jsonb_array_elements(v_priced -> 'lines')
    with ordinality as priced(line, line_number);

  -- Only the hash is kept, so the database never holds a working token
  -- (FR-045).
  insert into private.online_order_tokens (order_id, token_hash)
  values (v_order_id, v_token_hash);

  insert into public.online_order_status_history (
    order_id,
    from_status,
    to_status,
    actor,
    changed_at,
    correlation_id
  )
  values (
    v_order_id,
    null,
    'pending',
    'customer',
    v_created_at,
    coalesce(p_correlation_id, gen_random_uuid())
  );

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'reference', v_reference,
    'status', 'pending',
    'createdAt', private.iso_utc(v_created_at)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Read one order (OrderView in src/lib/orders/types.ts). Returns null when the
-- order does not exist or the caller may not see it, so a guess learns
-- nothing. It leaves out the phone number and internal ids, because a guest
-- can forward the link.

create or replace function public.get_online_order(
  p_reference text,
  p_tracking_token text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', o.reference,
    'status', o.status,
    'fulfillment', o.fulfillment,
    'customerName', o.customer_name,
    'paymentPreference', o.payment_preference,
    'notes', o.notes,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'itemId', li.item_id,
            'itemName', li.item_name,
            'variantId', li.variant_id,
            'variantName', li.variant_name,
            'flavor', li.flavor,
            'unitPrice', li.unit_price,
            'quantity', li.quantity,
            'lineTotal', li.line_total
          )
          order by li.line_number
        )
        from public.online_order_items as li
        where li.order_id = o.id
      ),
      '[]'::jsonb
    ),
    'subtotal', o.subtotal,
    'itemCount', o.item_count,
    'rejectionReason', o.rejection_reason,
    'createdAt', private.iso_utc(o.created_at),
    'statusHistory', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'status', h.to_status,
            'changedAt', private.iso_utc(h.changed_at)
          )
          order by h.changed_at, h.id
        )
        from public.online_order_status_history as h
        where h.order_id = o.id
      ),
      '[]'::jsonb
    ),
    'realtimeTopic', o.realtime_topic
  )
  from public.online_orders as o
  where p_reference ~ '^BNC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
    and o.reference = p_reference
    and (
      (
        p_tracking_token ~ '^[A-Za-z0-9_-]{43}$'
        and exists (
          select 1
          from private.online_order_tokens as t
          where t.order_id = o.id
            and t.token_hash = sha256(convert_to(p_tracking_token, 'UTF8'))
        )
      )
      or o.customer_id = (select auth.uid())
      or (select private.is_staff())
    );
$$;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast each status change on the order's topic. The topic is
-- random and only get_online_order() returns it, so only someone who can see
-- the order can listen. A failed broadcast never blocks the change: the order
-- page also refreshes on its own (FR-048).

create or replace function private.broadcast_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object(
        'status', new.status,
        'changedAt', private.iso_utc(new.updated_at)
      ),
      'status-changed',
      new.realtime_topic,
      false
    );
  exception
    when others then
      raise warning 'Could not broadcast the order status: %', sqlerrm;
  end;
  return null;
end;
$$;

create trigger online_orders_broadcast_status
  after update of status on public.online_orders
  for each row
  when (old.status is distinct from new.status)
  execute function private.broadcast_order_status();

-- ---------------------------------------------------------------------------
-- Privileges. Only the two public functions can be called through the API.

revoke all on function private.js_trim(text) from public, anon, authenticated;
revoke all on function private.js_decimal(text) from public, anon, authenticated;
revoke all on function private.js_string_to_number(text)
from public, anon, authenticated;
revoke all on function private.js_round(double precision)
from public, anon, authenticated;
revoke all on function private.is_safe_integer(double precision)
from public, anon, authenticated;
revoke all on function private.clean_text(json) from public, anon, authenticated;
revoke all on function private.clean_price(json) from public, anon, authenticated;
revoke all on function private.flavor_prices(json) from public, anon, authenticated;
revoke all on function private.find_variant(text, text, text, text)
from public, anon, authenticated;
revoke all on function private.js_to_centavos(double precision)
from public, anon, authenticated;
revoke all on function private.normalize_price(double precision)
from public, anon, authenticated;
revoke all on function private.is_valid_cart_quantity(double precision)
from public, anon, authenticated;
revoke all on function private.is_safe_line_quantity(double precision, double precision)
from public, anon, authenticated;
revoke all on function private.has_purchasable_base_price(double precision)
from public, anon, authenticated;
revoke all on function private.resolve_unit_price(
  text, text, double precision, double precision, bigint
)
from public, anon, authenticated;
revoke all on function private.cart_line_index(private.cart_line[], text)
from public, anon, authenticated;
revoke all on function private.add_cart_line(
  private.cart_line[], text, text, text, text, text, double precision,
  double precision
)
from public, anon, authenticated;
revoke all on function private.is_safe_cart_subtotal(private.cart_line[])
from public, anon, authenticated;
revoke all on function private.price_cart(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_order_request(jsonb)
from public, anon, authenticated;
revoke all on function private.normalize_phone(text) from public, anon, authenticated;
revoke all on function private.iso_utc(timestamptz) from public, anon, authenticated;
revoke all on function private.new_order_reference() from public, anon, authenticated;
revoke all on function private.new_realtime_topic() from public, anon, authenticated;
revoke all on function private.broadcast_order_status()
from public, anon, authenticated;

revoke all on function public.place_online_order(jsonb, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.get_online_order(text, text)
from public, anon, authenticated, service_role;

grant execute on function public.place_online_order(jsonb, uuid)
to anon, authenticated;
grant execute on function public.get_online_order(text, text)
to anon, authenticated;
