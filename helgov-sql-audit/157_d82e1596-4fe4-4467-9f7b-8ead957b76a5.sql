│
◇  Downloading snippet...
-- ============================================================
-- QUERY 172
-- Exclude Tool Setup from Trainer Learner Progress
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trainer_learners(
  target_program_id uuid
)
RETURNS TABLE (
  learner_id uuid,
  full_name text,
  email text,
  enrollment_status text,
  enrolled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  progress_percent numeric,
  completed_modules bigint,
  total_modules bigint,
  passed_quizzes bigint,
  total_quizzes bigint,
  needs_review bigint,
  completed_checkpoints bigint,
  total_checkpoints bigint
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
    pe.learner_id,
    pr.full_name,
    pr.email,
    pe.status,
    pe.enrolled_at,
    pe.started_at,
    pe.completed_at,

    -- ========================================================
    -- OVERALL PROGRESS
    -- Modules + Checkpoints only. Tool Setup excluded.
    -- ========================================================

    CASE
      WHEN (
        (
          SELECT COUNT(*)
          FROM public.modules m
          JOIN public.days d ON d.id = m.day_id
          WHERE d.program_id = target_program_id
            AND d.is_published = true
            AND m.is_required = true
        )
        +
        (
          SELECT COUNT(*)
          FROM public.checkpoints c
          JOIN public.days d ON d.id = c.day_id
          WHERE d.program_id = target_program_id
            AND d.is_published = true
            AND c.is_required = true
        )
      ) = 0
      THEN 0::numeric

      ELSE ROUND(
        (
          (
            SELECT COUNT(*)
            FROM public.learner_module_progress lmp
            JOIN public.modules m ON m.id = lmp.module_id
            JOIN public.days d ON d.id = m.day_id
            WHERE lmp.learner_id = pe.learner_id
              AND d.program_id = target_program_id
              AND d.is_published = true
              AND m.is_required = true
              AND lmp.status = 'completed'
          )
          +
          (
            SELECT COUNT(*)
            FROM public.checkpoint_results cr
            JOIN public.checkpoints c ON c.id = cr.checkpoint_id
            JOIN public.days d ON d.id = c.day_id
            WHERE cr.learner_id = pe.learner_id
              AND d.program_id = target_program_id
              AND d.is_published = true
              AND c.is_required = true
              AND cr.status = 'completed'
              AND cr.passed = true
          )
        )::numeric
        /
        (
          (
            SELECT COUNT(*)
            FROM public.modules m
            JOIN public.days d ON d.id = m.day_id
            WHERE d.program_id = target_program_id
              AND d.is_published = true
              AND m.is_required = true
          )
          +
          (
            SELECT COUNT(*)
            FROM public.checkpoints c
            JOIN public.days d ON d.id = c.day_id
            WHERE d.program_id = target_program_id
              AND d.is_published = true
              AND c.is_required = true
          )
        )::numeric
        * 100,
        2
      )
    END AS progress_percent,

    -- ========================================================
    -- MODULES
    -- ========================================================

    (
      SELECT COUNT(*)
      FROM public.learner_module_progress lmp
      JOIN public.modules m ON m.id = lmp.module_id
      JOIN public.days d ON d.id = m.day_id
      WHERE lmp.learner_id = pe.learner_id
        AND d.program_id = target_program_id
        AND d.is_published = true
        AND m.is_required = true
        AND lmp.status = 'completed'
    ) AS completed_modules,

    (
      SELECT COUNT(*)
      FROM public.modules m
      JOIN public.days d ON d.id = m.day_id
      WHERE d.program_id = target_program_id
        AND d.is_published = true
        AND m.is_required = true
    ) AS total_modules,

    -- ========================================================
    -- QUIZZES
    -- Count unique passed quizzes, not attempts.
    -- ========================================================

    (
      SELECT COUNT(DISTINCT qa.quiz_id)
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON q.id = qa.quiz_id
      JOIN public.modules m ON m.id = q.module_id
      JOIN public.days d ON d.id = m.day_id
      WHERE qa.learner_id = pe.learner_id
        AND d.program_id = target_program_id
        AND d.is_published = true
        AND q.is_published = true
        AND q.is_required = true
        AND qa.status = 'graded'
        AND qa.passed = true
        AND NOT EXISTS (
          SELECT 1
          FROM public.checkpoints c
          WHERE c.quiz_id = q.id
        )
    ) AS passed_quizzes,

    (
      SELECT COUNT(*)
      FROM public.quizzes q
      JOIN public.modules m ON m.id = q.module_id
      JOIN public.days d ON d.id = m.day_id
      WHERE d.program_id = target_program_id
        AND d.is_published = true
        AND q.is_published = true
        AND q.is_required = true
        AND NOT EXISTS (
          SELECT 1
          FROM public.checkpoints c
          WHERE c.quiz_id = q.id
        )
    ) AS total_quizzes,

    -- ========================================================
    -- NEEDS REVIEW
    -- ========================================================

    (
      SELECT COUNT(*)
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON q.id = qa.quiz_id
      WHERE qa.learner_id = pe.learner_id
        AND qa.status = 'needs_review'
        AND (
          EXISTS (
            SELECT 1
            FROM public.modules m
            JOIN public.days d ON d.id = m.day_id
            WHERE m.id = q.module_id
              AND d.program_id = target_program_id
              AND d.is_published = true
          )
          OR EXISTS (
            SELECT 1
            FROM public.checkpoints c
            JOIN public.days d ON d.id = c.day_id
            WHERE c.quiz_id = q.id
              AND d.program_id = target_program_id
              AND d.is_published = true
          )
        )
    ) AS needs_review,

    -- ========================================================
    -- CHECKPOINTS
    -- ========================================================

    (
      SELECT COUNT(*)
      FROM public.checkpoint_results cr
      JOIN public.checkpoints c ON c.id = cr.checkpoint_id
      JOIN public.days d ON d.id = c.day_id
      WHERE cr.learner_id = pe.learner_id
        AND d.program_id = target_program_id
        AND d.is_published = true
        AND c.is_required = true
        AND cr.status = 'completed'
        AND cr.passed = true
    ) AS completed_checkpoints,

    (
      SELECT COUNT(*)
      FROM public.checkpoints c
      JOIN public.days d ON d.id = c.day_id
      WHERE d.program_id = target_program_id
        AND d.is_published = true
        AND c.is_required = true
    ) AS total_checkpoints

  FROM public.program_enrollments pe
  JOIN public.profiles pr
    ON pr.id = pe.learner_id

  WHERE pe.program_id = target_program_id
    AND pr.role = 'learner'

  ORDER BY
    pe.completed_at DESC NULLS LAST,
    pe.started_at DESC NULLS LAST,
    pr.full_name;

END;
$function$;
