│
◇  Downloading snippet...
-- Query 315 — Inspect Existing User Management Functions

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (
      p.proname ILIKE '%user%'
      OR p.proname ILIKE '%profile%'
      OR p.proname ILIKE '%learner%'
      OR p.proname ILIKE '%account%'
  )
ORDER BY p.proname;
