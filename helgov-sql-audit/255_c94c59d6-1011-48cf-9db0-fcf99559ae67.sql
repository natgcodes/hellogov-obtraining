│
◇  Downloading snippet...
-- ============================================================
-- QUERY 92
-- Fix get_trainer_learner_assessments
--
-- Returns MODULE QUIZZES ONLY.
-- Checkpoints are handled separately by:
-- get_trainer_learner_checkpoints
-- ============================================================

drop function if exists public.get_trainer_learner_assessments(uuid, uuid);

create function public.get_trainer_learner_assessments(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  quiz_id uuid,
  quiz_title text,

  module_id uuid,
  module_title text,

  day_id uuid,
  day_number integer,
  day_title text,

  passing_score numeric,
  max_attempts integer,
  is_required boolean,

  attempt_count bigint,

  latest_attempt_id uuid,
  latest_attempt_number integer,
  latest_score numeric,
  latest_passed boolean,
  latest_status text,
  latest_submitted_at timestamptz
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
  -- MODULE QUIZZES ONLY
  --
  -- Checkpoint quizzes are intentionally excluded.
  -- ----------------------------------------------------------

  return query

  select
    q.id as quiz_id,
    q.title as quiz_title,

    m.id as module_id,
    m.title as module_title,

    d.id as day_id,
    d.day_number,
    d.title as day_title,

    q.passing_score,
    q.max_attempts,
    q.is_required,

    (
      select count(*)
      from public.quiz_attempts qa_count
      where qa_count.quiz_id = q.id
        and qa_count.learner_id = target_learner_id
    ) as attempt_count,

    latest.id as latest_attempt_id,
    latest.attempt_number as latest_attempt_number,
    latest.score as latest_score,
    latest.passed as latest_passed,

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
    end::text as latest_status,

    latest.submitted_at as latest_submitted_at

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
      qa.started_at

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

    -- --------------------------------------------------------
    -- EXCLUDE CHECKPOINT QUIZZES
    -- --------------------------------------------------------

    and not exists (
      select 1
      from public.checkpoints c
      where c.quiz_id = q.id
    )

  order by
    d.position,
    d.day_number,
    m.position,
    q.title;

end;
$function$;
