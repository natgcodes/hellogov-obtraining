│
◇  Downloading snippet...
-- QUERY 260
-- Inspect quiz_attempts status constraints.
-- READ ONLY: does not modify any data.

SELECT
  c.conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
WHERE c.conrelid = 'public.quiz_attempts'::regclass
  AND c.contype = 'c'
ORDER BY c.conname;
