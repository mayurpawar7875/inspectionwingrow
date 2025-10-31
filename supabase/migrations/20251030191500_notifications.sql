-- Notifications table for in-app messages to employees
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_user_id uuid null,
  sent_by uuid null,
  created_at timestamptz not null default now(),
  read_by_user_ids uuid[] not null default '{}'
);

comment on table public.notifications is 'In-app notifications; null target_user_id means broadcast to all employees.';
comment on column public.notifications.target_user_id is 'If null, notification is broadcast to all.';
comment on column public.notifications.read_by_user_ids is 'List of users who have marked this notification as read.';

-- Optional indexes to speed up lookups
create index if not exists notifications_target_user_id_idx on public.notifications (target_user_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);


