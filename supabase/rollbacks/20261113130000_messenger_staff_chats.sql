-- Undo 20261113130000_messenger_staff_chats.sql: the assistant forgets which
-- chats the staff replied in.

drop function public.messenger_staff_replied_at(text);
drop function public.note_messenger_staff_reply(text);
drop table private.messenger_staff_chats;
