│
◇  Downloading snippet...
-- ============================================================
-- QUERY 183
-- Fix Manual Review Module Progress
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_quiz_review_with_progress(
  target_attempt_id uuid
)
RETURNS TABLE (
  score numeric,
  passed boolean,
  status text,
  module_status text,
  program_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_attempt record;

  v_quiz_id uuid;
  v_learner_id uuid;
  v_module_id uuid;
  v_checkpoint_id uuid;
  v_program_id uuid;

  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_pending_manual integer := 0;

  v_final_score numeric := 0;
  v_final_passed boolean := false;

  v_module_status text := NULL;
  v_program_status text := 'not_started';

BEGIN

  -- ==========================================================
  -- SECURITY
  -- ==========================================================

  IF NOT public.is_trainer() THEN
    RAISE EXCEPTION 'Trainer access required';
  END IF;

  -- ==========================================================
  -- LOAD ATTEMPT
  -- ==========================================================

  SELECT
    qa.id,
    qa.quiz_id,
    qa.learner_id,
    qa.status,
    qa.submitted_at,
    q.module_id,
    q.passing_score
  INTO v_attempt
  FROM public.quiz_attempts qa
  JOIN public.quizzes q
    ON q.id = qa.quiz_id
  WHERE qa.id = target_attempt_id
  FOR UPDATE OF qa;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_attempt.status <> 'needs_review' THEN
    RAISE EXCEPTION
      'Only attempts pending manual review can be finalized';
  END IF;

  IF v_attempt.submitted_at IS NULL THEN
    RAISE EXCEPTION 'Attempt has not been submitted';
  END IF;

  v_quiz_id := v_attempt.quiz_id;
  v_learner_id := v_attempt.learner_id;
  v_module_id := v_attempt.module_id;

  -- ==========================================================
  -- DETECT CHECKPOINT
  -- ==========================================================

  SELECT c.id
  INTO v_checkpoint_id
  FROM public.checkpoints c
  WHERE c.quiz_id = v_quiz_id
  LIMIT 1;

  -- ==========================================================
  -- DETERMINE PROGRAM
  -- ==========================================================

  IF v_checkpoint_id IS NOT NULL THEN

    SELECT d.program_id
    INTO v_program_id
    FROM public.checkpoints c
    JOIN public.days d
      ON d.id = c.day_id
    WHERE c.id = v_checkpoint_id;

  ELSIF v_module_id IS NOT NULL THEN

    SELECT d.program_id
    INTO v_program_id
    FROM public.modules m
    JOIN public.days d
      ON d.id = m.day_id
    WHERE m.id = v_module_id;

  ELSE

    RAISE EXCEPTION
      'Quiz is not attached to a module or checkpoint';

  END IF;

  -- ==========================================================
  -- VERIFY MANUAL ANSWERS
  -- ==========================================================

  SELECT COUNT(*)
  INTO v_pending_manual
  FROM public.quiz_answers a
  JOIN public.quiz_questions qq
    ON qq.id = a.question_id
  WHERE a.attempt_id = target_attempt_id
    AND qq.question_type IN ('open_text', 'file_upload')
    AND a.points_awarded IS NULL;

  IF v_pending_manual > 0 THEN
    RAISE EXCEPTION 'Manual answers still require grading';
  END IF;

  -- ==========================================================
  -- CALCULATE FINAL SCORE
  -- ==========================================================

  SELECT COALESCE(SUM(qq.points), 0)
  INTO v_total_points
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = v_quiz_id;

  SELECT COALESCE(SUM(a.points_awarded), 0)
  INTO v_earned_points
  FROM public.quiz_answers a
  WHERE a.attempt_id = target_attempt_id;

  IF v_total_points > 0 THEN
    v_final_score :=
      ROUND((v_earned_points / v_total_points) * 100, 2);
  END IF;

  v_final_passed :=
    v_final_score >= v_attempt.passing_score;

  -- ==========================================================
  -- FINALIZE ATTEMPT
  -- Query 178 records the reviewer and grading method.
  -- ==========================================================

  UPDATE public.quiz_attempts qa
  SET
    score = v_final_score,
    passed = v_final_passed,
    status = 'graded',
    graded_at = NOW()
  WHERE qa.id = target_attempt_id;

  -- ==========================================================
  -- MODULE PROGRESS
  -- Recalculate for the actual learner, not auth.uid().
  -- ==========================================================

  IF v_module_id IS NOT NULL
     AND v_checkpoint_id IS NULL THEN

    SELECT
      CASE
        WHEN
          (
            SELECT COUNT(*)
            FROM public.materials ma
            WHERE ma.module_id = v_module_id
              AND ma.is_required = true
          ) =
          (
            SELECT COUNT(*)
            FROM public.materials ma
            JOIN public.learner_material_progress lmp
              ON lmp.material_id = ma.id
            WHERE ma.module_id = v_module_id
              AND ma.is_required = true
              AND lmp.learner_id = v_learner_id
              AND lmp.completed = true
          )

          AND

          (
            SELECT COUNT(*)
            FROM public.activities a
            WHERE a.module_id = v_module_id
              AND a.is_required = true
          ) =
          (
            SELECT COUNT(*)
            FROM public.activities a
            JOIN public.learner_activity_progress lap
              ON lap.activity_id = a.id
            WHERE a.module_id = v_module_id
              AND a.is_required = true
              AND lap.learner_id = v_learner_id
              AND lap.status = 'completed'
          )

          AND

          (
            SELECT COUNT(*)
            FROM public.quizzes q
            WHERE q.module_id = v_module_id
              AND q.is_required = true
              AND q.is_published = true
              AND NOT EXISTS (
                SELECT 1
                FROM public.checkpoints c
                WHERE c.quiz_id = q.id
              )
          ) =
          (
            SELECT COUNT(*)
            FROM public.quizzes q
            WHERE q.module_id = v_module_id
              AND q.is_required = true
              AND q.is_published = true
              AND NOT EXISTS (
                SELECT 1
                FROM public.checkpoints c
                WHERE c.quiz_id = q.id
              )
              AND EXISTS (
                SELECT 1
                FROM public.quiz_attempts qa
                WHERE qa.quiz_id = q.id
                  AND qa.learner_id = v_learner_id
                  AND qa.status = 'graded'
                  AND qa.passed = true
              )
          )

        THEN 'completed'

        WHEN EXISTS (
          SELECT 1
          FROM public.quiz_attempts qa
          JOIN public.quizzes q
            ON q.id = qa.quiz_id
          WHERE q.module_id = v_module_id
            AND qa.learner_id = v_learner_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.learner_material_progress lmp
          JOIN public.materials ma
            ON ma.id = lmp.material_id
          WHERE ma.module_id = v_module_id
            AND lmp.learner_id = v_learner_id
            AND lmp.completed = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.learner_activity_progress lap
          JOIN public.activities a
            ON a.id = lap.activity_id
          WHERE a.module_id = v_module_id
            AND lap.learner_id = v_learner_id
            AND lap.status = 'completed'
        )

        THEN 'in_progress'

        ELSE 'not_started'
      END
    INTO v_module_status;

    INSERT INTO public.learner_module_progress (
      learner_id,
      module_id,
      status,
      started_at,
      completed_at,
      updated_at
    )
    VALUES (
      v_learner_id,
      v_module_id,
      v_module_status,
      CASE
        WHEN v_module_status <> 'not_started'
        THEN NOW()
        ELSE NULL
      END,
      CASE
        WHEN v_module_status = 'completed'
        THEN NOW()
        ELSE NULL
      END,
      NOW()
    )

    ON CONFLICT (learner_id, module_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      started_at =
        CASE
          WHEN EXCLUDED.status <> 'not_started'
          THEN COALESCE(
            public.learner_module_progress.started_at,
            NOW()
          )
          ELSE public.learner_module_progress.started_at
        END,
      completed_at =
        CASE
          WHEN EXCLUDED.status = 'completed'
          THEN COALESCE(
            public.learner_module_progress.completed_at,
            NOW()
          )
          ELSE NULL
        END,
      updated_at = NOW();

  END IF;

  -- ==========================================================
  -- PROGRAM PROGRESS
  -- Tool Setup remains excluded.
  -- ==========================================================

  PERFORM public.recalculate_program_enrollment(
    v_program_id,
    v_learner_id
  );

  SELECT pe.status
  INTO v_program_status
  FROM public.program_enrollments pe
  WHERE pe.program_id = v_program_id
    AND pe.learner_id = v_learner_id;

  -- ==========================================================
  -- RETURN RESULT
  -- ==========================================================

  RETURN QUERY
  SELECT
    v_final_score,
    v_final_passed,
    'graded'::text,
    v_module_status,
    COALESCE(v_program_status, 'not_started');

END;
$function$;
