│
◇  Downloading snippet...
-- ============================================================
-- QUERY 198 — EXISTING LEARNER PROGRESS FUNCTIONS
-- READ ONLY
-- ============================================================

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
      p.proname ILIKE '%learner%progress%'
      OR p.proname ILIKE '%module%progress%'
      OR p.proname ILIKE '%trainer%learner%'
      OR p.proname ILIKE '%day%progress%'
  )
ORDER BY p.proname;
