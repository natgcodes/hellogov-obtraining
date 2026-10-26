│
◇  Downloading snippet...
-- QUERY 224
-- Secure Day Content Visibility

BEGIN;

DROP POLICY IF EXISTS
  "Authenticated users can read day content"
ON public.day_content;

CREATE POLICY
  "Authenticated users can read day content"
ON public.day_content
FOR SELECT
TO authenticated
USING (
  public.is_trainer()

  OR

  (
    content_type = 'module'

    AND EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.days d
        ON d.id = m.day_id
      JOIN public.programs p
        ON p.id = d.program_id
      WHERE m.id = day_content.content_id
        AND m.publication_status IN (
          'locked',
          'published'
        )
        AND d.is_published = true
        AND p.status = 'published'
    )
  )

  OR

  (
    content_type = 'checkpoint'

    AND EXISTS (
      SELECT 1
      FROM public.checkpoints c
      JOIN public.days d
        ON d.id = c.day_id
      JOIN public.programs p
        ON p.id = d.program_id
      WHERE c.id = day_content.content_id
        AND d.is_published = true
        AND p.status = 'published'
    )
  )
);

COMMIT;
