│
◇  Downloading snippet...
-- QUERY 222
-- Audit Module Access Policies
-- READ ONLY

SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'modules',
    'materials',
    'activities',
    'day_content',
    'quizzes',
    'quiz_questions'
  )
ORDER BY tablename, cmd, policyname;
