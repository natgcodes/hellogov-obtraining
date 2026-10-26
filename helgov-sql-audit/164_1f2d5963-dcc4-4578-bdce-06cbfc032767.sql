│
◇  Downloading snippet...
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (
    p.proname ILIKE '%progress%'
    OR p.proname ILIKE '%complete%'
    OR p.proname ILIKE '%enrollment%'
    OR p.proname ILIKE '%day%'
    OR p.proname ILIKE '%setup%'
  )
ORDER BY p.proname;
