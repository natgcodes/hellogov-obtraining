│
◇  Downloading snippet...
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%quiz%progress%'
    OR p.proname ILIKE '%quiz%complet%'
    OR p.proname ILIKE '%module%complet%'
    OR p.proname ILIKE '%recalculate%program%'
  )
ORDER BY p.proname;
