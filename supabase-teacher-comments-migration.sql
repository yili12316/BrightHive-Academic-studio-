-- Store teacher feedback directly against registered students, without requiring
-- course enrollment or creating a score/assessment record.
create table if not exists public.student_teacher_comments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  comment_date date not null,
  teacher_comment text not null,
  teacher_name text not null default 'Teacher',
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_teacher_comments enable row level security;

drop policy if exists "parents select linked student comments" on public.student_teacher_comments;
create policy "parents select linked student comments" on public.student_teacher_comments
  for select to authenticated using (
    exists (
      select 1 from public.parent_students ps
      where ps.student_id = student_teacher_comments.student_id
        and ps.parent_id = (select auth.uid())
    )
  );

drop policy if exists "staff manage student comments" on public.student_teacher_comments;
create policy "staff manage student comments" on public.student_teacher_comments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop trigger if exists student_teacher_comments_updated_at on public.student_teacher_comments;
create trigger student_teacher_comments_updated_at before update on public.student_teacher_comments
  for each row execute function public.touch_updated_at();

create index if not exists student_teacher_comments_student_date_idx
  on public.student_teacher_comments(student_id, comment_date desc, published_at desc);

grant select, insert, update, delete on public.student_teacher_comments to authenticated;
