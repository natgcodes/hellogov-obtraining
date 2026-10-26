│
◇  Downloading snippet...
-- QUERY 269
-- Update module progress calculation.
-- Uses the latest non-cancelled quiz attempt.
-- Preserves materials, activities and manual completion.
-- Does not modify existing learner records.

CREATE OR REPLACE FUNCTION public.recalculate_module_progress(
  target_module_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$

DECLARE
  current_user_id uuid;

  required_materials int := 0;
  completed_materials int := 0;

  required_activities int := 0;
  completed_activities int := 0;

  required_quizzes int := 0;
  completed_quizzes int := 0;

  final_status text;

BEGIN

  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ==========================================================
  -- MATERIALS
  -- ==========================================================

  SELECT count(*)
  INTO required_materials
  FROM public.materials
  WHERE module_id = target_module_id
    AND is_required = true;

  SELECT count(*)
  INTO completed_materials
  FROM public.materials ma
  JOIN public.learner_material_progress lmp
    ON lmp.material_id = ma.id
  WHERE ma.module_id = target_module_id
    AND ma.is_required = true
    AND lmp.learner_id = current_user_id
    AND lmp.completed = true;

  -- ==========================================================
  -- ACTIVITIES
  -- ==========================================================

  SELECT count(*)
  INTO required_activities
  FROM public.activities
  WHERE module_id = target_module_id
    AND is_required = true;

  SELECT count(*)
  INTO completed_activities
  FROM public.activities a
  JOIN public.learner_activity_progress lap
    ON lap.activity_id = a.id
  WHERE a.module_id = target_module_id
    AND a.is_required = true
    AND lap.learner_id = current_user_id
    AND lap.status = 'completed';

  -- ==========================================================
  -- QUIZZES
  -- ==========================================================

  SELECT count(*)
  INTO required_quizzes
  FROM public.quizzes
  WHERE module_id = target_module_id
    AND is_required = true
    AND is_published = true;

  SELECT count(*)
  INTO completed_quizzes
  FROM public.quizzes q
  WHERE q.module_id = target_module_id
    AND q.is_required = true
    AND q.is_published = true

    AND (

      -- Latest valid attempt must be graded and passed.

      (
        SELECT
          qa.status = 'graded'
          AND qa.passed IS TRUE
        FROM public.quiz_attempts qa
        WHERE qa.quiz_id = q.id
          AND qa.learner_id = current_user_id
          AND qa.status <> 'cancelled'
        ORDER BY
          qa.attempt_number DESC,
          qa.id DESC
        LIMIT 1
      ) IS TRUE

      OR

      -- Explicit manual completion remains valid.

      EXISTS (
        SELECT 1
        FROM public.learner_quiz_progress lqp
        WHERE lqp.quiz_id = q.id
          AND lqp.learner_id = current_user_id
          AND lqp.completed = true
      )

    );

  -- ==========================================================
  -- MODULE STATUS
  -- ==========================================================

  IF
    completed_materials >= required_materials
    AND completed_activities >= required_activities
    AND completed_quizzes >= required_quizzes
  THEN

    final_status := 'completed';

  ELSIF
    completed_materials > 0
    OR completed_activities > 0
    OR completed_quizzes > 0
    OR EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quizzes q
        ON q.id = qa.quiz_id
      WHERE q.module_id = target_module_id
        AND qa.learner_id = current_user_id
        AND qa.status <> 'cancelled'
    )
  THEN

    final_status := 'in_progress';

  ELSE

    final_status := 'not_started';

  END IF;

  -- ==========================================================
  -- UPSERT MODULE PROGRESS
  -- ==========================================================

  INSERT INTO public.learner_module_progress (
    learner_id,
    module_id,
    status,
    started_at,
    completed_at,
    updated_at
  )
  VALUES (
    current_user_id,
    target_module_id,
    final_status,

    CASE
      WHEN final_status <> 'not_started'
      THEN now()
      ELSE NULL
    END,

    CASE
      WHEN final_status = 'completed'
      THEN now()
      ELSE NULL
    END,

    now()
  )

  ON CONFLICT (learner_id, module_id)
  DO UPDATE SET

    status = excluded.status,

    started_at =
      CASE
        WHEN public.learner_module_progress.started_at
          IS NOT NULL
        THEN public.learner_module_progress.started_at

        WHEN excluded.status <> 'not_started'
        THEN now()

        ELSE NULL
      END,

    completed_at =
      CASE
        WHEN excluded.status = 'completed'
        THEN coalesce(
          public.learner_module_progress.completed_at,
          now()
        )
        ELSE NULL
      END,

    updated_at = now();

  RETURN final_status;

END;

$function$;
