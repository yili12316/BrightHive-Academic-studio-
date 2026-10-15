-- Allows teachers to publish a dated comment for several students without
-- inventing a score. Existing numeric scores and result history are preserved.
alter table public.exam_results alter column score drop not null;
