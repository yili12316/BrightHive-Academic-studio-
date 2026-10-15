-- BrightHive: photo-based score entry and private source images.
-- Run in Supabase SQL Editor after supabase-schema.sql.

alter table public.exams add column if not exists subject text;
alter table public.exams alter column class_id drop not null;
alter table public.exam_results add column if not exists report_path text;

-- Parents can read a classless exam only when it has a result linked to their child.
drop policy if exists "parents select exams" on public.exams;
create policy "parents select exams" on public.exams
  for select to authenticated using (
    exists (
      select 1 from public.enrollments e
      join public.parent_students ps on ps.student_id = e.student_id
      where e.class_id = exams.class_id and ps.parent_id = (select auth.uid())
    )
    or exists (
      select 1 from public.exam_results er
      join public.parent_students ps on ps.student_id = er.student_id
      where er.exam_id = exams.id and ps.parent_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-score-reports','teacher-score-reports',false,10485760,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "staff upload score reports" on storage.objects;
create policy "staff upload score reports" on storage.objects
  for insert to authenticated with check (
    bucket_id='teacher-score-reports' and public.is_staff()
    and (storage.foldername(name))[1]=(select auth.uid())::text
  );
drop policy if exists "staff read score reports" on storage.objects;
create policy "staff read score reports" on storage.objects
  for select to authenticated using (
    bucket_id='teacher-score-reports' and public.is_staff()
  );
drop policy if exists "staff delete score reports" on storage.objects;
create policy "staff delete score reports" on storage.objects
  for delete to authenticated using (
    bucket_id='teacher-score-reports' and public.is_staff()
  );

notify pgrst, 'reload schema';
