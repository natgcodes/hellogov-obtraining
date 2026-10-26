│
◇  Downloading snippet...
-- QUERY 281
-- Identify functions related to day unlocking,
-- quiz access and program progress.
-- READ ONLY.

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%day%'
    OR p.proname ILIKE '%unlock%'
    OR p.proname ILIKE '%access%'
    OR p.proname ILIKE '%enrollment%'
    OR p.proname ILIKE '%progress%'
  )
ORDER BY p.proname;
