│
◇  Downloading snippet...
-- QUERY 210
-- Protect Module Content Visibility

BEGIN;

-- ==========================================================
-- 1. MODULES
-- ==========================================================

DROP POLICY IF EXISTS
  "Authenticated users can read modules"
ON public.modules;

CREATE POLICY "Authenticated users can read modules"
ON public.modules
FOR SELECT
TO authenticated
USING (
  public.is_trainer()
  OR (
    publication_status IN ('locked', 'published')
    AND EXISTS (
      SELECT 1
      FROM public.days d
      JOIN public.programs p
        ON p.id = d.program_id
      WHERE d.id = modules.day_id
        AND d.is_published = true
        AND p.status = 'published'
    )
  )
);


-- ==========================================================
-- 2. MATERIALS
-- ==========================================================

DROP POLICY IF EXISTS
  "Authenticated users can read materials"
ON public.materials;

CREATE POLICY "Authenticated users can read materials"
ON public.materials
FOR SELECT
TO authenticated
USING (
  public.is_trainer()
  OR EXISTS (
    SELECT 1
    FROM public.modules m
    JOIN public.days d
      ON d.id = m.day_id
    JOIN public.programs p
      ON p.id = d.program_id
    WHERE m.id = materials.module_id
      AND m.publication_status = 'published'
      AND d.is_published = true
      AND p.status = 'published'
  )
);


-- ==========================================================
-- 3. ACTIVITIES
-- ==========================================================

DROP POLICY IF EXISTS
  "Authenticated users can read activities"
ON public.activities;

CREATE POLICY "Authenticated users can read activities"
ON public.activities
FOR SELECT
TO authenticated
USING (
  public.is_trainer()
  OR EXISTS (
    SELECT 1
    FROM public.modules m
    JOIN public.days d
      ON d.id = m.day_id
    JOIN public.programs p
      ON p.id = d.program_id
    WHERE m.id = activities.module_id
      AND m.publication_status = 'published'
      AND d.is_published = true
      AND p.status = 'published'
  )
);

COMMIT;
