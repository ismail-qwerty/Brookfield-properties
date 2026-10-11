-- Indexes for the queries the app runs most often (chat polling, unread
-- badges, lot generation, the admin users list). Without them Postgres reads
-- whole tables to find a handful of rows, which is what drains the Disk IO
-- budget on the small compute size.
--
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again: every statement is IF NOT EXISTS.

-- Chat: a thread's messages in order, and polls for "changed since".
create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at);

create index if not exists chat_messages_conversation_deleted_idx
  on public.chat_messages (conversation_id, deleted_at)
  where deleted_at is not null;

-- Chat: unread badges and mark-as-read only ever look at unread rows.
create index if not exists chat_messages_unread_idx
  on public.chat_messages (conversation_id)
  where is_read = false;

-- Chat: the support console's lists, a member's open conversation, guests.
create index if not exists chat_conversations_status_updated_idx
  on public.chat_conversations (status, updated_at desc);

create index if not exists chat_conversations_user_status_idx
  on public.chat_conversations (user_id, status);

create index if not exists chat_conversations_guest_token_idx
  on public.chat_conversations (guest_token)
  where guest_token is not null;

-- Orders: next pending lot, history, today's earnings.
create index if not exists orders_user_status_idx
  on public.orders (user_id, status);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

-- Special lots waiting to be served to a member.
create index if not exists user_special_lots_queue_user_status_idx
  on public.user_special_lots_queue (user_id, status);

-- Balance log and referral earnings per member.
create index if not exists debits_log_user_idx
  on public.debits_log (user_id);

-- Admin users list (newest first) and referral lookups.
create index if not exists users_created_idx
  on public.users (created_at desc);

create index if not exists users_referrer_idx
  on public.users (referrer_id)
  where referrer_id is not null;

-- Refresh the planner's statistics so it starts using them straight away.
analyze public.chat_messages, public.chat_conversations, public.orders,
        public.user_special_lots_queue, public.debits_log, public.users;
