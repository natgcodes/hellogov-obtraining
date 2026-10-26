│
◇  Downloading snippet...
-- QUERY 220
-- Fix Day & Program Progress

BEGIN;

-- ============================================================
-- 1. DAY COMPLETION
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_day_complete(
  target_day_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$

SELECT
  auth.uid() IS NOT NULL

  AND (
    EXISTS (
      SELECT 1
      FROM public.modules m
      WHERE m.day_id = target_day_id
        AND m.is_required = true
        AND m.publication_status <> 'draft'
    )
    OR EXISTS (
      SELECT 1
      FROM public.checkpoints c
      WHERE c.day_id = target_day_id
        AND c.is_required = true
    )
  )

  AND NOT EXISTS (
    SELECT 1
    FROM public.modules m
    WHERE m.day_id = target_day_id
      AND m.is_required = true
      AND m.publication_status <> 'draft'
      AND (
        m.publication_status = 'locked'
        OR NOT EXISTS (
          SELECT 1
          FROM public.learner_module_progress lmp
          WHERE lmp.module_id = m.id
            AND lmp.learner_id = auth.uid()
            AND lmp.status = 'completed'
        )
      )
  )

  AND NOT EXISTS (
    SELECT 1
    FROM public.checkpoints c
    WHERE c.day_id = target_day_id
      AND c.is_required = true
      AND NOT (
        CASE
          WHEN c.checkpoint_type = 'assessment'
          THEN EXISTS (
            SELECT 1
            FROM public.quiz_attempts qa
            WHERE qa.quiz_id = c.quiz_id
              AND qa.learner_id = auth.uid()
              AND qa.submitted_at IS NOT NULL
              AND qa.status IN (
                'submitted',
                'needs_review',
                'graded',
                'completed'
              )
          )

          WHEN c.checkpoint_type IN (
            'trainer_session',
            'information'
          )
          THEN EXISTS (
            SELECT 1
            FROM public.checkpoint_results cr
            WHERE cr.checkpoint_id = c.id
              AND cr.learner_id = auth.uid()
              AND cr.status = 'completed'
          )

          ELSE false
        END
      )
  );

$function$;


-- ============================================================
-- 2. PROGRAM PROGRESS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_program_progress(
  target_program_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  total_items integer := 0;
  completed_items integer := 0;
BEGIN

  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  -- Required modules, excluding drafts.

  SELECT COUNT(*)
  INTO total_items
  FROM public.modules m
  JOIN public.days d ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true
    AND m.publication_status <> 'draft';

  -- Completed published modules.

  SELECT COUNT(*)
  INTO completed_items
  FROM public.learner_module_progress lmp
  JOIN public.modules m ON m.id = lmp.module_id
  JOIN public.days d ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true
    AND m.publication_status = 'published'
    AND lmp.learner_id = auth.uid()
    AND lmp.status = 'completed';

  -- Required checkpoints.

  total_items := total_items + (
    SELECT COUNT(*)
    FROM public.checkpoints c
    JOIN public.days d ON d.id = c.day_id
    WHERE d.program_id = target_program_id
      AND d.is_published = true
      AND c.is_required = true
  );

  -- Completed checkpoints.
  -- Assessment = submitted, regardless of passing score.

  completed_items := completed_items + (
    SELECT COUNT(*)
    FROM public.checkpoints c
    JOIN public.days d ON d.id = c.day_id
    WHERE d.program_id = target_program_id
      AND d.is_published = true
      AND c.is_required = true
      AND (
        (
          c.checkpoint_type = 'assessment'
          AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts qa
            WHERE qa.quiz_id = c.quiz_id
              AND qa.learner_id = auth.uid()
              AND qa.submitted_at IS NOT NULL
              AND qa.status IN (
                'submitted',
                'needs_review',
                'graded',
                'completed'
              )
          )
        )
        OR
        (
          c.checkpoint_type IN (
            'trainer_session',
            'information'
          )
          AND EXISTS (
            SELECT 1
            FROM public.checkpoint_results cr
            WHERE cr.checkpoint_id = c.id
              AND cr.learner_id = auth.uid()
              AND cr.status = 'completed'
          )
        )
      )
  );

  IF total_items = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(
    (completed_items::numeric / total_items::numeric) * 100,
    2
  );

END;
$function$;

COMMIT;
