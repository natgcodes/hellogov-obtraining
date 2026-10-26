│
◇  Downloading snippet...
-- Query 40 — Link Checkpoints to Quiz Engine

alter table public.checkpoints
add column if not exists quiz_id uuid null;

alter table public.checkpoints
drop constraint if exists checkpoints_quiz_id_fkey;

alter table public.checkpoints
add constraint checkpoints_quiz_id_fkey
foreign key (quiz_id)
references public.quizzes(id)
on delete set null;

create unique index if not exists checkpoints_quiz_id_unique
on public.checkpoints(quiz_id)
where quiz_id is not null;

create index if not exists checkpoints_quiz_id_idx
on public.checkpoints(quiz_id);
