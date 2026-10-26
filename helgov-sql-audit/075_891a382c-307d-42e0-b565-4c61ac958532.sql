│
◇  Downloading snippet...
SELECT
    event_object_table AS table_name,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'learner_quiz_progress',
    'learner_module_progress',
    'quiz_attempts'
  )
ORDER BY
    event_object_table,
    trigger_name;
