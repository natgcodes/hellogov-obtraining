│
◇  Downloading snippet...
-- ============================================================
-- QUERY 78
-- get_trainer_learner_quiz_progress
--
-- Trainer-facing module quiz progress for one learner
-- in one program.
--
-- Checkpoint quizzes are intentionally excluded.
-- Returns one row per published module quiz.
-- ============================================================

drop function if exists public.get_trainer_learner_quiz_progress(uuid, uuid);

create function public.get_trainer_learner_quiz_progress(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  module_id uuid,
  module_title text,
  module_position integer,

  quiz_id uuid,
  quiz_title text,
  quiz_position integer,
  is_required boolean,
  passing_score numeric,
  max_attempts integer,

  attempts_used bigint,
  best_score numeric,
  passed boolean,

  latest_attempt_id uuid,
  latest_attempt_number integer,
  latest_attempt_status text,
  latest_attempt_score numeric,
  latest_attempt_passed boolean,
  latest_started_at timestamptz,
  latest_submitted_at timestamptz,
  latest_graded_at timestamptz,

  needs_review boolean,
  attempts_exhausted boolean
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
  -- VALIDATE LEARNER ENROLLMENT
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
  -- MODULE QUIZ PROGRESS
  -- ----------------------------------------------------------

  return query
  select
    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    m.id as module_id,
    m.title as module_title,
    m.position as module_position,

    q.id as quiz_id,
    q.title as quiz_title,
    q.position as quiz_position,
    q.is_required,
    q.passing_score,
    q.max_attempts,

    -- --------------------------------------------------------
    -- ATTEMPTS USED
    -- --------------------------------------------------------

    (
      select count(*)
      from public.quiz_attempts qa
      where qa.quiz_id = q.id
        and qa.learner_id = target_learner_id
    ) as attempts_used,

    -- --------------------------------------------------------
    -- BEST FINAL SCORE
    --
    -- Only graded attempts count toward best score.
    -- --------------------------------------------------------

    (
      select max(qa.score)
      from public.quiz_attempts qa
      where qa.quiz_id = q.id
        and qa.learner_id = target_learner_id
        and qa.status = 'graded'
    ) as best_score,

    -- --------------------------------------------------------
    -- PASSED
    -- --------------------------------------------------------

    exists (
      select 1
      from public.quiz_attempts qa
      where qa.quiz_id = q.id
        and qa.learner_id = target_learner_id
        and qa.status = 'graded'
        and qa.passed = true
    ) as passed,

    -- --------------------------------------------------------
    -- LATEST ATTEMPT
    -- --------------------------------------------------------

    latest.id as latest_attempt_id,
    latest.attempt_number as latest_attempt_number,
    latest.status as latest_attempt_status,
    latest.score as latest_attempt_score,
    latest.passed as latest_attempt_passed,
    latest.started_at as latest_started_at,
    latest.submitted_at as latest_submitted_at,
    latest.graded_at as latest_graded_at,

    -- --------------------------------------------------------
    -- NEEDS REVIEW
    --
    -- True if any attempt for this quiz is currently waiting
    -- for trainer review.
    -- --------------------------------------------------------

    exists (
      select 1
      from public.quiz_attempts qa
      where qa.quiz_id = q.id
        and qa.learner_id = target_learner_id
        and qa.status = 'needs_review'
    ) as needs_review,

    -- --------------------------------------------------------
    -- ATTEMPTS EXHAUSTED
    --
    -- NULL max_attempts means unlimited attempts.
    -- --------------------------------------------------------

    case
      when q.max_attempts is null then false

      else (
        (
          select count(*)
          from public.quiz_attempts qa
          where qa.quiz_id = q.id
            and qa.learner_id = target_learner_id
        ) >= q.max_attempts
      )
    end as attempts_exhausted

  from public.quizzes q

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  -- ----------------------------------------------------------
  -- MOST RECENT ATTEMPT
  -- ----------------------------------------------------------

  left join lateral (
    select
      qa.id,
      qa.attempt_number,
      qa.status,
      qa.score,
      qa.passed,
      qa.started_at,
      qa.submitted_at,
      qa.graded_at
    from public.quiz_attempts qa
    where qa.quiz_id = q.id
      and qa.learner_id = target_learner_id
    order by
      qa.attempt_number desc,
      qa.started_at desc
    limit 1
  ) latest
    on true

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
    q.position,
    q.title;

end;
$function$;
