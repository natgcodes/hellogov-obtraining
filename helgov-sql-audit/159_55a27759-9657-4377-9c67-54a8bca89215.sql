│
◇  Downloading snippet...
-- ============================================================
-- QUERY 170
-- Separate Tool Setup from Learner Program Progress
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

  -- ==========================================================
  -- REQUIRED MODULES
  -- ==========================================================

  SELECT COUNT(*)
  INTO total_items
  FROM public.modules m
  JOIN public.days d
    ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true;

  SELECT COUNT(*)
  INTO completed_items
  FROM public.learner_module_progress lmp
  JOIN public.modules m
    ON m.id = lmp.module_id
  JOIN public.days d
    ON d.id = m.day_id
  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND m.is_required = true
    AND lmp.learner_id = auth.uid()
    AND lmp.status = 'completed';

  -- ==========================================================
  -- REQUIRED CHECKPOINTS
  -- ==========================================================

  total_items :=
    total_items +
    (
      SELECT COUNT(*)
      FROM public.checkpoints c
      JOIN public.days d
        ON d.id = c.day_id
      WHERE d.program_id = target_program_id
        AND d.is_published = true
        AND c.is_required = true
    );

  completed_items :=
    completed_items +
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
        AND cr.learner_id = auth.uid()
        AND cr.status = 'completed'
        AND cr.passed = true
    );

  -- ==========================================================
  -- OVERALL PROGRESS
  -- Tool Setup is intentionally excluded.
  -- ==========================================================

  IF total_items = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(
    (completed_items::numeric / total_items::numeric) * 100,
    2
  );

END;
$function$;
