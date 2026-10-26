│
◇  Downloading snippet...
-- QUERY 216
-- Protect Remaining Quiz Operations

BEGIN;

-- 1. Guard quiz answer changes
CREATE OR REPLACE FUNCTION public.guard_quiz_answer_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  v_attempt_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.attempt_id
    ELSE NEW.attempt_id
  END;

  IF NOT public.is_trainer()
     AND NOT public.can_modify_quiz_attempt(v_attempt_id)
  THEN
    RAISE EXCEPTION 'Quiz attempt is not available';
  END IF;

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;

DROP TRIGGER IF EXISTS
  guard_quiz_answer_mutation_trigger
ON public.quiz_answers;

CREATE TRIGGER guard_quiz_answer_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE
ON public.quiz_answers
FOR EACH ROW
EXECUTE FUNCTION public.guard_quiz_answer_mutation();


-- 2. Guard quiz attempt submission
CREATE OR REPLACE FUNCTION public.guard_quiz_attempt_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_trainer()
     AND OLD.status = 'in_progress'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.can_access_quiz(OLD.quiz_id)
  THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  guard_quiz_attempt_submission_trigger
ON public.quiz_attempts;

CREATE TRIGGER guard_quiz_attempt_submission_trigger
BEFORE UPDATE
ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.guard_quiz_attempt_submission();

COMMIT;
