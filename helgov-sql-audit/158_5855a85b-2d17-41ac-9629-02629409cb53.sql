│
◇  Downloading snippet...
-- ============================================================
-- QUERY 171
-- Exclude Tool Setup from Enrollment Recalculation
-- ============================================================

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

  -- ==========================================================
  -- VALIDATE ENROLLMENT
  -- ==========================================================

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_enrollments pe
    WHERE pe.program_id = target_program_id
      AND pe.learner_id = target_learner_id
  ) THEN
    RETURN;
  END IF;

  -- ==========================================================
  -- REQUIRED MODULES
  -- ==========================================================

  SELECT COUNT(*)
  INTO v_total_items
  FROM public.modules m
  JOIN public.days d
    ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true;

  SELECT COUNT(*)
  INTO v_completed_items
  FROM public.learner_module_progress lmp
  JOIN public.modules m
    ON m.id = lmp.module_id
  JOIN public.days d
    ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true
    AND lmp.learner_id = target_learner_id
    AND lmp.status = 'completed';

  -- ==========================================================
  -- REQUIRED CHECKPOINTS
  -- ==========================================================

  v_total_items :=
    v_total_items +
    (
      SELECT COUNT(*)
      FROM public.checkpoints c
      JOIN public.days d
        ON d.id = c.day_id
      WHERE d.program_id = target_program_id
        AND d.is_published = true
        AND c.is_required = true
    );

  v_completed_items :=
    v_completed_items +
    (
      SELECT COUNT(*)
      FROM public.checkpoint_results cr
      JOIN public.checkpoints c
        ON c.id = cr.checkpoint_id
      JOIN public.days d
        ON d.id = c.day_id
      WHERE d.program_id = target_program_id
        AND d.is_published = true
        AND c.is_required = true
        AND cr.learner_id = target_learner_id
        AND cr.status = 'completed'
        AND cr.passed = true
    );

  -- ==========================================================
  -- ENROLLMENT STATUS
  -- Tool Setup is intentionally excluded.
  -- ==========================================================

  IF v_total_items > 0
     AND v_completed_items >= v_total_items THEN

    v_status := 'completed';

  ELSIF v_completed_items > 0 THEN

    v_status := 'in_progress';

  ELSE

    v_status := 'not_started';

  END IF;

  -- ==========================================================
  -- UPDATE ENROLLMENT
  -- ==========================================================

  UPDATE public.program_enrollments pe
  SET
    status = v_status,

    started_at =
      CASE
        WHEN v_status <> 'not_started'
        THEN COALESCE(pe.started_at, NOW())
        ELSE pe.started_at
      END,

    completed_at =
      CASE
        WHEN v_status = 'completed'
        THEN COALESCE(pe.completed_at, NOW())
        ELSE NULL
      END

  WHERE pe.program_id = target_program_id
    AND pe.learner_id = target_learner_id;

END;
$function$;
