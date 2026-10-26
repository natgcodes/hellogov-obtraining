│
◇  Downloading snippet...
-- ============================================================
-- QUERY 81
-- get_trainer_learner_assessment_history
--
-- Complete assessment history for one learner in one program.
--
-- Includes:
-- - normal module quiz attempts
-- - checkpoint quiz attempts
--
-- Returns one row per attempt.
-- ============================================================

drop function if exists public.get_trainer_learner_assessment_history(uuid, uuid);

create function public.get_trainer_learner_assessment_history(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  attempt_id uuid,
  assessment_type text,

  quiz_id uuid,
  quiz_title text,

  checkpoint_id uuid,
  checkpoint_title text,

  module_id uuid,
  module_title text,

  day_id uuid,
  day_number integer,
  day_title text,

  attempt_number integer,
  score numeric,
  passed boolean,
  status text,

  started_at timestamptz,
  submitted_at timestamptz,
  graded_at timestamptz,

  passing_score numeric,
  needs_review boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin

  -- ----------------------------------------------------------
  -- SECURITY
  -- ----------------------------------------------------------

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  -- ----------------------------------------------------------
  -- VALIDATE ENROLLMENT
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    raise exception 'Learner is not enrolled in this program';
  end if;

  -- ----------------------------------------------------------
  -- ASSESSMENT HISTORY
  -- ----------------------------------------------------------

  return query

  -- ==========================================================
  -- NORMAL MODULE QUIZZES
  -- ==========================================================

  select
    qa.id as attempt_id,
    'quiz'::text as assessment_type,

    q.id as quiz_id,
    q.title as quiz_title,

    null::uuid as checkpoint_id,
    null::text as checkpoint_title,

    m.id as module_id,
    m.title as module_title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,

    qa.attempt_number,
    qa.score,
    qa.passed,
    qa.status,

    qa.started_at,
    qa.submitted_at,
    qa.graded_at,

    q.passing_score,

    (
      qa.status = 'needs_review'
    ) as needs_review

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  where qa.learner_id = target_learner_id
    and d.program_id = target_program_id
    and d.is_published = true

    -- Checkpoint quizzes are returned separately below.
    and not exists (
      select 1
      from public.checkpoints c
      where c.quiz_id = q.id
    )

  union all

  -- ==========================================================
  -- CHECKPOINT QUIZZES
  -- ==========================================================

  select
    qa.id as attempt_id,
    'checkpoint'::text as assessment_type,

    q.id as quiz_id,
    q.title as quiz_title,

    c.id as checkpoint_id,
    c.title as checkpoint_title,

    null::uuid as module_id,
    null::text as module_title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,

    qa.attempt_number,
    qa.score,
    qa.passed,
    qa.status,

    qa.started_at,
    qa.submitted_at,
    qa.graded_at,

    coalesce(
      c.passing_score,
      q.passing_score
    ) as passing_score,

    (
      qa.status = 'needs_review'
    ) as needs_review

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  join public.checkpoints c
    on c.quiz_id = q.id

  join public.days d
    on d.id = c.day_id

  where qa.learner_id = target_learner_id
    and d.program_id = target_program_id
    and d.is_published = true

  -- ==========================================================
  -- MOST RECENT FIRST
  -- ==========================================================

  order by
    submitted_at desc nulls last,
    started_at desc;

end;
$function$;
