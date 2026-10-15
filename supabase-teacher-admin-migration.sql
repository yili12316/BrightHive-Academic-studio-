-- Promote current teacher accounts and ensure future teacher-code registrations
-- receive the admin role. Run once in Supabase Dashboard → SQL Editor.

update public.staff_users
set role = 'admin'
where role = 'teacher';

update public.profiles p
set role = 'admin'
where p.role = 'teacher'
  and exists (
    select 1
    from public.staff_users s
    where s.user_id = p.id
      and s.role = 'admin'
  );

create or replace function public.complete_account_onboarding(p_display_name text, p_invite_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_name text := btrim(coalesce(p_display_name, ''));
  cleaned_code text := upper(btrim(coalesce(p_invite_code, '')));
  account_role text;
  linked_student_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(cleaned_name) < 2 or char_length(cleaned_name) > 60 then raise exception 'Invalid name'; end if;

  if encode(extensions.digest(cleaned_code, 'sha256'), 'hex') = '4bc2da4c88a5d7f19e1a47aa428a1673cf6c387366839b10e4d87f9cf35ff6d2' then
    account_role := 'admin';
    insert into public.staff_users (user_id, role, display_name)
    values (auth.uid(), 'admin', cleaned_name)
    on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name;
  elsif cleaned_code = 'GSLDI2' then
    account_role := 'parent';
  else
    raise exception 'Invalid invite code';
  end if;

  update public.profiles
  set full_name = cleaned_name,
      role = account_role,
      onboarding_student_name = case when account_role = 'parent' then cleaned_name else null end,
      onboarding_complete = true,
      onboarding_completed_at = now(),
      invite_code_used = null
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;

  if account_role = 'parent' then
    select ps.student_id into linked_student_id
    from public.parent_students ps
    where ps.parent_id = auth.uid()
    limit 1;
    if linked_student_id is null then
      insert into public.students (first_name, last_name, grade, status)
      values (cleaned_name, '', '暂无', 'active')
      returning id into linked_student_id;
      insert into public.parent_students (parent_id, student_id, relationship)
      values (auth.uid(), linked_student_id, 'Parent');
    end if;
  end if;
  return account_role;
end;
$$;

revoke all on function public.complete_account_onboarding(text, text) from public;
grant execute on function public.complete_account_onboarding(text, text) to authenticated;

notify pgrst, 'reload schema';
