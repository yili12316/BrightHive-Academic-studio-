-- RETIRED: the current website no longer uses parent/teacher chat.
-- Keep this legacy migration for reference only; do not run it for current installs.
create table if not exists public.family_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, parent_id)
);

create table if not exists public.family_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.family_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.family_conversations enable row level security;
alter table public.family_chat_messages enable row level security;

drop policy if exists "chat participants read conversations" on public.family_conversations;
create policy "chat participants read conversations" on public.family_conversations
  for select to authenticated using (parent_id = (select auth.uid()) or public.is_staff());

drop policy if exists "linked parents start conversations" on public.family_conversations;
create policy "linked parents start conversations" on public.family_conversations
  for insert to authenticated with check (
    parent_id = (select auth.uid())
    and exists (
      select 1 from public.parent_students ps
      where ps.parent_id = (select auth.uid()) and ps.student_id = family_conversations.student_id
    )
  );

drop policy if exists "staff start linked conversations" on public.family_conversations;
create policy "staff start linked conversations" on public.family_conversations
  for insert to authenticated with check (
    public.is_staff()
    and exists (
      select 1 from public.parent_students ps
      where ps.parent_id = family_conversations.parent_id and ps.student_id = family_conversations.student_id
    )
  );

drop policy if exists "chat participants read messages" on public.family_chat_messages;
create policy "chat participants read messages" on public.family_chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.family_conversations c
      where c.id = family_chat_messages.conversation_id
        and (c.parent_id = (select auth.uid()) or public.is_staff())
    )
  );

drop policy if exists "chat participants send messages" on public.family_chat_messages;
create policy "chat participants send messages" on public.family_chat_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.family_conversations c
      where c.id = family_chat_messages.conversation_id
        and (c.parent_id = (select auth.uid()) or public.is_staff())
    )
  );

create or replace function public.update_family_conversation_last_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.family_conversations
  set last_message_at = new.created_at, updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists family_chat_message_updates_conversation on public.family_chat_messages;
create trigger family_chat_message_updates_conversation after insert on public.family_chat_messages
  for each row execute function public.update_family_conversation_last_message();

drop trigger if exists family_conversations_updated_at on public.family_conversations;
create trigger family_conversations_updated_at before update on public.family_conversations
  for each row execute function public.touch_updated_at();

create index if not exists family_conversations_parent_idx on public.family_conversations(parent_id, last_message_at desc);
create index if not exists family_chat_messages_conversation_idx on public.family_chat_messages(conversation_id, created_at);

grant select, insert on public.family_conversations to authenticated;
grant select, insert on public.family_chat_messages to authenticated;
