│
◇  Downloading snippet...
-- ============================================================
-- QUERY 178
-- Automatically Track Quiz Grading Method and Reviewer
-- ============================================================

CREATE OR REPLACE FUNCTION public.track_quiz_grading_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN

  -- Only act when an attempt transitions to graded.

  IF NEW.status = 'graded'
     AND OLD.status IS DISTINCT FROM 'graded'
  THEN

    -- Manual review completed by a trainer.

    IF OLD.status = 'needs_review' THEN

      NEW.grading_method := 'manual';

      IF NOT public.is_trainer() THEN
        RAISE EXCEPTION
          'Trainer access required to finalize manual review';
      END IF;

      NEW.reviewed_by := auth.uid();

    -- Automatically graded submission.

    ELSIF OLD.status = 'in_progress' THEN

      NEW.grading_method := 'automatic';
      NEW.reviewed_by := NULL;

    END IF;

  END IF;

  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
  trg_track_quiz_grading_method
ON public.quiz_attempts;


CREATE TRIGGER trg_track_quiz_grading_method
BEFORE UPDATE OF status
ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.track_quiz_grading_method();
