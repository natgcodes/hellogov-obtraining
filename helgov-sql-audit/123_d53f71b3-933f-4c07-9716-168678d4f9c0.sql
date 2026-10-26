│
◇  Downloading snippet...
-- QUERY 206
-- Review Module Content Security Policies
-- READ ONLY

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'modules',
    'materials',
    'activities',
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'day_content'
  )
ORDER BY tablename, policyname;
