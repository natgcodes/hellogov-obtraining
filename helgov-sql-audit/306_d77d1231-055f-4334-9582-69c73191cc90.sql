│
◇  Downloading snippet...
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'quiz_matching_pairs',
    'checkpoints',
    'days',
    'modules'
  )
order by tablename, policyname;
