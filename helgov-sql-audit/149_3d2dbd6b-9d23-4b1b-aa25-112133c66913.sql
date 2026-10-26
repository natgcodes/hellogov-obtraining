│
◇  Downloading snippet...
-- ============================================================
-- QUERY 180
-- Inspect Centralized Enrollment Recalculation
-- ============================================================

SELECT
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'recalculate_program_enrollment'
  AND p.prokind = 'f'
  AND pg_get_function_identity_arguments(p.oid) =
      'target_program_id uuid, target_learner_id uuid';
