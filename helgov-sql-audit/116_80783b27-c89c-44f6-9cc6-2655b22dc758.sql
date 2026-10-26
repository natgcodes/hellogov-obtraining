│
◇  Downloading snippet...
-- QUERY 213
-- Review Quiz Attempts & Answers RLS
-- READ ONLY

SELECT
  t.tablename,
  c.relrowsecurity AS rls_enabled,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check
FROM pg_tables t

JOIN pg_class c
  ON c.relname = t.tablename

JOIN pg_namespace n
  ON n.oid = c.relnamespace
  AND n.nspname = t.schemaname

LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname
  AND p.tablename = t.tablename

WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'quiz_attempts',
    'quiz_answers',
    'quiz_answer_options',
    'quiz_answer_matches',
    'quiz_matching_pairs',
    'learner_quiz_progress'
  )

ORDER BY
  t.tablename,
  p.policyname;
