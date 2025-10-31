-- Employee leave requests
create table if not exists public.employee_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  leave_date date not null,
  reason text not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now(),
  decided_at timestamptz null,
  decided_by uuid null
);

create index if not exists employee_leaves_user_date_idx on public.employee_leaves (user_id, leave_date desc);
create index if not exists employee_leaves_status_idx on public.employee_leaves (status);

comment on table public.employee_leaves is 'Leave requests from employees for admin approval.';


