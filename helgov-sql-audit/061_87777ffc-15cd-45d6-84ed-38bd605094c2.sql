│
◇  Downloading snippet...
-- QUERY 266
-- Prevent modifications to answers belonging to cancelled attempts.
-- Preserves existing protections for other attempt statuses.
-- Does not modify existing answers or attempts.

CREATE OR REPLACE FUNCTION public.guard_quiz_answer_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_attempt_id uuid;
  v_old_attempt_id uuid;
BEGIN

  v_attempt_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.attempt_id
    ELSE NEW.attempt_id
  END;

  -- ============================================================
  -- PROTECT CANCELLED ATTEMPTS
  -- ============================================================

  IF EXISTS (
    SELECT 1
    FROM public.quiz_attempts qa
    WHERE qa.id = v_attempt_id
      AND qa.status = 'cancelled'
  ) THEN
    RAISE EXCEPTION
      'Cannot modify answers belonging to a cancelled quiz attempt';
  END IF;

  -- Also protect the original attempt if an answer is moved
  -- to a different attempt.

  IF TG_OP = 'UPDATE' THEN

    v_old_attempt_id := OLD.attempt_id;

    IF v_old_attempt_id IS DISTINCT FROM v_attempt_id
       AND EXISTS (
         SELECT 1
         FROM public.quiz_attempts qa
         WHERE qa.id = v_old_attempt_id
           AND qa.status = 'cancelled'
       )
    THEN
      RAISE EXCEPTION
        'Cannot move answers from a cancelled quiz attempt';
    END IF;

  END IF;

  -- ============================================================
  -- PRESERVE EXISTING ACCESS PROTECTION
  -- ============================================================

  IF NOT public.is_trainer()
     AND EXISTS (
       SELECT 1
       FROM public.quiz_attempts qa
       WHERE qa.id = v_attempt_id
         AND qa.status = 'in_progress'
         AND NOT public.can_access_quiz(qa.quiz_id)
     )
  THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;

END;
$function$;
