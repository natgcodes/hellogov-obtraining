│
◇  Downloading snippet...
-- QUERY 263
-- Inspect quiz grading functions.
-- READ ONLY: does not modify any data.

SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%quiz%review%'
    OR p.proname ILIKE '%quiz%grad%'
    OR p.proname ILIKE '%answer%grad%'
    OR p.proname ILIKE '%answer%review%'
  )
ORDER BY p.proname;
