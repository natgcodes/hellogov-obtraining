│
◇  Downloading snippet...
-- QUERY 284
-- Published days are always unlocked.
-- Unpublished days remain hidden.
-- Completion is informational and does not control access.

CREATE OR REPLACE FUNCTION public.get_learner_journey_days(
  target_program_id uuid
)
RETURNS TABLE(
  id uuid,
  day_number integer,
  title text,
  unlocked boolean,
  completed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$

  SELECT
    d.id,
    d.day_number,
    d.title,

    -- Every published day is accessible.
    true AS unlocked,

    -- Completion remains informational.
    public.is_day_complete(d.id) AS completed

  FROM public.days d

  WHERE d.program_id = target_program_id
    AND d.is_published = true
    AND auth.uid() IS NOT NULL

  ORDER BY
    d.position,
    d.day_number;

$function$;
