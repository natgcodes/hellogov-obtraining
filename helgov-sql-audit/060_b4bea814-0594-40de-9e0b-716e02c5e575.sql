│
◇  Downloading snippet...
-- QUERY 267
-- Prevent cancelled quiz attempts from being reactivated or graded.
-- Does not modify existing attempts or answers.

CREATE OR REPLACE FUNCTION public.guard_cancelled_quiz_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION
      'Cancelled quiz attempts cannot be modified or graded';
  END IF;

  RETURN NEW;

END;
$function$;


DROP TRIGGER IF EXISTS
  guard_cancelled_quiz_attempt_trigger
ON public.quiz_attempts;


CREATE TRIGGER guard_cancelled_quiz_attempt_trigger
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.guard_cancelled_quiz_attempt();
