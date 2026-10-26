│
◇  Downloading snippet...
-- QUERY 209
-- Protect Material & Activity Progress

BEGIN;

-- ==========================================================
-- 1. MATERIAL COMPLETION
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_material_complete(
  target_material_id uuid,
  target_completed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.materials ma
    JOIN public.modules m
      ON m.id = ma.module_id
    JOIN public.days d
      ON d.id = m.day_id
    JOIN public.programs p
      ON p.id = d.program_id
    WHERE ma.id = target_material_id
      AND m.publication_status = 'published'
      AND d.is_published = true
      AND p.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Material is not available';
  END IF;

  INSERT INTO public.learner_material_progress (
    learner_id,
    material_id,
    completed,
    completed_at
  )
  VALUES (
    auth.uid(),
    target_material_id,
    target_completed,
    CASE
      WHEN target_completed THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (learner_id, material_id)
  DO UPDATE SET
    completed = EXCLUDED.completed,
    completed_at = EXCLUDED.completed_at;

END;
$function$;


-- ==========================================================
-- 2. ACTIVITY COMPLETION
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_activity_status(
  target_activity_id uuid,
  target_status text,
  target_notes text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_status NOT IN (
    'not_started',
    'in_progress',
    'completed'
  ) THEN
    RAISE EXCEPTION 'Invalid activity status';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.activities a
    JOIN public.modules m
      ON m.id = a.module_id
    JOIN public.days d
      ON d.id = m.day_id
    JOIN public.programs p
      ON p.id = d.program_id
    WHERE a.id = target_activity_id
      AND m.publication_status = 'published'
      AND d.is_published = true
      AND p.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Activity is not available';
  END IF;

  INSERT INTO public.learner_activity_progress (
    learner_id,
    activity_id,
    status,
    learner_notes,
    completed_at,
    updated_at
  )
  VALUES (
    auth.uid(),
    target_activity_id,
    target_status,
    target_notes,
    CASE
      WHEN target_status = 'completed'
      THEN NOW()
      ELSE NULL
    END,
    NOW()
  )
  ON CONFLICT (learner_id, activity_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    learner_notes = EXCLUDED.learner_notes,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

END;
$function$;

COMMIT;
