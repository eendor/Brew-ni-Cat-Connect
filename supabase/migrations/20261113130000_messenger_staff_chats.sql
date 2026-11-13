-- FR-114: the Messenger assistant stays quiet in a chat after the staff
-- reply in it by hand. Meta sends the webhook an echo of every message the
-- Page sends; an echo the assistant didn't send is a staff reply. The time of
-- that reply is kept here so every server instance knows it, and typed
-- messages in that chat are left to the staff for 12 hours.
--
-- A chat is named by a code the server makes from the customer's Messenger
-- ID with the Meta app secret (64 hex characters). The table never holds the
-- ID itself, and nobody without the app secret can make a customer's code,
-- so nobody else can quiet the assistant for them. Rows older than two days
-- are removed as new ones are added.
--
-- Undo: supabase/rollbacks/20261113130000_messenger_staff_chats.sql.

create table private.messenger_staff_chats (
  chat text primary key check (chat ~ '^[0-9a-f]{64}$'),
  replied_at timestamptz not null default now()
);

alter table private.messenger_staff_chats enable row level security;

create or replace function public.note_messenger_staff_reply(p_chat text)
returns void
language plpgsql
security definer
volatile
set search_path = ''
as $$
begin
  if p_chat is null or p_chat !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid chat' using errcode = '22023';
  end if;
  delete from private.messenger_staff_chats
  where replied_at < now() - interval '2 days';
  insert into private.messenger_staff_chats (chat, replied_at)
  values (p_chat, now())
  on conflict (chat) do update set replied_at = excluded.replied_at;
end;
$$;

revoke all on function public.note_messenger_staff_reply(text) from public;
grant execute on function public.note_messenger_staff_reply(text)
  to anon, authenticated;

create or replace function public.messenger_staff_replied_at(p_chat text)
returns timestamptz
language sql
security definer
stable
set search_path = ''
as $$
  select replied_at from private.messenger_staff_chats where chat = p_chat;
$$;

revoke all on function public.messenger_staff_replied_at(text) from public;
grant execute on function public.messenger_staff_replied_at(text)
  to anon, authenticated;
