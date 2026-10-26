│
◇  Downloading snippet...
-- =========================================================
-- QUERY 43
-- Learner Module Notes
-- Learners create notes by module.
-- Trainers can review all learner notes.
-- =========================================================

create table if not exists public.learner_module_notes (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  module_id uuid not null
    references public.modules(id)
    on delete cascade,

  note text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint learner_module_notes_unique
    unique (learner_id, module_id)
);

create index if not exists
  learner_module_notes_learner_id_idx
on public.learner_module_notes (learner_id);

create index if not exists
  learner_module_notes_module_id_idx
on public.learner_module_notes (module_id);


-- =========================================================
-- RLS
-- =========================================================

alter table public.learner_module_notes
enable row level security;


-- Learners can see their own notes.
-- Trainers can see all learner notes.

drop policy if exists
  "Learners and trainers can view module notes"
on public.learner_module_notes;

create policy
  "Learners and trainers can view module notes"
on public.learner_module_notes
for select
to authenticated
using (
  learner_id = auth.uid()
  or public.is_trainer()
);


-- Only the learner can create their own notes.

drop policy if exists
  "Learners can create own module notes"
on public.learner_module_notes;

create policy
  "Learners can create own module notes"
on public.learner_module_notes
for insert
to authenticated
with check (
  learner_id = auth.uid()
);


-- Only the learner can edit their notes.

drop policy if exists
  "Learners can update own module notes"
on public.learner_module_notes;

create policy
  "Learners can update own module notes"
on public.learner_module_notes
for update
to authenticated
using (
  learner_id = auth.uid()
)
with check (
  learner_id = auth.uid()
);


-- Only the learner can delete their notes.

drop policy if exists
  "Learners can delete own module notes"
on public.learner_module_notes;

create policy
  "Learners can delete own module notes"
on public.learner_module_notes
for delete
to authenticated
using (
  learner_id = auth.uid()
);
