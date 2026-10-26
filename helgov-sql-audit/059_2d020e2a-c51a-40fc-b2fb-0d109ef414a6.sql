│
◇  Downloading snippet...
-- QUERY 268
-- Inspect the current module progress calculation.
-- READ ONLY: does not modify any data.

SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'recalculate_module_progress';
