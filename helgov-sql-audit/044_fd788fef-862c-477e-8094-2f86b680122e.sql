│
◇  Downloading snippet...
-- QUERY 283
-- A day is accessible whenever the trainer has published it.
-- Progress, quizzes and checkpoints do not affect access.

CREATE OR REPLACE FUNCTION public.is_day_unlocked(
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
    AND EXISTS (
      SELECT 1
      FROM public.days d
      WHERE d.id = target_day_id
        AND d.is_published = true
    );

$function$;
