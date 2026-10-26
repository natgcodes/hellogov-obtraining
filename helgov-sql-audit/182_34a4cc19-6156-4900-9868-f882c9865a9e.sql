│
◇  Downloading snippet...
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'program_enrollments',
    'certifications',
    'certification_components',
    'quiz_attempts',
    'quizzes',
    'checkpoints'
  )
order by table_name, ordinal_position;
