│
◇  Downloading snippet...
-- ============================================================
-- QUERY 199 — INSPECT EXISTING PROGRESS FUNCTIONS
-- READ ONLY
-- ============================================================

SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'get_trainer_learner_day_progress',
      'get_trainer_learner_module_progress',
      'get_trainer_learner_quiz_progress',
      'get_trainer_learner_checkpoint_progress'
  )
ORDER BY p.proname;
