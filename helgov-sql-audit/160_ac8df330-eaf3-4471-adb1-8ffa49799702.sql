│
◇  Downloading snippet...
-- ============================================================
-- QUERY 169
-- Inspect Program Progress Functions
-- ============================================================

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_program_progress',
    'recalculate_program_enrollment'
  )
ORDER BY p.proname, arguments;
