│
◇  Downloading snippet...
-- ============================================================
-- QUERY 179
-- Inspect Quiz Review Finalization and Progress Triggers
-- ============================================================

SELECT
    'function' AS object_type,
    p.proname AS object_name,
    pg_get_function_identity_arguments(p.oid) AS details
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (
      p.proname ILIKE '%finalize%'
      OR p.proname ILIKE '%recalculate%'
  )

UNION ALL

SELECT
    'trigger' AS object_type,
    t.tgname AS object_name,
    c.relname || ' → ' || p.proname AS details
FROM pg_trigger t
JOIN pg_class c
    ON c.oid = t.tgrelid
JOIN pg_proc p
    ON p.oid = t.tgfoid
JOIN pg_namespace n
    ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname IN (
      'quiz_attempts',
      'quiz_answers',
      'checkpoint_results',
      'learner_module_progress',
      'program_enrollments'
  )

ORDER BY object_type, object_name;
