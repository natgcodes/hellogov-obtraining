│
◇  Downloading snippet...
-- QUERY 273
-- Update trainer quiz progress.
-- Latest non-cancelled attempt determines pass status.
-- Preserve historical attempt counts and best score.

CREATE OR REPLACE FUNCTION public.get_trainer_learner_quiz_progress(
  target_program_id uuid,
  target_learner_id uuid
)
RETURNS TABLE(
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$

BEGIN

  IF NOT public.is_trainer() THEN
    RAISE EXCEPTION 'Trainer access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_enrollments pe
    WHERE pe.program_id = target_program_id
      AND pe.learner_id = target_learner_id
  ) THEN
    RAISE EXCEPTION 'Learner is not enrolled in this program';
  END IF;

  RETURN QUERY

  SELECT
    d.id,
    d.day_number,
    d.title,
    d.position,

    m.id,
    m.title,
    m.position,

    q.id,
    q.title,
    q.position,
    q.is_required,
    q.passing_score,
    q.max_attempts,

    -- Total historical attempts, including cancelled ones.

    (
      SELECT count(*)
      FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id
        AND qa.learner_id = target_learner_id
    ) AS attempts_used,

    -- Best historical valid graded score.

    (
      SELECT max(qa.score)
      FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id
        AND qa.learner_id = target_learner_id
        AND qa.status = 'graded'
    ) AS best_score,

    -- Only the latest non-cancelled attempt determines passing.

    COALESCE(
      latest.status = 'graded'
      AND latest.passed IS TRUE,
      false
    ) AS passed,

    latest.id,
    latest.attempt_number,
    latest.status,
    latest.score,
    latest.passed,
    latest.started_at,
    latest.submitted_at,
    latest.graded_at,

    -- Only active attempts awaiting review.

    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id
        AND qa.learner_id = target_learner_id
        AND qa.status = 'needs_review'
    ) AS needs_review,

    -- Cancelled attempts still occupy their historical
    -- attempt number. They are not deleted or renumbered.

    CASE
      WHEN q.max_attempts IS NULL THEN false
      ELSE (
        (
          SELECT count(*)
          FROM public.quiz_attempts qa
          WHERE qa.quiz_id = q.id
            AND qa.learner_id = target_learner_id
        ) >= q.max_attempts
      )
    END AS attempts_exhausted

  FROM public.quizzes q

  JOIN public.modules m
    ON m.id = q.module_id

  JOIN public.days d
    ON d.id = m.day_id

  LEFT JOIN LATERAL (
    SELECT
      qa.id,
      qa.attempt_number,
      qa.status,
      qa.score,
      qa.passed,
      qa.started_at,
      qa.submitted_at,
      qa.graded_at
    FROM public.quiz_attempts qa
    WHERE qa.quiz_id = q.id
      AND qa.learner_id = target_learner_id
      AND qa.status <> 'cancelled'
    ORDER BY
      qa.attempt_number DESC,
      qa.started_at DESC
    LIMIT 1
  ) latest ON true

  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND q.is_published = true

    AND NOT EXISTS (
      SELECT 1
      FROM public.checkpoints c
      WHERE c.quiz_id = q.id
    )

  ORDER BY
    d.position,
    d.day_number,
    m.position,
    q.position,
    q.title;

END;

$function$;
