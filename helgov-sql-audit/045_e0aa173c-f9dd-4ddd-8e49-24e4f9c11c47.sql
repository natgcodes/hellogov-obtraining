│
◇  Downloading snippet...
-- QUERY 282
-- Inspect day unlocking and quiz access logic.
-- READ ONLY. Does not modify anything.

SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_day_unlocked',
    'is_day_complete',
    'get_learner_journey_days',
    'can_access_quiz'
  )
ORDER BY p.proname;
