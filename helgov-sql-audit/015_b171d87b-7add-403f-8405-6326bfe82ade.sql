│
◇  Downloading snippet...
-- Query 333: Inspect Role and Learning Access Functions
-- Read-only diagnostic

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
      p.proname ILIKE '%trainer%'
      OR p.proname ILIKE '%learner%'
      OR p.proname ILIKE '%access%'
      OR p.proname ILIKE '%enroll%'
      OR p.proname ILIKE '%progress%'
  )
ORDER BY p.proname;
