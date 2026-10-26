│
◇  Downloading snippet...
-- QUERY 217
-- Fix Quiz Security & Grading

BEGIN;

-- 1. Remove the trigger that could interfere
-- with automatic quiz grading.

DROP TRIGGER IF EXISTS
  guard_quiz_answer_mutation_trigger
ON public.quiz_answers;


-- 2. Protect answer modifications without
-- interfering with grading operations.

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

  -- Only block modifications when the quiz
  -- is unavailable. Allow grading of
  -- already submitted attempts.

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
$$;

CREATE TRIGGER guard_quiz_answer_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE
ON public.quiz_answers
FOR EACH ROW
EXECUTE FUNCTION public.guard_quiz_answer_mutation();


-- 3. Protect multiple-choice answer selections.

CREATE OR REPLACE FUNCTION public.guard_quiz_answer_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_answer_id uuid;
  v_attempt_id uuid;
BEGIN

  v_answer_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.answer_id
    ELSE NEW.answer_id
  END;

  SELECT a.attempt_id
  INTO v_attempt_id
  FROM public.quiz_answers a
  WHERE a.id = v_answer_id;

  IF NOT public.is_trainer()
     AND v_attempt_id IS NOT NULL
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
  guard_quiz_answer_options_trigger
ON public.quiz_answer_options;

CREATE TRIGGER guard_quiz_answer_options_trigger
BEFORE INSERT OR UPDATE OR DELETE
ON public.quiz_answer_options
FOR EACH ROW
EXECUTE FUNCTION public.guard_quiz_answer_child_mutation();


DROP TRIGGER IF EXISTS
  guard_quiz_answer_matches_trigger
ON public.quiz_answer_matches;

CREATE TRIGGER guard_quiz_answer_matches_trigger
BEFORE INSERT OR UPDATE OR DELETE
ON public.quiz_answer_matches
FOR EACH ROW
EXECUTE FUNCTION public.guard_quiz_answer_child_mutation();


-- 4. Protect manual quiz completion.

CREATE OR REPLACE FUNCTION public.guard_learner_quiz_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN

  IF NOT public.is_trainer()
     AND NOT public.can_access_quiz(NEW.quiz_id)
  THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS
  guard_learner_quiz_progress_trigger
ON public.learner_quiz_progress;

CREATE TRIGGER guard_learner_quiz_progress_trigger
BEFORE INSERT OR UPDATE
ON public.learner_quiz_progress
FOR EACH ROW
EXECUTE FUNCTION public.guard_learner_quiz_progress();

COMMIT;
