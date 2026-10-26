│
◇  Downloading snippet...
-- ============================================================
-- QUERY 182
-- Inspect Module Progress Recalculation
-- ============================================================

SELECT
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'recalculate_module_progress'
  AND p.prokind = 'f';
