│
◇  Downloading snippet...
-- =========================================================
-- QUERY 42 — GENERAL Q&A
-- =========================================================

create table if not exists public.training_questions (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  question text not null,

  answer text,

  status text not null default 'open'
    check (status in ('open', 'answered')),

  answered_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  answered_at timestamptz
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

create index if not exists
training_questions_learner_id_idx
on public.training_questions(learner_id);

create index if not exists
training_questions_status_idx
on public.training_questions(status);

create index if not exists
training_questions_created_at_idx
on public.training_questions(created_at desc);

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table public.training_questions
enable row level security;

-- Learners can see their own questions

drop policy if exists
"learners_can_view_own_questions"
on public.training_questions;

create policy
"learners_can_view_own_questions"
on public.training_questions
for select
to authenticated
using (
  learner_id = auth.uid()
  or public.is_trainer()
);

-- Learners can submit their own questions

drop policy if exists
"learners_can_create_questions"
on public.training_questions;

create policy
"learners_can_create_questions"
on public.training_questions
for insert
to authenticated
with check (
  learner_id = auth.uid()
);

-- Trainers can update / answer questions

drop policy if exists
"trainers_can_update_questions"
on public.training_questions;

create policy
"trainers_can_update_questions"
on public.training_questions
for update
to authenticated
using (
  public.is_trainer()
)
with check (
  public.is_trainer()
);

-- Trainers can delete questions if needed

drop policy if exists
"trainers_can_delete_questions"
on public.training_questions;

create policy
"trainers_can_delete_questions"
on public.training_questions
for delete
to authenticated
using (
  public.is_trainer()
);
