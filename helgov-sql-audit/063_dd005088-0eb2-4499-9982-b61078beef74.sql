│
◇  Downloading snippet...
-- QUERY 264
-- Inspect quiz_answers security policies and triggers.
-- READ ONLY: does not modify any data.

SELECT
  'POLICY' AS object_type,
  policyname AS object_name,
  cmd AS operation,
  qual AS definition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'quiz_answers'

UNION ALL

SELECT
  'TRIGGER' AS object_type,
  trigger_name AS object_name,
  event_manipulation AS operation,
  action_statement AS definition
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'quiz_answers'

ORDER BY object_type, object_name;
