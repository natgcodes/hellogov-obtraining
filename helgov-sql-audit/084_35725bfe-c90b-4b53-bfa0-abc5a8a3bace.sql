│
◇  Downloading snippet...
CREATE OR REPLACE FUNCTION public.is_day_unlocked(
  target_day_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  target_day RECORD;
  previous_day_id uuid;
BEGIN

  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Load published day
  SELECT *
  INTO target_day
  FROM public.days
  WHERE id = target_day_id
    AND is_published = true;

  IF target_day.id IS NULL THEN
    RETURN false;
  END IF;

  -- Day 2 emergency access:
  -- Keep access consistent with learner journey.
  IF target_day.day_number = 2 THEN
    RETURN true;
  END IF;

  -- Find previous published day
  SELECT d.id
  INTO previous_day_id
  FROM public.days d
  WHERE d.program_id = target_day.program_id
    AND d.is_published = true
    AND (
      d.position < target_day.position
      OR (
        d.position = target_day.position
        AND d.day_number < target_day.day_number
      )
    )
  ORDER BY
    d.position DESC,
    d.day_number DESC
  LIMIT 1;

  -- First published day is always unlocked
  IF previous_day_id IS NULL THEN
    RETURN true;
  END IF;

  -- Preserve existing rules for other days
  RETURN public.is_day_complete(previous_day_id);

END;
$function$;
