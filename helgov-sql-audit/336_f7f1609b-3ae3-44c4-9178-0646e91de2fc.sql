│
◇  Downloading snippet...
-- ============================================================
-- HELLOGOV ONBOARDING
-- 11 - LEARNER ENGINE + QUIZ SECURITY
-- ============================================================

begin;

-- ============================================================
-- 1. QUIZ SCHEMA NORMALIZATION
-- ============================================================

alter table public.quizzes
  add column if not exists instructions text,
  add column if not exists is_required boolean not null default true,
  add column if not exists is_published boolean not null default false,
  add column if not exists shuffle_questions boolean not null default false,
  add column if not exists show_results boolean not null default true;

alter table public.quiz_questions
  add column if not exists instructions text,
  add column if not exists is_required boolean not null default true,
  add column if not exists allow_partial_credit boolean not null default false;

alter table public.quiz_answers
  add column if not exists file_path text,
  add column if not exists file_name text;

-- ============================================================
-- 2. MATCHING SECURITY
--
-- left pair ID remains internal.
-- Learner receives an unrelated public ID for the right side.
-- ============================================================

alter table public.quiz_matching_pairs
  add column if not exists right_public_id uuid;

update public.quiz_matching_pairs
set right_public_id = gen_random_uuid()
where right_public_id is null;

alter table public.quiz_matching_pairs
  alter column right_public_id set default gen_random_uuid();

alter table public.quiz_matching_pairs
  alter column right_public_id set not null;

create unique index if not exists
  quiz_matching_pairs_right_public_id_uidx
on public.quiz_matching_pairs(right_public_id);

alter table public.quiz_answer_matches
  add column if not exists selected_right_public_id uuid;

-- Backfill old matching answers if the old column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quiz_answer_matches'
      and column_name = 'selected_right_pair_id'
  ) then
    execute $sql$
      update public.quiz_answer_matches qam
      set selected_right_public_id = qmp.right_public_id
      from public.quiz_matching_pairs qmp
      where qam.selected_right_pair_id = qmp.id
        and qam.selected_right_public_id is null
    $sql$;
  end if;
end
$$;

-- Add FK only if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'quiz_answer_matches_selected_right_public_id_fkey'
  ) then
    alter table public.quiz_answer_matches
      add constraint
        quiz_answer_matches_selected_right_public_id_fkey
      foreign key (selected_right_public_id)
      references public.quiz_matching_pairs(right_public_id)
      on delete cascade;
  end if;
end
$$;

-- We no longer want learner answers to contain the real right pair ID.
alter table public.quiz_answer_matches
  drop column if exists selected_right_pair_id;

-- ============================================================
-- 3. QUESTION TYPE CONSTRAINT
-- ============================================================

alter table public.quiz_questions
  drop constraint if exists
    quiz_questions_question_type_check;

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
-- 4. BASIC SCORE CONSTRAINTS
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
-- 5. ATTEMPT STATUS
-- ============================================================

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_status_check;

alter table public.quiz_attempts
  add constraint quiz_attempts_status_check
  check (
    status in (
      'in_progress',
      'submitted',
      'needs_review',
      'graded'
    )
  );

-- Prevent duplicate attempt numbers.
create unique index if not exists
  quiz_attempts_quiz_learner_attempt_uidx
on public.quiz_attempts(
  quiz_id,
  learner_id,
  attempt_number
);

-- ============================================================
-- 6. PROGRESS TABLE IMPROVEMENTS
-- ============================================================

-- These tables already exist in our project.
-- Add useful timestamps where needed.

alter table public.learner_setup_progress
  add column if not exists completed_at timestamptz;

alter table public.learner_module_progress
  add column if not exists completed_at timestamptz;

alter table public.learner_material_progress
  add column if not exists completed_at timestamptz;

alter table public.learner_activity_progress
  add column if not exists completed_at timestamptz;

-- ============================================================
-- 7. STORAGE BUCKET FOR QUIZ FILE UPLOADS
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'quiz-submissions',
  'quiz-submissions',
  false,
  10485760
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760;

-- ============================================================
-- 8. HELPER: IS TRAINER
-- ============================================================

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'trainer'
  );
$$;

revoke all on function public.is_trainer() from public;
grant execute on function public.is_trainer()
to authenticated;

-- ============================================================
-- 9. HELPER:
-- CAN CURRENT USER ACCESS A PUBLISHED QUIZ?
-- ============================================================

create or replace function public.can_access_quiz(
  target_quiz_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_trainer()
    or exists (
      select 1
      from public.quizzes q
      join public.modules m
        on m.id = q.module_id
      join public.days d
        on d.id = m.day_id
      join public.programs p
        on p.id = d.program_id
      where q.id = target_quiz_id
        and q.is_published = true
        and d.is_published = true
        and p.status = 'published'
    );
$$;

revoke all on function public.can_access_quiz(uuid)
from public;

grant execute on function public.can_access_quiz(uuid)
to authenticated;

-- ============================================================
-- 10. ENABLE RLS
-- ============================================================

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_matching_pairs enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_answer_options enable row level security;
alter table public.quiz_answer_matches enable row level security;

-- ============================================================
-- 11. REMOVE OLD QUIZ POLICIES
--
-- We intentionally normalize all policies on these tables.
-- ============================================================

do $$
declare
  target_table text;
  policy_record record;
begin
  foreach target_table in array array[
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'quiz_matching_pairs',
    'quiz_attempts',
    'quiz_answers',
    'quiz_answer_options',
    'quiz_answer_matches'
  ]
  loop
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        target_table
      );
    end loop;
  end loop;
end
$$;

-- ============================================================
-- 12. QUIZZES
-- ============================================================

create policy "quiz trainer manage"
on public.quizzes
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "quiz learner read published"
on public.quizzes
for select
to authenticated
using (
  public.can_access_quiz(id)
);

-- ============================================================
-- 13. QUESTIONS
-- ============================================================

create policy "question trainer manage"
on public.quiz_questions
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "question learner read published"
on public.quiz_questions
for select
to authenticated
using (
  public.can_access_quiz(quiz_id)
);

-- ============================================================
-- 14. ANSWER KEYS
--
-- Direct access is trainer-only.
-- Learners must use safe RPCs below.
-- ============================================================

create policy "option trainer manage"
on public.quiz_options
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "matching trainer manage"
on public.quiz_matching_pairs
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

-- ============================================================
-- 15. ATTEMPTS
--
-- Learner can READ own attempts.
-- Writes happen through SECURITY DEFINER RPCs.
-- ============================================================

create policy "attempt trainer manage"
on public.quiz_attempts
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "attempt learner read own"
on public.quiz_attempts
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 16. ANSWERS
-- ============================================================

create policy "answer trainer manage"
on public.quiz_answers
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "answer learner read own"
on public.quiz_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_attempts qa
    where qa.id = quiz_answers.attempt_id
      and qa.learner_id = auth.uid()
  )
);

-- ============================================================
-- 17. MULTIPLE-CHOICE ANSWER LINKS
-- ============================================================

create policy "answer option trainer manage"
on public.quiz_answer_options
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "answer option learner read own"
on public.quiz_answer_options
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_answers a
    join public.quiz_attempts qa
      on qa.id = a.attempt_id
    where a.id = quiz_answer_options.answer_id
      and qa.learner_id = auth.uid()
  )
);

-- ============================================================
-- 18. MATCH ANSWERS
-- ============================================================

create policy "answer match trainer manage"
on public.quiz_answer_matches
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "answer match learner read own"
on public.quiz_answer_matches
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_answers a
    join public.quiz_attempts qa
      on qa.id = a.attempt_id
    where a.id = quiz_answer_matches.answer_id
      and qa.learner_id = auth.uid()
  )
);

-- ============================================================
-- 19. SAFE LEARNER OPTIONS
--
-- Never returns is_correct.
-- ============================================================

drop function if exists
  public.get_quiz_options_for_learner(uuid);

create function public.get_quiz_options_for_learner(
  target_question_id uuid
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
    qo.id,
    qo.option_text,
    qo.position
  from public.quiz_options qo
  join public.quiz_questions qq
    on qq.id = qo.question_id
  where qo.question_id = target_question_id
    and public.can_access_quiz(qq.quiz_id)
  order by qo.position;
$$;

revoke all
on function public.get_quiz_options_for_learner(uuid)
from public;

grant execute
on function public.get_quiz_options_for_learner(uuid)
to authenticated;

-- ============================================================
-- 20. SAFE MATCHING ITEMS
--
-- Left IDs and right IDs are deliberately unrelated.
-- Right ordering deliberately does NOT use pair position.
-- ============================================================

drop function if exists
  public.get_matching_items_for_learner(uuid);

create function public.get_matching_items_for_learner(
  target_question_id uuid
)
returns table (
  item_id uuid,
  item_text text,
  item_side text,
  display_order bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  (
    select
      qmp.id as item_id,
      qmp.left_text as item_text,
      'left'::text as item_side,
      row_number() over (
        order by qmp.position, qmp.id
      ) as display_order
    from public.quiz_matching_pairs qmp
    join public.quiz_questions qq
      on qq.id = qmp.question_id
    where qmp.question_id = target_question_id
      and public.can_access_quiz(qq.quiz_id)
  )

  union all

  (
    select
      qmp.right_public_id as item_id,
      qmp.right_text as item_text,
      'right'::text as item_side,
      row_number() over (
        order by qmp.right_public_id
      ) as display_order
    from public.quiz_matching_pairs qmp
    join public.quiz_questions qq
      on qq.id = qmp.question_id
    where qmp.question_id = target_question_id
      and public.can_access_quiz(qq.quiz_id)
  );
$$;

revoke all
on function public.get_matching_items_for_learner(uuid)
from public;

grant execute
on function public.get_matching_items_for_learner(uuid)
to authenticated;

-- ============================================================
-- 21. START QUIZ ATTEMPT
-- ============================================================

drop function if exists
  public.start_quiz_attempt(uuid);

create function public.start_quiz_attempt(
  target_quiz_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  quiz_record record;
  existing_attempt_id uuid;
  previous_attempts int;
  new_attempt_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_access_quiz(target_quiz_id) then
    raise exception 'Quiz is not available';
  end if;

  select *
  into quiz_record
  from public.quizzes
  where id = target_quiz_id;

  if quiz_record.id is null then
    raise exception 'Quiz not found';
  end if;

  -- Resume an unfinished attempt.
  select id
  into existing_attempt_id
  from public.quiz_attempts
  where quiz_id = target_quiz_id
    and learner_id = current_user_id
    and status = 'in_progress'
  order by attempt_number desc
  limit 1;

  if existing_attempt_id is not null then
    return existing_attempt_id;
  end if;

  select count(*)
  into previous_attempts
  from public.quiz_attempts
  where quiz_id = target_quiz_id
    and learner_id = current_user_id;

  if previous_attempts >= quiz_record.max_attempts then
    raise exception 'Maximum attempts reached';
  end if;

  insert into public.quiz_attempts (
    quiz_id,
    learner_id,
    attempt_number,
    status,
    started_at
  )
  values (
    target_quiz_id,
    current_user_id,
    previous_attempts + 1,
    'in_progress',
    now()
  )
  returning id into new_attempt_id;

  return new_attempt_id;
end;
$$;

revoke all
on function public.start_quiz_attempt(uuid)
from public;

grant execute
on function public.start_quiz_attempt(uuid)
to authenticated;

-- ============================================================
-- 22. SAVE SINGLE / TRUE-FALSE / TEXT ANSWER
-- ============================================================

drop function if exists
  public.save_quiz_answer(uuid, uuid, uuid, text);

create function public.save_quiz_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_option_id uuid default null,
  target_answer_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_id uuid;
  question_type_value text;
begin
  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select question_type
  into question_type_value
  from public.quiz_questions
  where id = target_question_id;

  if question_type_value not in (
    'single_choice',
    'true_false',
    'open_text'
  ) then
    raise exception 'Unsupported answer type';
  end if;

  if target_option_id is not null
     and not exists (
       select 1
       from public.quiz_options
       where id = target_option_id
         and question_id = target_question_id
     ) then
    raise exception 'Invalid option';
  end if;

  select id
  into answer_id
  from public.quiz_answers
  where attempt_id = target_attempt_id
    and question_id = target_question_id
  limit 1;

  if answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id,
      selected_option_id,
      answer_text
    )
    values (
      target_attempt_id,
      target_question_id,
      target_option_id,
      target_answer_text
    )
    returning id into answer_id;
  else
    update public.quiz_answers
    set
      selected_option_id = target_option_id,
      answer_text = target_answer_text,
      is_correct = null,
      points_awarded = null,
      trainer_feedback = null,
      graded_at = null
    where id = answer_id;
  end if;

  return answer_id;
end;
$$;

revoke all
on function public.save_quiz_answer(
  uuid,
  uuid,
  uuid,
  text
)
from public;

grant execute
on function public.save_quiz_answer(
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;

-- ============================================================
-- 23. SAVE MULTIPLE CHOICE
-- ============================================================

drop function if exists
  public.save_multiple_choice_answer(
    uuid,
    uuid,
    uuid[]
  );

create function public.save_multiple_choice_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_option_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_id uuid;
  option_id_value uuid;
begin
  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
      and qq.question_type = 'multiple_choice'
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select id
  into answer_id
  from public.quiz_answers
  where attempt_id = target_attempt_id
    and question_id = target_question_id
  limit 1;

  if answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id
    )
    values (
      target_attempt_id,
      target_question_id
    )
    returning id into answer_id;
  end if;

  delete from public.quiz_answer_options
  where quiz_answer_options.answer_id = answer_id;

  foreach option_id_value in array
    coalesce(target_option_ids, array[]::uuid[])
  loop
    if not exists (
      select 1
      from public.quiz_options
      where id = option_id_value
        and question_id = target_question_id
    ) then
      raise exception 'Invalid option';
    end if;

    insert into public.quiz_answer_options (
      answer_id,
      option_id
    )
    values (
      answer_id,
      option_id_value
    );
  end loop;

  update public.quiz_answers
  set
    is_correct = null,
    points_awarded = null,
    trainer_feedback = null,
    graded_at = null
  where id = answer_id;

  return answer_id;
end;
$$;

revoke all
on function public.save_multiple_choice_answer(
  uuid,
  uuid,
  uuid[]
)
from public;

grant execute
on function public.save_multiple_choice_answer(
  uuid,
  uuid,
  uuid[]
)
to authenticated;

-- ============================================================
-- 24. SAVE MATCHING ANSWER
--
-- left IDs are internal pair IDs.
-- selected right IDs are opaque public IDs.
-- ============================================================

drop function if exists
  public.save_matching_answer(
    uuid,
    uuid,
    uuid[],
    uuid[]
  );

create function public.save_matching_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  left_pair_ids uuid[],
  selected_right_public_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_id uuid;
  index_value int;
begin
  if coalesce(array_length(left_pair_ids, 1), 0)
     <>
     coalesce(
       array_length(selected_right_public_ids, 1),
       0
     ) then
    raise exception 'Matching arrays must have equal length';
  end if;

  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
      and qq.question_type in (
        'matching',
        'match_cards'
      )
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select id
  into answer_id
  from public.quiz_answers
  where attempt_id = target_attempt_id
    and question_id = target_question_id
  limit 1;

  if answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id
    )
    values (
      target_attempt_id,
      target_question_id
    )
    returning id into answer_id;
  end if;

  delete from public.quiz_answer_matches
  where quiz_answer_matches.answer_id = answer_id;

  if coalesce(array_length(left_pair_ids, 1), 0) > 0
  then
    for index_value in
      1..array_length(left_pair_ids, 1)
    loop

      if not exists (
        select 1
        from public.quiz_matching_pairs
        where id = left_pair_ids[index_value]
          and question_id = target_question_id
      ) then
        raise exception 'Invalid matching item';
      end if;

      if not exists (
        select 1
        from public.quiz_matching_pairs
        where right_public_id =
          selected_right_public_ids[index_value]
          and question_id = target_question_id
      ) then
        raise exception 'Invalid matching answer';
      end if;

      insert into public.quiz_answer_matches (
        answer_id,
        left_pair_id,
        selected_right_public_id
      )
      values (
        answer_id,
        left_pair_ids[index_value],
        selected_right_public_ids[index_value]
      );

    end loop;
  end if;

  update public.quiz_answers
  set
    is_correct = null,
    points_awarded = null,
    trainer_feedback = null,
    graded_at = null
  where id = answer_id;

  return answer_id;
end;
$$;

revoke all
on function public.save_matching_answer(
  uuid,
  uuid,
  uuid[],
  uuid[]
)
from public;

grant execute
on function public.save_matching_answer(
  uuid,
  uuid,
  uuid[],
  uuid[]
)
to authenticated;

-- ============================================================
-- 25. REGISTER FILE ANSWER
--
-- Actual upload will go to Storage from the application.
-- This RPC securely records the resulting file path.
-- ============================================================

drop function if exists
  public.save_file_answer(
    uuid,
    uuid,
    text,
    text
  );

create function public.save_file_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_file_path text,
  target_file_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_id uuid;
begin
  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
      and qq.question_type = 'file_upload'
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select id
  into answer_id
  from public.quiz_answers
  where attempt_id = target_attempt_id
    and question_id = target_question_id
  limit 1;

  if answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id,
      file_path,
      file_name
    )
    values (
      target_attempt_id,
      target_question_id,
      target_file_path,
      target_file_name
    )
    returning id into answer_id;
  else
    update public.quiz_answers
    set
      file_path = target_file_path,
      file_name = target_file_name,
      is_correct = null,
      points_awarded = null,
      trainer_feedback = null,
      graded_at = null
    where id = answer_id;
  end if;

  return answer_id;
end;
$$;

revoke all
on function public.save_file_answer(
  uuid,
  uuid,
  text,
  text
)
from public;

grant execute
on function public.save_file_answer(
  uuid,
  uuid,
  text,
  text
)
to authenticated;

-- ============================================================
-- 26. SUBMIT + AUTO-GRADE QUIZ
-- ============================================================

drop function if exists
  public.submit_quiz_attempt(uuid);

create function public.submit_quiz_attempt(
  target_attempt_id uuid
)
returns table (
  attempt_id uuid,
  score numeric,
  passed boolean,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record record;
  question_record record;
  answer_record record;

  total_points numeric := 0;
  earned_points numeric := 0;
  question_points numeric := 0;

  correct_count int;
  selected_count int;
  total_correct_count int;

  matching_total int;
  matching_correct int;

  needs_manual_review boolean := false;

  final_score numeric := 0;
  final_passed boolean := false;
  final_status text := 'graded';
begin

  select
    qa.*,
    q.passing_score
  into attempt_record
  from public.quiz_attempts qa
  join public.quizzes q
    on q.id = qa.quiz_id
  where qa.id = target_attempt_id
    and qa.learner_id = auth.uid();

  if attempt_record.id is null then
    raise exception 'Attempt not found';
  end if;

  if attempt_record.status <> 'in_progress' then
    raise exception 'Attempt has already been submitted';
  end if;

  for question_record in
    select *
    from public.quiz_questions
    where quiz_id = attempt_record.quiz_id
    order by position
  loop

    total_points :=
      total_points + question_record.points;

    question_points := 0;

    select *
    into answer_record
    from public.quiz_answers
    where attempt_id = target_attempt_id
      and question_id = question_record.id
    limit 1;

    -- No answer = zero points.
    if answer_record.id is null then
      continue;
    end if;

    -- --------------------------------------------
    -- SINGLE / TRUE FALSE
    -- --------------------------------------------

    if question_record.question_type in (
      'single_choice',
      'true_false'
    ) then

      if exists (
        select 1
        from public.quiz_options
        where id =
          answer_record.selected_option_id
          and question_id =
            question_record.id
          and is_correct = true
      ) then
        question_points :=
          question_record.points;

        update public.quiz_answers
        set
          is_correct = true,
          points_awarded = question_points,
          graded_at = now()
        where id = answer_record.id;
      else
        update public.quiz_answers
        set
          is_correct = false,
          points_awarded = 0,
          graded_at = now()
        where id = answer_record.id;
      end if;

    -- --------------------------------------------
    -- MULTIPLE CHOICE
    -- --------------------------------------------

    elsif question_record.question_type =
      'multiple_choice'
    then

      select count(*)
      into total_correct_count
      from public.quiz_options
      where question_id = question_record.id
        and is_correct = true;

      select count(*)
      into selected_count
      from public.quiz_answer_options
      where answer_id = answer_record.id;

      select count(*)
      into correct_count
      from public.quiz_answer_options qao
      join public.quiz_options qo
        on qo.id = qao.option_id
      where qao.answer_id = answer_record.id
        and qo.question_id =
          question_record.id
        and qo.is_correct = true;

      if
        selected_count = total_correct_count
        and correct_count = total_correct_count
      then
        question_points :=
          question_record.points;

      elsif
        question_record.allow_partial_credit
        and total_correct_count > 0
      then

        -- Partial credit only counts correct selections.
        -- Selecting incorrect answers reduces the ratio.

        question_points :=
          greatest(
            0,
            question_record.points
            *
            (
              (
                correct_count
                -
                greatest(
                  0,
                  selected_count - correct_count
                )
              )::numeric
              /
              total_correct_count::numeric
            )
          );

      end if;

      update public.quiz_answers
      set
        is_correct =
          (
            selected_count = total_correct_count
            and correct_count =
              total_correct_count
          ),
        points_awarded = question_points,
        graded_at = now()
      where id = answer_record.id;

    -- --------------------------------------------
    -- MATCHING / MATCH CARDS
    -- --------------------------------------------

    elsif question_record.question_type in (
      'matching',
      'match_cards'
    ) then

      select count(*)
      into matching_total
      from public.quiz_matching_pairs
      where question_id = question_record.id;

      select count(*)
      into matching_correct
      from public.quiz_answer_matches qam
      join public.quiz_matching_pairs qmp
        on qmp.id = qam.left_pair_id
      where qam.answer_id = answer_record.id
        and qmp.question_id =
          question_record.id
        and qmp.right_public_id =
          qam.selected_right_public_id;

      if
        matching_total > 0
        and matching_correct = matching_total
      then
        question_points :=
          question_record.points;

      elsif
        question_record.allow_partial_credit
        and matching_total > 0
      then
        question_points :=
          question_record.points
          *
          (
            matching_correct::numeric
            /
            matching_total::numeric
          );
      end if;

      update public.quiz_answers
      set
        is_correct =
          (
            matching_total > 0
            and matching_correct =
              matching_total
          ),
        points_awarded = question_points,
        graded_at = now()
      where id = answer_record.id;

    -- --------------------------------------------
    -- MANUAL REVIEW
    -- --------------------------------------------

    elsif question_record.question_type in (
      'open_text',
      'file_upload'
    ) then

      needs_manual_review := true;

      update public.quiz_answers
      set
        is_correct = null,
        points_awarded = null,
        graded_at = null
      where id = answer_record.id;

    end if;

    earned_points :=
      earned_points + question_points;

  end loop;

  if total_points > 0 then
    final_score :=
      round(
        (earned_points / total_points) * 100,
        2
      );
  else
    final_score := 0;
  end if;

  if needs_manual_review then
    final_status := 'needs_review';
    final_passed := false;
  else
    final_status := 'graded';
    final_passed :=
      final_score >= attempt_record.passing_score;
  end if;

  update public.quiz_attempts
  set
    score = final_score,
    passed =
      case
        when needs_manual_review
          then null
        else final_passed
      end,
    status = final_status,
    submitted_at = now(),
    graded_at =
      case
        when needs_manual_review
          then null
        else now()
      end
  where id = target_attempt_id;

  return query
  select
    target_attempt_id,
    final_score,
    case
      when needs_manual_review
        then null::boolean
      else final_passed
    end,
    final_status;
end;
$$;

revoke all
on function public.submit_quiz_attempt(uuid)
from public;

grant execute
on function public.submit_quiz_attempt(uuid)
to authenticated;

-- ============================================================
-- 27. MANUAL GRADING
-- ============================================================

drop function if exists
  public.grade_manual_quiz_answer(
    uuid,
    numeric,
    text
  );

create function public.grade_manual_quiz_answer(
  target_answer_id uuid,
  awarded_points numeric,
  feedback text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_max_points numeric;
begin

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  select qq.points
  into question_max_points
  from public.quiz_answers qa
  join public.quiz_questions qq
    on qq.id = qa.question_id
  where qa.id = target_answer_id
    and qq.question_type in (
      'open_text',
      'file_upload'
    );

  if question_max_points is null then
    raise exception 'Manual answer not found';
  end if;

  if awarded_points < 0
     or awarded_points > question_max_points
  then
    raise exception 'Invalid awarded points';
  end if;

  update public.quiz_answers
  set
    points_awarded = awarded_points,
    trainer_feedback = feedback,
    is_correct =
      (awarded_points = question_max_points),
    graded_at = now()
  where id = target_answer_id;

end;
$$;

revoke all
on function public.grade_manual_quiz_answer(
  uuid,
  numeric,
  text
)
from public;

grant execute
on function public.grade_manual_quiz_answer(
  uuid,
  numeric,
  text
)
to authenticated;

-- ============================================================
-- 28. FINALIZE MANUAL QUIZ REVIEW
-- ============================================================

drop function if exists
  public.finalize_quiz_review(uuid);

create function public.finalize_quiz_review(
  target_attempt_id uuid
)
returns table (
  score numeric,
  passed boolean,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record record;
  total_points numeric;
  earned_points numeric;
  pending_manual int;
  final_score numeric;
  final_passed boolean;
begin

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  select
    qa.*,
    q.passing_score
  into attempt_record
  from public.quiz_attempts qa
  join public.quizzes q
    on q.id = qa.quiz_id
  where qa.id = target_attempt_id;

  if attempt_record.id is null then
    raise exception 'Attempt not found';
  end if;

  select count(*)
  into pending_manual
  from public.quiz_answers a
  join public.quiz_questions qq
    on qq.id = a.question_id
  where a.attempt_id = target_attempt_id
    and qq.question_type in (
      'open_text',
      'file_upload'
    )
    and a.points_awarded is null;

  if pending_manual > 0 then
    raise exception
      'Manual answers still require grading';
  end if;

  select coalesce(sum(points), 0)
  into total_points
  from public.quiz_questions
  where quiz_id = attempt_record.quiz_id;

  select coalesce(sum(points_awarded), 0)
  into earned_points
  from public.quiz_answers
  where attempt_id = target_attempt_id;

  if total_points > 0 then
    final_score :=
      round(
        (earned_points / total_points) * 100,
        2
      );
  else
    final_score := 0;
  end if;

  final_passed :=
    final_score >= attempt_record.passing_score;

  update public.quiz_attempts
  set
    score = final_score,
    passed = final_passed,
    status = 'graded',
    graded_at = now()
  where id = target_attempt_id;

  return query
  select
    final_score,
    final_passed,
    'graded'::text;
end;
$$;

revoke all
on function public.finalize_quiz_review(uuid)
from public;

grant execute
on function public.finalize_quiz_review(uuid)
to authenticated;

-- ============================================================
-- 29. STORAGE POLICIES
-- ============================================================

drop policy if exists
  "learner upload quiz submission"
on storage.objects;

drop policy if exists
  "learner read own quiz submission"
on storage.objects;

drop policy if exists
  "trainer read quiz submissions"
on storage.objects;

drop policy if exists
  "trainer delete quiz submissions"
on storage.objects;

create policy "learner upload quiz submission"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'quiz-submissions'
  and (storage.foldername(name))[1]
      = auth.uid()::text
);

create policy "learner read own quiz submission"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'quiz-submissions'
  and (storage.foldername(name))[1]
      = auth.uid()::text
);

create policy "trainer read quiz submissions"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'quiz-submissions'
  and public.is_trainer()
);

create policy "trainer delete quiz submissions"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'quiz-submissions'
  and public.is_trainer()
);

-- ============================================================
-- 30. INDEXES
-- ============================================================

create index if not exists
  quiz_questions_quiz_id_idx
on public.quiz_questions(quiz_id);

create index if not exists
  quiz_options_question_id_idx
on public.quiz_options(question_id);

create index if not exists
  quiz_matching_pairs_question_id_idx
on public.quiz_matching_pairs(question_id);

create index if not exists
  quiz_attempts_learner_id_idx
on public.quiz_attempts(learner_id);

create index if not exists
  quiz_attempts_quiz_id_idx
on public.quiz_attempts(quiz_id);

create index if not exists
  quiz_answers_attempt_id_idx
on public.quiz_answers(attempt_id);

create index if not exists
  quiz_answers_question_id_idx
on public.quiz_answers(question_id);

create index if not exists
  quiz_answer_options_answer_id_idx
on public.quiz_answer_options(answer_id);

create index if not exists
  quiz_answer_matches_answer_id_idx
on public.quiz_answer_matches(answer_id);

-- ============================================================
-- 31. VERIFICATION
-- ============================================================

do $$
begin
  raise notice 'HelloGov Learner Engine migration completed.';
end
$$;

commit;
