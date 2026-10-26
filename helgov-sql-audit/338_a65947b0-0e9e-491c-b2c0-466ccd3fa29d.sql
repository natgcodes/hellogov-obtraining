│
◇  Downloading snippet...
-- ============================================================
-- 09 - QUIZ SYSTEM V2
-- HelloGov Onboarding
-- ============================================================


-- ============================================================
-- 1. EXPAND QUIZZES
-- ============================================================

alter table public.quizzes
add column if not exists instructions text,
add column if not exists is_required boolean not null default true,
add column if not exists is_published boolean not null default false,
add column if not exists shuffle_questions boolean not null default false,
add column if not exists show_results boolean not null default true;


-- ============================================================
-- 2. EXPAND QUIZ QUESTIONS
-- ============================================================

alter table public.quiz_questions
add column if not exists instructions text,
add column if not exists is_required boolean not null default true,
add column if not exists allow_partial_credit boolean not null default true;


-- ============================================================
-- 3. MATCHING / MATCH CARDS
-- ============================================================

create table if not exists public.quiz_matching_pairs (
  id uuid primary key default gen_random_uuid(),

  question_id uuid not null
    references public.quiz_questions(id)
    on delete cascade,

  left_text text not null,
  right_text text not null,

  position int4 not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  quiz_matching_pairs_question_id_idx
on public.quiz_matching_pairs(question_id);


create index if not exists
  quiz_matching_pairs_question_position_idx
on public.quiz_matching_pairs(question_id, position);


-- ============================================================
-- 4. MULTIPLE CHOICE ANSWERS
--
-- Existing selected_option_id remains useful for
-- single_choice and true_false.
--
-- This table allows one answer to contain multiple selections.
-- ============================================================

create table if not exists public.quiz_answer_options (
  id uuid primary key default gen_random_uuid(),

  answer_id uuid not null
    references public.quiz_answers(id)
    on delete cascade,

  option_id uuid not null
    references public.quiz_options(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique(answer_id, option_id)
);


create index if not exists
  quiz_answer_options_answer_id_idx
on public.quiz_answer_options(answer_id);


-- ============================================================
-- 5. LEARNER MATCHING ANSWERS
--
-- Stores the learner's selected right-side match for
-- each left-side pair.
--
-- correct_pair_id is intentionally NOT stored here.
-- Correctness will be calculated securely.
-- ============================================================

create table if not exists public.quiz_answer_matches (
  id uuid primary key default gen_random_uuid(),

  answer_id uuid not null
    references public.quiz_answers(id)
    on delete cascade,

  left_pair_id uuid not null
    references public.quiz_matching_pairs(id)
    on delete cascade,

  selected_right_pair_id uuid not null
    references public.quiz_matching_pairs(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique(answer_id, left_pair_id)
);


create index if not exists
  quiz_answer_matches_answer_id_idx
on public.quiz_answer_matches(answer_id);


-- ============================================================
-- 6. FILE UPLOAD ANSWERS
-- ============================================================

alter table public.quiz_answers
add column if not exists file_path text,
add column if not exists file_name text;


-- ============================================================
-- 7. QUESTION TYPE VALIDATION
-- ============================================================

alter table public.quiz_questions
drop constraint if exists quiz_questions_question_type_check;

alter table public.quiz_questions
add constraint quiz_questions_question_type_check
check (
  question_type in (
    'single_choice',
    'multiple_choice',
    'true_false',
    'matching',
    'match_cards',
    'open_text',
    'file_upload'
  )
);


-- ============================================================
-- 8. SCORE / ATTEMPT VALIDATION
-- ============================================================

alter table public.quizzes
drop constraint if exists quizzes_passing_score_check;

alter table public.quizzes
add constraint quizzes_passing_score_check
check (
  passing_score >= 0
  and passing_score <= 100
);


alter table public.quizzes
drop constraint if exists quizzes_max_attempts_check;

alter table public.quizzes
add constraint quizzes_max_attempts_check
check (max_attempts >= 1);


alter table public.quiz_questions
drop constraint if exists quiz_questions_points_check;

alter table public.quiz_questions
add constraint quiz_questions_points_check
check (points >= 0);


-- ============================================================
-- 9. UPDATED_AT TRIGGER FOR MATCHING PAIRS
-- Uses the set_updated_at() function we already created.
-- ============================================================

drop trigger if exists
  set_quiz_matching_pairs_updated_at
on public.quiz_matching_pairs;

create trigger set_quiz_matching_pairs_updated_at
before update on public.quiz_matching_pairs
for each row
execute function public.set_updated_at();


-- ============================================================
-- 10. ENABLE RLS
-- ============================================================

alter table public.quiz_matching_pairs
enable row level security;

alter table public.quiz_answer_options
enable row level security;

alter table public.quiz_answer_matches
enable row level security;


-- ============================================================
-- 11. REMOVE OLD QUIZ OPTION POLICIES
--
-- Critical:
-- Learners must NOT be able to SELECT quiz_options directly,
-- because that table contains is_correct.
-- ============================================================

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_options'
  loop
    execute format(
      'drop policy if exists %I on public.quiz_options',
      policy_record.policyname
    );
  end loop;
end $$;


-- Trainers can fully manage answer options.
create policy "Trainers manage quiz options"
on public.quiz_options
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 12. MATCHING PAIR SECURITY
--
-- Matching pairs themselves contain the answer mapping,
-- therefore learners must NOT read this table directly.
-- ============================================================

drop policy if exists
  "Trainers manage matching pairs"
on public.quiz_matching_pairs;

create policy "Trainers manage matching pairs"
on public.quiz_matching_pairs
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 13. SECURE LEARNER QUIZ OPTION RPC
-- ============================================================

drop function if exists public.get_quiz_options_for_learner(uuid);

create function public.get_quiz_options_for_learner(
  p_question_id uuid
)
returns table (
  option_id uuid,
  option_text text,
  item_position int4
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    qo.id as option_id,
    qo.option_text,
    qo.position as item_position
  from public.quiz_options qo
  join public.quiz_questions qq
    on qq.id = qo.question_id
  join public.quizzes q
    on q.id = qq.quiz_id
  join public.modules m
    on m.id = q.module_id
  join public.days d
    on d.id = m.day_id
  join public.programs p
    on p.id = d.program_id
  where qo.question_id = p_question_id
    and auth.uid() is not null
    and (
      public.is_trainer()
      or (
        q.is_published = true
        and d.is_published = true
        and p.status = 'published'
      )
    )
  order by qo.position;
$$;

revoke all
on function public.get_quiz_options_for_learner(uuid)
from public;

grant execute
on function public.get_quiz_options_for_learner(uuid)
to authenticated;


-- ============================================================
-- 14. SECURE MATCHING RPC
--
-- Learners need the left and right values, but must NOT receive
-- the correct pair relationship.
--
-- We return two independent sets:
-- side = left
-- side = right
--
-- The frontend can shuffle the right side.
-- ============================================================

create or replace function public.get_matching_items_for_learner(
  p_question_id uuid
)
returns table (
  id uuid,
  item_text text,
  side text,
  position int4
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    qmp.id,
    qmp.left_text,
    'left'::text,
    qmp.position
  from public.quiz_matching_pairs qmp
  join public.quiz_questions qq
    on qq.id = qmp.question_id
  join public.quizzes q
    on q.id = qq.quiz_id
  join public.modules m
    on m.id = q.module_id
  join public.days d
    on d.id = m.day_id
  join public.programs p
    on p.id = d.program_id
  where qmp.question_id = p_question_id
    and auth.uid() is not null
    and (
      public.is_trainer()
      or (
        q.is_published = true
        and d.is_published = true
        and p.status = 'published'
      )
    )

  union all

  select
    qmp.id,
    qmp.right_text,
    'right'::text,
    qmp.position
  from public.quiz_matching_pairs qmp
  join public.quiz_questions qq
    on qq.id = qmp.question_id
  join public.quizzes q
    on q.id = qq.quiz_id
  join public.modules m
    on m.id = q.module_id
  join public.days d
    on d.id = m.day_id
  join public.programs p
    on p.id = d.program_id
  where qmp.question_id = p_question_id
    and auth.uid() is not null
    and (
      public.is_trainer()
      or (
        q.is_published = true
        and d.is_published = true
        and p.status = 'published'
      )
    );
$$;

revoke all
on function public.get_matching_items_for_learner(uuid)
from public;

grant execute
on function public.get_matching_items_for_learner(uuid)
to authenticated;


-- ============================================================
-- 15. ANSWER OPTION SECURITY
-- ============================================================

drop policy if exists
  "Learners manage own quiz answer options"
on public.quiz_answer_options;

drop policy if exists
  "Trainers manage quiz answer options"
on public.quiz_answer_options;


create policy "Learners manage own quiz answer options"
on public.quiz_answer_options
for all
to authenticated
using (
  exists (
    select 1
    from public.quiz_answers qa
    join public.quiz_attempts qat
      on qat.id = qa.attempt_id
    where qa.id = quiz_answer_options.answer_id
      and qat.learner_id = auth.uid()
      and qat.status = 'in_progress'
  )
)
with check (
  exists (
    select 1
    from public.quiz_answers qa
    join public.quiz_attempts qat
      on qat.id = qa.attempt_id
    where qa.id = quiz_answer_options.answer_id
      and qat.learner_id = auth.uid()
      and qat.status = 'in_progress'
  )
);


create policy "Trainers manage quiz answer options"
on public.quiz_answer_options
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 16. MATCH ANSWER SECURITY
-- ============================================================

drop policy if exists
  "Learners manage own quiz matches"
on public.quiz_answer_matches;

drop policy if exists
  "Trainers manage quiz matches"
on public.quiz_answer_matches;


create policy "Learners manage own quiz matches"
on public.quiz_answer_matches
for all
to authenticated
using (
  exists (
    select 1
    from public.quiz_answers qa
    join public.quiz_attempts qat
      on qat.id = qa.attempt_id
    where qa.id = quiz_answer_matches.answer_id
      and qat.learner_id = auth.uid()
      and qat.status = 'in_progress'
  )
)
with check (
  exists (
    select 1
    from public.quiz_answers qa
    join public.quiz_attempts qat
      on qat.id = qa.attempt_id
    where qa.id = quiz_answer_matches.answer_id
      and qat.learner_id = auth.uid()
      and qat.status = 'in_progress'
  )
);


create policy "Trainers manage quiz matches"
on public.quiz_answer_matches
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 17. HARDEN QUIZ ATTEMPTS
--
-- Remove existing learner UPDATE policy/policies so learners
-- cannot directly set score, passed, graded_at, etc.
-- ============================================================

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_attempts'
  loop
    execute format(
      'drop policy if exists %I on public.quiz_attempts',
      policy_record.policyname
    );
  end loop;
end $$;


create policy "Learners view own quiz attempts"
on public.quiz_attempts
for select
to authenticated
using (
  learner_id = auth.uid()
  or public.is_trainer()
);


create policy "Learners create own quiz attempts"
on public.quiz_attempts
for insert
to authenticated
with check (
  learner_id = auth.uid()
  and score is null
  and passed is null
  and status = 'in_progress'
  and submitted_at is null
  and graded_at is null
);


create policy "Trainers manage quiz attempts"
on public.quiz_attempts
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 18. HARDEN QUIZ ANSWERS
--
-- Learners can work with their answer while the attempt is
-- in_progress, but cannot set grading fields.
-- ============================================================

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_answers'
  loop
    execute format(
      'drop policy if exists %I on public.quiz_answers',
      policy_record.policyname
    );
  end loop;
end $$;


create policy "Learners view own quiz answers"
on public.quiz_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_attempts qat
    where qat.id = quiz_answers.attempt_id
      and qat.learner_id = auth.uid()
  )
  or public.is_trainer()
);


create policy "Learners create ungraded quiz answers"
on public.quiz_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quiz_attempts qat
    where qat.id = quiz_answers.attempt_id
      and qat.learner_id = auth.uid()
      and qat.status = 'in_progress'
  )
  and is_correct is null
  and points_awarded is null
  and trainer_feedback is null
  and graded_at is null
);


create policy "Trainers manage quiz answers"
on public.quiz_answers
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 19. TRAINER ACCESS TO QUIZ BUILDER TABLES
-- ============================================================

drop policy if exists
  "Trainers manage quizzes"
on public.quizzes;

create policy "Trainers manage quizzes"
on public.quizzes
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


drop policy if exists
  "Trainers manage quiz questions"
on public.quiz_questions;

create policy "Trainers manage quiz questions"
on public.quiz_questions
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- ============================================================
-- 20. VERIFY
-- ============================================================

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'quiz_matching_pairs',
    'quiz_attempts',
    'quiz_answers',
    'quiz_answer_options',
    'quiz_answer_matches'
  )
order by table_name, ordinal_position;
