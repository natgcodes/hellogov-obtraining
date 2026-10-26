│
◇  Downloading snippet...
-- Query 336: Inspect Role Restrictions in Learner Detail Functions

SELECT
    p.proname AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) ~* 'role\s*=\s*''learner'''
        THEN 'ROLE RESTRICTION FOUND'
        ELSE 'NO EXPLICIT LEARNER ROLE RESTRICTION'
    END AS role_check,
    pg_get_functiondef(p.oid) ~* 'is_trainer' AS checks_trainer_access
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_trainer_learner_summary',
    'get_trainer_learner_day_progress',
    'get_trainer_learner_module_progress',
    'get_trainer_learner_quiz_progress',
    'get_trainer_learner_checkpoint_progress',
    'get_trainer_learner_activity'
  )
ORDER BY p.proname;
