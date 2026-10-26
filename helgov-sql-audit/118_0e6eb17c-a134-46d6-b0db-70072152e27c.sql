│
◇  Downloading snippet...
-- QUERY 211
-- Protect Quiz Access by Module Status

CREATE OR REPLACE FUNCTION public.can_access_quiz(
  target_quiz_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$

  SELECT
    public.is_trainer()

    -- ========================================================
    -- NORMAL MODULE QUIZ
    -- ========================================================

    OR EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.modules m
        ON m.id = q.module_id
      JOIN public.days d
        ON d.id = m.day_id
      JOIN public.programs p
        ON p.id = d.program_id
      WHERE q.id = target_quiz_id
        AND q.is_published = true
        AND m.publication_status = 'published'
        AND d.is_published = true
        AND p.status = 'published'
    )

    -- ========================================================
    -- CHECKPOINT QUIZ
    -- ========================================================

    OR EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.checkpoints c
        ON c.quiz_id = q.id
      JOIN public.days d
        ON d.id = c.day_id
      JOIN public.programs p
        ON p.id = d.program_id
      WHERE q.id = target_quiz_id
        AND q.is_published = true
        AND d.is_published = true
        AND p.status = 'published'
    );

$function$;
