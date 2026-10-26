│
◇  Downloading snippet...
-- ============================================================
-- QUERY 176
-- Inspect Quiz Grading Functions
-- ============================================================

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%quiz_attempts%'
      OR pg_get_functiondef(p.oid) ILIKE '%quiz_answers%'
  )
ORDER BY p.proname;
