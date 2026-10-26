│
◇  Downloading snippet...
-- ============================================================
-- QUERY 167
-- Add Attempt Numbers to Trainer Review Queue
-- ============================================================

BEGIN;

-- Recreate the function because its return structure changes.
DROP FUNCTION public.get_quiz_review_queue(uuid);

CREATE FUNCTION public.get_quiz_review_queue(
  target_program_id uuid
)
RETURNS TABLE (
  attempt_id uuid,
  learner_id uuid,
  learner_name text,
  learner_email text,
  quiz_id uuid,
  quiz_title text,
  submitted_at timestamptz,
  current_score numeric,
  pending_answers bigint,
  attempt_number integer,
  max_attempts integer
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

  RETURN QUERY
  SELECT
    qa.id,
    qa.learner_id,
    p.full_name,
    p.email,
    q.id,
    q.title,
    qa.submitted_at,
    qa.score,

    (
      SELECT COUNT(*)
      FROM public.quiz_answers ans
      JOIN public.quiz_questions qq
        ON qq.id = ans.question_id
      WHERE ans.attempt_id = qa.id
        AND qq.question_type IN (
          'open_text',
          'file_upload'
        )
        AND ans.points_awarded IS NULL
    ) AS pending_answers,

    qa.attempt_number,
    q.max_attempts

  FROM public.quiz_attempts qa

  JOIN public.profiles p
    ON p.id = qa.learner_id

  JOIN public.quizzes q
    ON q.id = qa.quiz_id

  LEFT JOIN public.modules m
    ON m.id = q.module_id

  LEFT JOIN public.days module_day
    ON module_day.id = m.day_id

  LEFT JOIN public.checkpoints cp
    ON cp.quiz_id = q.id

  LEFT JOIN public.days checkpoint_day
    ON checkpoint_day.id = cp.day_id

  WHERE qa.status = 'needs_review'
    AND COALESCE(
      module_day.program_id,
      checkpoint_day.program_id
    ) = target_program_id

  ORDER BY qa.submitted_at ASC;

END;
$function$;

COMMIT;
