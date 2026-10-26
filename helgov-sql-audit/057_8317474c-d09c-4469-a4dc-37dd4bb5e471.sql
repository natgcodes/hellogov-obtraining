│
◇  Downloading snippet...
-- QUERY 270
-- Inspect current learner day progress function.
-- READ ONLY: does not modify any data.

SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_learner_day_progress';
