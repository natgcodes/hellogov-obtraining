│
◇  Downloading snippet...
-- QUERY 221
-- Sync Enrollment Progress

BEGIN;

CREATE OR REPLACE FUNCTION public.recalculate_program_enrollment(
  target_program_id uuid,
  target_learner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_total_items integer := 0;
  v_completed_items integer := 0;
  v_status text := 'not_started';
BEGIN

  -- Validate enrollment.
  IF NOT EXISTS (
    SELECT 1
    FROM public.program_enrollments pe
    WHERE pe.program_id = target_program_id
      AND pe.learner_id = target_learner_id
  ) THEN
    RETURN;
  END IF;

  -- Required modules (excluding drafts).
  SELECT COUNT(*)
  INTO v_total_items
  FROM public.modules m
  JOIN public.days d ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true
    AND m.publication_status <> 'draft';

  -- Completed published modules.
  SELECT COUNT(*)
  INTO v_completed_items
  FROM public.learner_module_progress lmp
  JOIN public.modules m ON m.id = lmp.module_id
  JOIN public.days d ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true
    AND m.publication_status = 'published'
    AND lmp.learner_id = target_learner_id
    AND lmp.status = 'completed';

  -- Required checkpoints.
  v_total_items := v_total_items + (
    SELECT COUNT(*)
    FROM public.checkpoints c
    JOIN public.days d ON d.id = c.day_id
    WHERE d.program_id = target_program_id
      AND d.is_published = true
      AND c.is_required = true
  );

  -- Completed checkpoints.
  v_completed_items := v_completed_items + (
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
              AND qa.learner_id = target_learner_id
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
              AND cr.learner_id = target_learner_id
              AND cr.status = 'completed'
          )
        )
      )
  );

  -- Calculate enrollment status.
  IF v_total_items > 0
     AND v_completed_items >= v_total_items THEN
    v_status := 'completed';
  ELSIF v_completed_items > 0 THEN
    v_status := 'in_progress';
  ELSE
    v_status := 'not_started';
  END IF;

  -- Update enrollment without deleting progress.
  UPDATE public.program_enrollments pe
  SET
    status = v_status,
    started_at = CASE
      WHEN v_status <> 'not_started'
      THEN COALESCE(pe.started_at, NOW())
      ELSE pe.started_at
    END,
    completed_at = CASE
      WHEN v_status = 'completed'
      THEN COALESCE(pe.completed_at, NOW())
      ELSE NULL
    END
  WHERE pe.program_id = target_program_id
    AND pe.learner_id = target_learner_id;

END;
$function$;

COMMIT;
