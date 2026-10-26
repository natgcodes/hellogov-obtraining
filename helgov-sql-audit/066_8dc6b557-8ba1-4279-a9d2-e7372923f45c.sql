│
◇  Downloading snippet...
-- QUERY 261
-- Allow cancelled quiz attempts.
-- Does not cancel or modify any existing attempts.

BEGIN;

ALTER TABLE public.quiz_attempts
DROP CONSTRAINT quiz_attempts_status_check;

ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_status_check
CHECK (
  status IN (
    'in_progress',
    'submitted',
    'needs_review',
    'graded',
    'cancelled'
  )
);

COMMIT;

-- Verify the updated constraint.

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.quiz_attempts'::regclass
  AND conname = 'quiz_attempts_status_check';
