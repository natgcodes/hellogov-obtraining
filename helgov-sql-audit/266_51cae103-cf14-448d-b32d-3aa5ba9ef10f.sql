│
◇  Downloading snippet...
-- ============================================================
-- QUERY 83
-- get_trainer_learner_assessments
--
-- Returns assessment-level status for one learner
-- inside one onboarding program.
--
-- Includes:
-- - module quizzes
-- - checkpoints
-- - latest attempt
-- - attempt usage
-- - score
-- - pass/review status
-- ============================================================

drop function if exists public.get_trainer_learner_assessments(uuid, uuid);

create function public.get_trainer_learner_assessments(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  assessment_type text,
  assessment_id uuid,
  quiz_id uuid,

  title text,

  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  module_id uuid,
  module_title text,

  checkpoint_id uuid,
  checkpoint_type text,

  passing_score numeric,
  max_attempts integer,

  attempts_used bigint,

  latest_attempt_id uuid,
  latest_attempt_number integer,
  latest_score numeric,
  latest_passed boolean,
  latest_status text,
  latest_submitted_at timestamptz,
  latest_graded_at timestamptz,

  assessment_status text
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
  -- MODULE QUIZZES
  -- ----------------------------------------------------------

  return query

  select
    'quiz'::text as assessment_type,

    q.id as assessment_id,
    q.id as quiz_id,

    q.title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    m.id as module_id,
    m.title as module_title,

    null::uuid as checkpoint_id,
    null::text as checkpoint_type,

    q.passing_score,
    q.max_attempts,

    (
      select count(*)
      from public.quiz_attempts qa_count
      where qa_count.quiz_id = q.id
        and qa_count.learner_id = target_learner_id
    ) as attempts_used,

    latest.id as latest_attempt_id,
    latest.attempt_number as latest_attempt_number,
    latest.score as latest_score,
    latest.passed as latest_passed,
    latest.status as latest_status,
    latest.submitted_at as latest_submitted_at,
    latest.graded_at as latest_graded_at,

    case
      when latest.id is null
        then 'not_started'

      when latest.status = 'needs_review'
        then 'needs_review'

      when latest.status = 'in_progress'
        then 'in_progress'

      when latest.status = 'graded'
        and latest.passed = true
        then 'passed'

      when latest.status = 'graded'
        and latest.passed = false
        then 'not_passed'

      else coalesce(
        latest.status,
        'not_started'
      )
    end::text as assessment_status

  from public.quizzes q

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  left join lateral (
    select
      qa.id,
      qa.attempt_number,
      qa.score,
      qa.passed,
      qa.status,
      qa.submitted_at,
      qa.graded_at
    from public.quiz_attempts qa
    where qa.quiz_id = q.id
      and qa.learner_id = target_learner_id
    order by
      qa.attempt_number desc,
      qa.started_at desc
    limit 1
  ) latest on true

  where d.program_id = target_program_id
    and d.is_published = true
    and q.is_published = true

    -- A checkpoint quiz must only appear
    -- in the checkpoint section below.
    and not exists (
      select 1
      from public.checkpoints c
      where c.quiz_id = q.id
    )

  union all

  -- ----------------------------------------------------------
  -- CHECKPOINTS
  -- ----------------------------------------------------------

  select
    'checkpoint'::text as assessment_type,

    c.id as assessment_id,
    q.id as quiz_id,

    c.title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    null::uuid as module_id,
    null::text as module_title,

    c.id as checkpoint_id,
    c.checkpoint_type,

    coalesce(
      c.passing_score,
      q.passing_score
    ) as passing_score,

    q.max_attempts,

    (
      select count(*)
      from public.quiz_attempts qa_count
      where qa_count.quiz_id = q.id
        and qa_count.learner_id = target_learner_id
    ) as attempts_used,

    latest.id as latest_attempt_id,
    latest.attempt_number as latest_attempt_number,
    latest.score as latest_score,
    latest.passed as latest_passed,
    latest.status as latest_status,
    latest.submitted_at as latest_submitted_at,
    latest.graded_at as latest_graded_at,

    case
      when latest.id is null
        then 'not_started'

      when latest.status = 'needs_review'
        then 'needs_review'

      when latest.status = 'in_progress'
        then 'in_progress'

      when latest.status = 'graded'
        and latest.passed = true
        then 'passed'

      when latest.status = 'graded'
        and latest.passed = false
        then 'not_passed'

      else coalesce(
        latest.status,
        'not_started'
      )
    end::text as assessment_status

  from public.checkpoints c

  join public.days d
    on d.id = c.day_id

  join public.quizzes q
    on q.id = c.quiz_id

  left join lateral (
    select
      qa.id,
      qa.attempt_number,
      qa.score,
      qa.passed,
      qa.status,
      qa.submitted_at,
      qa.graded_at
    from public.quiz_attempts qa
    where qa.quiz_id = q.id
      and qa.learner_id = target_learner_id
    order by
      qa.attempt_number desc,
      qa.started_at desc
    limit 1
  ) latest on true

  where d.program_id = target_program_id
    and d.is_published = true
    and q.is_published = true

  -- ----------------------------------------------------------
  -- ORDER
  -- ----------------------------------------------------------

  order by
    day_position,
    day_number,
    assessment_type,
    title;

end;
$function$;
