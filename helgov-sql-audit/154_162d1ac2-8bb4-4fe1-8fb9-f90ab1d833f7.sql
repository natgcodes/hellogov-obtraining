│
◇  Downloading snippet...
-- ============================================================
-- QUERY 175
-- Add Grading Method and Reviewer Tracking to Quiz Attempts
-- ============================================================

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS grading_method text,
ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- Restrict grading methods to supported values.

ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_grading_method_check
CHECK (
  grading_method IS NULL
  OR grading_method IN ('automatic', 'manual')
);

-- Link reviewers to existing user profiles.

ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_reviewed_by_fkey
FOREIGN KEY (reviewed_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Improve queries that filter assessments by grading method.

CREATE INDEX IF NOT EXISTS
  idx_quiz_attempts_grading_method
ON public.quiz_attempts(grading_method);

-- Improve queries that filter assessments by reviewer.

CREATE INDEX IF NOT EXISTS
  idx_quiz_attempts_reviewed_by
ON public.quiz_attempts(reviewed_by);
