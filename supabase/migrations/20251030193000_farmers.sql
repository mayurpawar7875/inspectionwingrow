-- Farmers master table for suggestions and admin management
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.farmers is 'Master list of farmer names for suggestions and reporting.';
comment on column public.farmers.is_active is 'Inactive farmers are hidden from suggestions.';

create index if not exists farmers_is_active_name_idx on public.farmers (is_active, name);


