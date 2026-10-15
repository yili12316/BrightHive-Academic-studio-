-- BrightHive parent registration and private exam-report storage.
-- Run once in Supabase Dashboard → SQL Editor after supabase-schema.sql.

create table if not exists public.family_registrations (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  parent_name text not null,
  home_address text not null,
  phone text not null,
  email text not null,
  children jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_registrations_children_array check (jsonb_typeof(children) = 'array')
);

alter table public.family_registrations enable row level security;
drop policy if exists "families read own registration" on public.family_registrations;
create policy "families read own registration" on public.family_registrations
  for select to authenticated using (parent_id = (select auth.uid()));
drop policy if exists "staff read family registrations" on public.family_registrations;
create policy "staff read family registrations" on public.family_registrations
  for select to authenticated using (public.is_staff());
grant select on public.family_registrations to authenticated;

drop trigger if exists family_registrations_updated_at on public.family_registrations;
create trigger family_registrations_updated_at before update on public.family_registrations
  for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-exam-results', 'family-exam-results', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "parents upload own exam results" on storage.objects;
create policy "parents upload own exam results" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'family-exam-results'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "parents read own exam results" on storage.objects;
create policy "parents read own exam results" on storage.objects
  for select to authenticated using (
    bucket_id = 'family-exam-results'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "parents delete own exam results" on storage.objects;
create policy "parents delete own exam results" on storage.objects
  for delete to authenticated using (
    bucket_id = 'family-exam-results'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "staff read family exam results" on storage.objects;
create policy "staff read family exam results" on storage.objects
  for select to authenticated using (
    bucket_id = 'family-exam-results' and public.is_staff()
  );

create or replace function public.complete_parent_registration(
  p_invite_code text,
  p_parent_name text,
  p_home_address text,
  p_phone text,
  p_children jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  cleaned_code text := upper(btrim(coalesce(p_invite_code, '')));
  cleaned_parent_name text := btrim(coalesce(p_parent_name, ''));
  cleaned_address text := btrim(coalesce(p_home_address, ''));
  cleaned_phone text := btrim(coalesce(p_phone, ''));
  account_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  child_item jsonb;
  saved_children jsonb := '[]'::jsonb;
  child_name text;
  child_grade text;
  child_school text;
  child_birth_date text;
  report_path text;
  linked_student_id uuid;
  used_student_ids uuid[] := '{}'::uuid[];
  child_index integer := 0;
  has_exam_result boolean := false;
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  if cleaned_code <> 'GSLDI2' then raise exception 'Invalid parent invite code'; end if;
  if char_length(cleaned_parent_name) < 2 or char_length(cleaned_parent_name) > 100 then raise exception 'Invalid parent name'; end if;
  if char_length(cleaned_address) < 5 or char_length(cleaned_address) > 240 then raise exception 'Invalid home address'; end if;
  if char_length(cleaned_phone) < 7 or char_length(cleaned_phone) > 40 then raise exception 'Invalid phone number'; end if;
  if account_email = '' or char_length(account_email) > 254 then raise exception 'Google email is unavailable'; end if;
  if jsonb_typeof(p_children) <> 'array' or jsonb_array_length(p_children) < 1 or jsonb_array_length(p_children) > 6 then
    raise exception 'Enter between one and six children';
  end if;

  for child_item in select value from jsonb_array_elements(p_children)
  loop
    child_index := child_index + 1;
    child_name := btrim(coalesce(child_item ->> 'name', ''));
    child_grade := btrim(coalesce(child_item ->> 'grade', ''));
    child_school := btrim(coalesce(child_item ->> 'school', ''));
    child_birth_date := btrim(coalesce(child_item ->> 'birth_date', ''));
    report_path := nullif(btrim(coalesce(child_item ->> 'exam_report_path', '')), '');
    if char_length(child_name) < 2 or char_length(child_name) > 100 then raise exception 'Enter each child name'; end if;
    if child_grade not in ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6') then raise exception 'Choose a grade from 1 to 6'; end if;
    if char_length(child_school) < 2 or char_length(child_school) > 160 then raise exception 'Enter each child school'; end if;
    if child_birth_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Enter each child date of birth'; end if;
    perform child_birth_date::date;
    if child_birth_date::date > current_date then raise exception 'Date of birth cannot be in the future'; end if;
    if report_path is not null and (
      left(report_path, char_length(account_id::text) + 1) <> (account_id::text || '/')
      or position('..' in report_path) > 0
      or not exists (select 1 from storage.objects o where o.bucket_id = 'family-exam-results' and o.name = report_path)
    ) then raise exception 'Exam result upload was not found'; end if;
    if report_path is not null then has_exam_result := true; end if;

    select s.id into linked_student_id
    from public.parent_students ps join public.students s on s.id = ps.student_id
    where ps.parent_id = account_id
      and s.id <> all(used_student_ids)
      and concat_ws(' ', s.first_name, s.last_name) = child_name
    order by s.created_at
    limit 1;
    if linked_student_id is null then
      insert into public.students (first_name, last_name, grade, status)
      values (child_name, '', child_grade, 'active')
      returning id into linked_student_id;
    else
      update public.students set grade = child_grade where id = linked_student_id;
    end if;
    insert into public.parent_students (parent_id, student_id, relationship)
    values (account_id, linked_student_id, 'Parent') on conflict (parent_id, student_id) do nothing;
    used_student_ids := array_append(used_student_ids, linked_student_id);
    saved_children := saved_children || jsonb_build_array(
      child_item || jsonb_build_object('student_id', linked_student_id)
    );
  end loop;

  if not has_exam_result then raise exception 'Upload at least one recent exam result'; end if;

  insert into public.family_registrations (parent_id, parent_name, home_address, phone, email, children)
  values (account_id, cleaned_parent_name, cleaned_address, cleaned_phone, account_email, saved_children)
  on conflict (parent_id) do update set
    parent_name = excluded.parent_name,
    home_address = excluded.home_address,
    phone = excluded.phone,
    email = excluded.email,
    children = excluded.children,
    updated_at = now();

  update public.profiles set
    full_name = cleaned_parent_name,
    role = 'parent',
    onboarding_student_name = coalesce(saved_children -> 0 ->> 'name', ''),
    onboarding_complete = true,
    onboarding_completed_at = now(),
    invite_code_used = null
  where id = account_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

revoke all on function public.complete_parent_registration(text, text, text, text, jsonb) from public;
grant execute on function public.complete_parent_registration(text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
