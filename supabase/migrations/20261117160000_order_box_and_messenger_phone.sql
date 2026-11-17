-- Two changes from the first week of Messenger orders.
--
-- 1. The take-out box is part of the order. Every pickup order goes out in one
--    box, and customers were told its price was "not included", then paid it
--    at the counter anyway. place_online_order() now adds one box line priced
--    from the POS menu and counts it in the total. item_count leaves the box
--    out, so "2 items" still means what the customer picked.
-- 2. A Messenger order can come without a mobile number: the shop replies in
--    the chat. The website still requires one, since a guest there has no
--    other channel. Only a request with "channel": "messenger" may leave the
--    number out; the website's API drops that field from what browsers send.
--
-- Rollback: supabase/rollbacks/20261117160000_order_box_and_messenger_phone.sql

alter table public.online_orders
  alter column customer_phone drop not null;

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
  v_item_count bigint;
  v_box_item text;
  v_box_variant text;
  v_box_priced jsonb;
  v_box_centavos bigint := 0;
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

  if v_phone = '' and (p_request ->> 'channel') = 'messenger' then
    -- A Messenger customer is reached in the chat, so the number is optional
    -- there. The website's API removes "channel" from what browsers send.
    v_phone := null;
  elsif v_phone = '' then
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

  v_item_count := (
    select sum((priced.line ->> 'quantity')::bigint)
    from jsonb_array_elements(v_priced -> 'lines') as priced(line)
  );

  -- Every pickup order goes out in one take-out box, so the box is a line of
  -- the order and part of what the customer pays. Its price is the "Take-out
  -- Box" item on the POS menu, matched by name like findTakeoutBoxPrice().
  -- An order goes on without it when the menu has no box to sell.
  select i.id, (i.variants_json::jsonb -> 0 ->> 'id')
  into v_box_item, v_box_variant
  from public.items as i
  where lower(regexp_replace(i.name, '[^A-Za-z]', '', 'g')) = 'takeoutbox'
  order by i.id
  limit 1;

  if v_box_item is not null
    and v_box_variant is not null
    and not exists (
      select 1
      from jsonb_array_elements(v_priced -> 'lines') as priced(line)
      where priced.line ->> 'itemId' = v_box_item
    )
  then
    v_box_priced := private.price_cart(jsonb_build_array(jsonb_build_object(
      'itemId', v_box_item,
      'variantId', v_box_variant,
      'flavor', null,
      'quantity', 1
    )));
    if jsonb_array_length(v_box_priced -> 'problems') = 0
      and jsonb_array_length(v_box_priced -> 'lines') = 1
    then
      v_box_centavos := (v_box_priced ->> 'subtotalCentavos')::bigint;
      v_priced := jsonb_set(
        jsonb_set(v_priced, '{lines}', (v_priced -> 'lines') || (v_box_priced -> 'lines')),
        '{subtotalCentavos}',
        to_jsonb((v_priced ->> 'subtotalCentavos')::bigint + v_box_centavos)
      );
    end if;
  end if;

  -- The customer confirms a new total before ordering. Both sides compare it
  -- as a JavaScript number. A total without the box is still taken: pages
  -- and chats opened before the box was counted showed it as an extra.
  v_subtotal_centavos := (v_priced ->> 'subtotalCentavos')::bigint;
  if private.js_decimal(p_request ->> 'expectedSubtotal')
      <> v_subtotal_centavos::double precision / 100
    and private.js_decimal(p_request ->> 'expectedSubtotal')
      <> (v_subtotal_centavos - v_box_centavos)::double precision / 100
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
        v_item_count,
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


revoke all on function public.place_online_order(jsonb, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.place_online_order(jsonb, uuid)
to anon, authenticated;
