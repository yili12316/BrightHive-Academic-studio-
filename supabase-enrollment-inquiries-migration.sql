-- Save BrightHive web applications privately in Supabase.
-- Run in the project's SQL Editor before deploying the enrollment-request function.

create table if not exists public.enrollment_inquiries (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('after_school', 'art')),
  parent_name text not null check (char_length(btrim(parent_name)) between 2 and 80),
  parent_email text not null check (char_length(parent_email) <= 254 and position('@' in parent_email) > 1),
  parent_phone text not null check (char_length(btrim(parent_phone)) between 7 and 40),
  number_of_children smallint not null check (number_of_children between 1 and 6),
  children jsonb not null check (
    jsonb_typeof(children) = 'array'
    and jsonb_array_length(children) between 1 and 6
    and jsonb_array_length(children) = number_of_children
  ),
  preferred_start text not null default 'Flexible',
  preferred_date date,
  preferred_time time,
  class_length text check (class_length is null or class_length in ('one_hour', 'two_hours')),
  message text not null default '' check (char_length(message) <= 1200),
  consent boolean not null check (consent is true),
  notification_status text not null default 'not_configured'
    check (notification_status in ('not_configured', 'sent', 'failed')),
  notification_id text,
  created_at timestamptz not null default now()
);

create index if not exists enrollment_inquiries_created_at_idx
  on public.enrollment_inquiries (created_at desc);

alter table public.enrollment_inquiries enable row level security;

revoke all on public.enrollment_inquiries from anon, authenticated;
grant all on public.enrollment_inquiries to service_role;
grant select on public.enrollment_inquiries to authenticated;

drop policy if exists "staff read enrollment inquiries" on public.enrollment_inquiries;
create policy "staff read enrollment inquiries"
  on public.enrollment_inquiries
  for select to authenticated
  using (public.is_staff());

notify pgrst, 'reload schema';
