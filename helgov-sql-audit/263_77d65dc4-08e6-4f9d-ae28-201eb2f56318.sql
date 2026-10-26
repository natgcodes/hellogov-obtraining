│
◇  Downloading snippet...
-- ============================================================
-- QUERY 86
-- get_trainer_learner_attempt_history
--
-- Returns the complete quiz/checkpoint attempt history
-- for one learner inside one onboarding program.
--
-- Includes:
-- - normal module quizzes
-- - checkpoint quizzes
-- - attempt number
-- - score
-- - pass status
-- - review status
-- - submission / grading timestamps
-- ============================================================

drop function if exists public.get_trainer_learner_attempt_history(uuid, uuid);

create function public.get_trainer_learner_attempt_history(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  attempt_id uuid,
  quiz_id uuid,

  assessment_type text,
  assessment_title text,

  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  module_id uuid,
  module_title text,

  checkpoint_id uuid,
  checkpoint_type text,

  attempt_number integer,
  score numeric,
  passed boolean,
  status text,

  passing_score numeric,

  started_at timestamptz,
  submitted_at timestamptz,
  graded_at timestamptz
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
  -- MODULE QUIZ ATTEMPTS
  -- ----------------------------------------------------------

  return query

  select
    qa.id as attempt_id,
    q.id as quiz_id,

    'quiz'::text as assessment_type,
    q.title as assessment_title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    m.id as module_id,
    m.title as module_title,

    null::uuid as checkpoint_id,
    null::text as checkpoint_type,

    qa.attempt_number,
    qa.score,
    qa.passed,
    qa.status,

    q.passing_score,

    qa.started_at,
    qa.submitted_at,
    qa.graded_at

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  where qa.learner_id = target_learner_id
    and d.program_id = target_program_id

    -- Do not duplicate checkpoint quizzes here.
    and not exists (
      select 1
      from public.checkpoints c
      where c.quiz_id = q.id
    )

  union all

  -- ----------------------------------------------------------
  -- CHECKPOINT QUIZ ATTEMPTS
  -- ----------------------------------------------------------

  select
    qa.id as attempt_id,
    q.id as quiz_id,

    'checkpoint'::text as assessment_type,
    c.title as assessment_title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    null::uuid as module_id,
    null::text as module_title,

    c.id as checkpoint_id,
    c.checkpoint_type,

    qa.attempt_number,
    qa.score,
    qa.passed,
    qa.status,

    coalesce(
      c.passing_score,
      q.passing_score
    ) as passing_score,

    qa.started_at,
    qa.submitted_at,
    qa.graded_at

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  join public.checkpoints c
    on c.quiz_id = q.id

  join public.days d
    on d.id = c.day_id

  where qa.learner_id = target_learner_id
    and d.program_id = target_program_id

  -- ----------------------------------------------------------
  -- ORDER
  --
  -- Newest activity first.
  -- ----------------------------------------------------------

  order by
    started_at desc,
    attempt_number desc;

end;
$function$;
