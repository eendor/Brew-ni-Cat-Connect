-- Undo supabase/migrations/20261024064700_online_order_functions.sql.
--
-- Removes the order functions and the status broadcast. Customers can then no
-- longer place or open online orders. The order tables and their rows stay.

drop trigger if exists online_orders_broadcast_status on public.online_orders;

drop function if exists public.place_online_order(jsonb, uuid);
drop function if exists public.get_online_order(text, text);

drop function if exists private.broadcast_order_status();
drop function if exists private.new_realtime_topic();
drop function if exists private.new_order_reference();
drop function if exists private.iso_utc(timestamptz);
drop function if exists private.normalize_phone(text);
drop function if exists private.is_valid_order_request(jsonb);
drop function if exists private.price_cart(jsonb);
drop function if exists private.is_safe_cart_subtotal(private.cart_line[]);
drop function if exists private.add_cart_line(
  private.cart_line[], text, text, text, text, text, double precision,
  double precision
);
drop function if exists private.cart_line_index(private.cart_line[], text);
drop function if exists private.resolve_unit_price(
  text, text, double precision, double precision, bigint
);
drop function if exists private.has_purchasable_base_price(double precision);
drop function if exists private.is_safe_line_quantity(double precision, double precision);
drop function if exists private.is_valid_cart_quantity(double precision);
drop function if exists private.normalize_price(double precision);
drop function if exists private.js_to_centavos(double precision);
drop function if exists private.find_variant(text, text, text, text);
drop function if exists private.flavor_prices(json);
drop function if exists private.clean_price(json);
drop function if exists private.clean_text(json);
drop function if exists private.is_safe_integer(double precision);
drop function if exists private.js_round(double precision);
drop function if exists private.js_string_to_number(text);
drop function if exists private.js_decimal(text);
drop function if exists private.js_trim(text);

drop type if exists private.cart_line;
